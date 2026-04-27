const { getFirestore } = require('./firebaseAdmin');

const SURVEYS_COLLECTION = 'surveys';
const SURVEY_RESPONSES_COLLECTION = 'survey_responses';

function db() {
  const firestore = getFirestore();
  if (!firestore) throw new Error('Firebase Firestore is not configured.');
  return firestore;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
  return null;
}

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

function toSurveyListItem(id, d) {
  const questions = (d.questions || []).map((q) => ({
    id: q.id,
    text: q.text,
    options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
  }));
  const first = questions[0];
  return {
    id: String(id),
    title: d.title,
    description: d.description ?? null,
    isActive: d.isActive !== false,
    showOnHomePage: d.showOnHomePage === true,
    targetAudience: d.targetAudience || 'all',
    expiresAt: normalizeTimestamp(d.expiresAt),
    questions,
    question: first?.text ?? null,
    options: first?.options ?? [],
    createdAt: normalizeTimestamp(d.createdAt),
    updatedAt: normalizeTimestamp(d.updatedAt),
  };
}

async function createSurvey(surveyData) {
  const questions = normalizeQuestions(surveyData);
  const now = new Date().toISOString();
  const ref = db().collection(SURVEYS_COLLECTION).doc();
  const payload = {
    title: (surveyData.title || '').trim(),
    description: surveyData.description != null ? String(surveyData.description).trim() || null : null,
    isActive: surveyData.isActive !== false,
    showOnHomePage: surveyData.showOnHomePage === true,
    targetAudience: surveyData.targetAudience || 'all',
    expiresAt: surveyData.expiresAt ? new Date(surveyData.expiresAt).toISOString() : null,
    questions,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(payload);
  return toSurveyListItem(ref.id, payload);
}

async function getAllSurveys(filters = {}) {
  const snap = await db().collection(SURVEYS_COLLECTION).get();
  let list = snap.docs.map((d) => toSurveyListItem(d.id, d.data() || {}));
  if (filters.isActive !== undefined) list = list.filter((x) => x.isActive === filters.isActive);
  if (filters.showOnHomePage !== undefined) list = list.filter((x) => x.showOnHomePage === filters.showOnHomePage);
  list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return list;
}

async function getSurveyById(surveyId) {
  const id = String(surveyId || '').trim();
  if (!id) return null;
  const doc = await db().collection(SURVEYS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return toSurveyListItem(doc.id, doc.data() || {});
}

async function getActiveHomePageSurvey() {
  const list = await getAllSurveys({ isActive: true, showOnHomePage: true });
  return list[0] || null;
}

async function updateSurvey(surveyId, updateData) {
  const id = String(surveyId || '').trim();
  if (!id) throw new Error('Invalid survey ID');
  const ref = db().collection(SURVEYS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error('Survey not found');
  const updates = { updatedAt: new Date().toISOString() };
  if (updateData.title !== undefined) updates.title = String(updateData.title).trim();
  if (updateData.description !== undefined) updates.description = updateData.description != null ? String(updateData.description).trim() || null : null;
  if (updateData.isActive !== undefined) updates.isActive = updateData.isActive === true;
  if (updateData.showOnHomePage !== undefined) updates.showOnHomePage = updateData.showOnHomePage === true;
  if (updateData.targetAudience !== undefined) updates.targetAudience = String(updateData.targetAudience || 'all');
  if (updateData.expiresAt !== undefined) updates.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt).toISOString() : null;
  if (updateData.questions !== undefined && Array.isArray(updateData.questions)) {
    updates.questions = normalizeQuestions({ questions: updateData.questions });
  }
  if (updateData.question != null && Array.isArray(updateData.options)) {
    updates.questions = normalizeQuestions({ question: updateData.question, options: updateData.options });
  }
  await ref.set(updates, { merge: true });
  const merged = { ...(existing.data() || {}), ...updates };
  return toSurveyListItem(id, merged);
}

async function deleteSurvey(surveyId) {
  return updateSurvey(surveyId, { isActive: false });
}

async function submitSurveyResponse(userId, surveyId, selectedOptionIdOrResponses) {
  const survey = await getSurveyById(surveyId);
  if (!survey) throw new Error('Survey not found');
  if (!survey.isActive) throw new Error('Survey is not active');
  let responses;
  if (Array.isArray(selectedOptionIdOrResponses)) {
    responses = selectedOptionIdOrResponses.map((r) => ({ questionId: String(r.questionId), optionId: String(r.optionId) }));
  } else {
    const q0 = (survey.questions || [])[0];
    const optionId = String(selectedOptionIdOrResponses || '');
    responses = [{ questionId: q0?.id || 'q0', optionId }];
  }
  const now = new Date().toISOString();
  const key = `${String(userId)}_${String(surveyId)}`;
  const ref = db().collection(SURVEY_RESPONSES_COLLECTION).doc(key);
  const existing = await ref.get();
  if (existing.exists) throw new Error('User has already responded to this survey.');
  await ref.set({
    userId: String(userId),
    surveyId: String(surveyId),
    responses,
    createdAt: now,
    updatedAt: now,
  });
  return { id: key, userId: String(userId), surveyId: String(surveyId), responses, createdAt: now };
}

async function getUserSurveyResponse(userId, surveyId) {
  const key = `${String(userId)}_${String(surveyId)}`;
  const doc = await db().collection(SURVEY_RESPONSES_COLLECTION).doc(key).get();
  if (!doc.exists) return null;
  const d = doc.data() || {};
  return { id: doc.id, userId: d.userId, surveyId: d.surveyId, responses: d.responses || [], createdAt: normalizeTimestamp(d.createdAt) };
}

async function getSurveyAnalytics(surveyId) {
  const survey = await getSurveyById(surveyId);
  if (!survey) return { surveyTitle: '', surveyQuestion: '', totalResponses: 0, optionStats: [], responses: [] };
  const snap = await db().collection(SURVEY_RESPONSES_COLLECTION).where('surveyId', '==', String(surveyId)).get();
  const list = snap.docs.map((d) => d.data() || {});
  const q0 = (survey.questions || [])[0];
  const counts = {};
  for (const o of (q0?.options || [])) counts[o.id] = 0;
  for (const r of list) {
    const first = (r.responses || [])[0];
    if (first && counts[first.optionId] !== undefined) counts[first.optionId] += 1;
  }
  const total = list.length;
  const optionStats = (q0?.options || []).map((o) => {
    const count = counts[o.id] || 0;
    return { optionId: o.id, optionText: o.text || o.id, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
  const responses = list.slice(0, 10).map((r) => ({
    userId: r.userId,
    selectedOption: optionStats.find((x) => x.optionId === (r.responses || [])[0]?.optionId)?.optionText || '—',
    answeredAt: normalizeTimestamp(r.createdAt),
  }));
  return { surveyTitle: survey.title || '', surveyQuestion: q0?.text || '', totalResponses: total, optionStats, responses };
}

async function getUserSurveyResponses(userId) {
  const snap = await db().collection(SURVEY_RESPONSES_COLLECTION).where('userId', '==', String(userId)).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  const surveys = await Promise.all(rows.map((r) => getSurveyById(r.surveyId)));
  return rows.map((r, i) => ({
    id: r.id,
    surveyId: r.surveyId,
    surveyTitle: surveys[i]?.title,
    responses: r.responses || [],
    createdAt: normalizeTimestamp(r.createdAt),
  }));
}

async function getSurveysNotRespondedByUser(userId) {
  const all = await getAllSurveys({ isActive: true });
  const snap = await db().collection(SURVEY_RESPONSES_COLLECTION).where('userId', '==', String(userId)).get();
  const responded = new Set(snap.docs.map((d) => String((d.data() || {}).surveyId)));
  return all.filter((s) => !responded.has(String(s.id)));
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

