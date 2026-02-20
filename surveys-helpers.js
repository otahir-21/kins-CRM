/**
 * Surveys — MongoDB only (no Firebase).
 * Uses models/Survey.js and models/SurveyResponse.js.
 */
const Survey = require('./models/Survey');
const SurveyResponse = require('./models/SurveyResponse');
const mongoose = require('mongoose');

function normalizeQuestions(body) {
  if (Array.isArray(body.questions) && body.questions.length > 0) {
    return body.questions.map((q, i) => {
      const id = q.id || `q${i}`;
      const options = (q.options || []).slice(0, 4).map((o, j) => ({
        id: o.id || `opt${j}`,
        text: typeof o.text === 'string' ? o.text.trim() : String(o.text || ''),
      }));
      if (options.length < 1) throw new Error('Each question must have at least one option.');
      return { id, text: (q.text || '').trim(), options };
    });
  }
  if (body.question != null && Array.isArray(body.options)) {
    const options = body.options.slice(0, 4).map((o, j) => ({
      id: o.id || `opt${j}`,
      text: typeof o.text === 'string' ? o.text.trim() : String(o.text || ''),
    }));
    if (options.length < 1) throw new Error('Survey must have at least one option.');
    return [{ id: 'q0', text: String(body.question || '').trim(), options }];
  }
  throw new Error('Survey must have questions array or (question + options) for single question.');
}

function toSurveyDoc(doc) {
  if (!doc || !doc._id) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id.toString(),
    title: d.title,
    description: d.description ?? null,
    isActive: d.isActive !== false,
    showOnHomePage: d.showOnHomePage === true,
    questions: (d.questions || []).map((q) => ({
      id: q.id,
      text: q.text,
      options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
    })),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

async function createSurvey(surveyData) {
  const questions = normalizeQuestions(surveyData);
  const survey = await Survey.create({
    title: (surveyData.title || '').trim(),
    description: surveyData.description != null ? String(surveyData.description).trim() || null : null,
    isActive: surveyData.isActive !== false,
    showOnHomePage: surveyData.showOnHomePage === true,
    questions,
  });
  return toSurveyDoc(survey);
}

async function getAllSurveys(filters = {}) {
  const q = {};
  if (filters.isActive !== undefined) q.isActive = filters.isActive;
  if (filters.showOnHomePage !== undefined) q.showOnHomePage = filters.showOnHomePage;
  const list = await Survey.find(q).sort({ createdAt: -1 }).lean();
  return list.map((d) => toSurveyListItem(d));
}

function toSurveyListItem(d) {
  const questions = (d.questions || []).map((q) => ({
    id: q.id,
    text: q.text,
    options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
  }));
  const first = questions[0];
  return {
    id: d._id.toString(),
    title: d.title,
    description: d.description ?? null,
    isActive: d.isActive !== false,
    showOnHomePage: d.showOnHomePage === true,
    questions,
    question: first?.text ?? null,
    options: first?.options ?? [],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

async function getSurveyById(surveyId) {
  if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) return null;
  const d = await Survey.findById(surveyId).lean();
  if (!d) return null;
  return toSurveyListItem(d);
}

async function getActiveHomePageSurvey() {
  const d = await Survey.findOne({ isActive: true, showOnHomePage: true }).sort({ updatedAt: -1 }).lean();
  if (!d) return null;
  return toSurveyListItem(d);
}

async function updateSurvey(surveyId, updateData) {
  if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) throw new Error('Invalid survey ID');
  const survey = await Survey.findById(surveyId);
  if (!survey) throw new Error('Survey not found');
  if (updateData.title !== undefined) survey.title = String(updateData.title).trim();
  if (updateData.description !== undefined) survey.description = updateData.description != null ? String(updateData.description).trim() || null : null;
  if (updateData.isActive !== undefined) survey.isActive = updateData.isActive === true;
  if (updateData.showOnHomePage !== undefined) survey.showOnHomePage = updateData.showOnHomePage === true;
  if (updateData.questions !== undefined && Array.isArray(updateData.questions)) {
    survey.questions = updateData.questions.slice(0, 50).map((q, i) => {
      const id = q.id || `q${i}`;
      const options = (q.options || []).slice(0, 4).map((o, j) => ({
        id: o.id || `opt${j}`,
        text: typeof o.text === 'string' ? o.text.trim() : String(o.text || ''),
      }));
      if (options.length < 1) throw new Error('Each question must have at least one option.');
      return { id, text: (q.text || '').trim(), options };
    });
    if (survey.questions.length < 1) throw new Error('Survey must have at least one question.');
  }
  if (updateData.question != null && Array.isArray(updateData.options)) {
    const options = updateData.options.slice(0, 4).map((o, j) => ({
      id: o.id || `opt${j}`,
      text: typeof o.text === 'string' ? o.text.trim() : String(o.text || ''),
    }));
    if (options.length >= 1) survey.questions = [{ id: 'q0', text: String(updateData.question).trim(), options }];
  }
  await survey.save();
  return toSurveyDoc(survey);
}

async function deleteSurvey(surveyId) {
  if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) throw new Error('Invalid survey ID');
  const survey = await Survey.findByIdAndUpdate(surveyId, { isActive: false }, { new: true });
  if (!survey) throw new Error('Survey not found');
  return toSurveyDoc(survey);
}

function validateResponsesAgainstSurvey(survey, responses) {
  if (!survey || !Array.isArray(responses)) return { valid: false, error: 'Invalid survey or responses.' };
  const questionMap = new Map((survey.questions || []).map((q) => [q.id, q]));
  for (const r of responses) {
    const q = questionMap.get(r.questionId);
    if (!q) return { valid: false, error: `Unknown questionId: ${r.questionId}` };
    const validOpts = new Set((q.options || []).map((o) => o.id));
    if (!validOpts.has(r.optionId)) return { valid: false, error: `Invalid optionId ${r.optionId} for question ${r.questionId}` };
  }
  const answeredIds = new Set(responses.map((r) => r.questionId));
  for (const q of (survey.questions || [])) {
    if (!answeredIds.has(q.id)) return { valid: false, error: `Missing response for question: ${q.id}` };
  }
  return { valid: true };
}

async function submitSurveyResponse(userId, surveyId, selectedOptionIdOrResponses) {
  if (!userId || !surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) throw new Error('Invalid userId or surveyId');
  const survey = await Survey.findById(surveyId).lean();
  if (!survey) throw new Error('Survey not found');
  if (!survey.isActive) throw new Error('Survey is not active');
  const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
  const sid = typeof surveyId === 'string' ? new mongoose.Types.ObjectId(surveyId) : surveyId;

  const existing = await SurveyResponse.findOne({ userId: uid, surveyId: sid }).lean();
  if (existing) throw new Error('User has already responded to this survey.');

  let responses;
  if (Array.isArray(selectedOptionIdOrResponses)) {
    responses = selectedOptionIdOrResponses.map((r) => ({
      questionId: String(r.questionId),
      optionId: String(r.optionId),
    }));
  } else if (selectedOptionIdOrResponses != null && typeof selectedOptionIdOrResponses === 'object' && selectedOptionIdOrResponses.questionId != null && selectedOptionIdOrResponses.optionId != null) {
    responses = [{ questionId: String(selectedOptionIdOrResponses.questionId), optionId: String(selectedOptionIdOrResponses.optionId) }];
  } else {
    const singleOptionId = String(selectedOptionIdOrResponses || '');
    const q0 = (survey.questions || [])[0];
    if (!q0) throw new Error('Survey has no questions');
    const validOpts = (q0.options || []).map((o) => o.id);
    if (!validOpts.includes(singleOptionId)) throw new Error('Invalid selectedOptionId for the question');
    responses = [{ questionId: q0.id, optionId: singleOptionId }];
  }

  const validation = validateResponsesAgainstSurvey(survey, responses);
  if (!validation.valid) throw new Error(validation.error);

  const doc = await SurveyResponse.create({ userId: uid, surveyId: sid, responses });
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    surveyId: doc.surveyId.toString(),
    responses: doc.responses,
    createdAt: doc.createdAt,
  };
}

async function getUserSurveyResponse(userId, surveyId) {
  if (!userId || !surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) return null;
  const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
  const sid = typeof surveyId === 'string' ? new mongoose.Types.ObjectId(surveyId) : surveyId;
  const doc = await SurveyResponse.findOne({ userId: uid, surveyId: sid }).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    surveyId: doc.surveyId.toString(),
    responses: doc.responses,
    createdAt: doc.createdAt,
  };
}

async function getSurveyAnalytics(surveyId) {
  if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) return { totalResponses: 0, optionCounts: {} };
  const survey = await Survey.findById(surveyId).lean();
  if (!survey) return { totalResponses: 0, optionCounts: {} };
  const optionCounts = {};
  for (const q of survey.questions || []) {
    optionCounts[q.id] = {};
    for (const o of q.options || []) optionCounts[q.id][o.id] = 0;
  }
  const list = await SurveyResponse.find({ surveyId }).select('responses').lean();
  let total = 0;
  for (const doc of list) {
    total += 1;
    for (const r of doc.responses || []) {
      if (optionCounts[r.questionId] && optionCounts[r.questionId][r.optionId] !== undefined) {
        optionCounts[r.questionId][r.optionId] += 1;
      }
    }
  }
  return { totalResponses: total, optionCounts };
}

async function getUserSurveyResponses(userId) {
  if (!userId) return [];
  const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
  const list = await SurveyResponse.find({ userId: uid }).populate('surveyId', 'title').sort({ createdAt: -1 }).lean();
  return list.map((d) => ({
    id: d._id.toString(),
    surveyId: d.surveyId?._id?.toString() || d.surveyId?.toString(),
    surveyTitle: d.surveyId?.title,
    responses: d.responses,
    createdAt: d.createdAt,
  }));
}

async function getSurveyIdsRespondedByUser(userId) {
  if (!userId) return [];
  const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
  const list = await SurveyResponse.find({ userId: uid }).select('surveyId').lean();
  return list.map((d) => d.surveyId.toString());
}

async function getSurveysNotRespondedByUser(userId) {
  const respondedIds = await getSurveyIdsRespondedByUser(userId);
  const list = await Survey.find({ isActive: true, _id: { $nin: respondedIds.map((id) => new mongoose.Types.ObjectId(id)) } })
    .sort({ updatedAt: -1 })
    .lean();
  return list.map((d) => toSurveyListItem({ ...d, isActive: true }));
}

module.exports = {
  createSurvey,
  getAllSurveys,
  getSurveyById,
  getActiveHomePageSurvey,
  updateSurvey,
  deleteSurvey,
  submitSurveyResponse,
  getUserSurveyResponse,
  getSurveyAnalytics,
  getUserSurveyResponses,
  getSurveysNotRespondedByUser,
};
