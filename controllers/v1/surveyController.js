const {
  getSurveyById,
  getSurveysNotRespondedByUser,
  submitSurveyResponse,
  getUserSurveyResponse,
} = require('../../surveys-helpers');
const { isValidObjectId } = require('../../utils/validateObjectId');

/**
 * GET /api/v1/surveys/for-me
 * Active surveys the current user has NOT responded to (so app doesn't show them again after submit).
 * Auth: JWT required.
 */
async function getSurveysForMe(req, res) {
  try {
    const userId = req.userId.toString();
    const surveys = await getSurveysNotRespondedByUser(userId);
    return res.status(200).json({
      success: true,
      surveys,
    });
  } catch (err) {
    console.error('GET /surveys/for-me error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get surveys.' });
  }
}

/**
 * GET /api/v1/surveys/:surveyId
 * Get one survey by ID (for showing questions). Returns 404 if not found or inactive.
 * Auth: JWT optional for app; can be used to show a survey before responding.
 */
async function getSurveyByIdV1(req, res) {
  try {
    const { surveyId } = req.params;
    if (!surveyId || !isValidObjectId(surveyId)) {
      return res.status(400).json({ success: false, error: 'Invalid survey ID.' });
    }
    const survey = await getSurveyById(surveyId);
    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found.' });
    }
    if (!survey.isActive) {
      return res.status(404).json({ success: false, error: 'Survey is not active.' });
    }
    return res.status(200).json({ success: true, survey });
  } catch (err) {
    console.error('GET /surveys/:surveyId error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get survey.' });
  }
}

/**
 * POST /api/v1/surveys/:surveyId/respond
 * Submit the current user's response. One response per user per survey; duplicate returns 409.
 * Body: { responses: [ { questionId: string, optionId: string } ] }
 * Auth: JWT required.
 */
async function submitResponse(req, res) {
  try {
    const userId = req.userId.toString();
    const { surveyId } = req.params;
    if (!surveyId || !isValidObjectId(surveyId)) {
      return res.status(400).json({ success: false, error: 'Invalid survey ID.' });
    }
    const { responses } = req.body;
    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ success: false, error: 'responses array is required (at least one { questionId, optionId }).' });
    }
    const data = await submitSurveyResponse(userId, surveyId, responses);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('POST /surveys/:surveyId/respond error:', err);
    if (err.message && err.message.includes('already responded')) {
      return res.status(409).json({ success: false, error: 'You have already responded to this survey.' });
    }
    if (err.message && (err.message.includes('Invalid') || err.message.includes('Missing') || err.message.includes('not found') || err.message.includes('not active'))) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: err.message || 'Failed to submit response.' });
  }
}

/**
 * GET /api/v1/surveys/:surveyId/my-response
 * Check if current user has already responded (so app can hide survey).
 * Auth: JWT required.
 */
async function getMyResponse(req, res) {
  try {
    const userId = req.userId.toString();
    const { surveyId } = req.params;
    if (!surveyId || !isValidObjectId(surveyId)) {
      return res.status(400).json({ success: false, error: 'Invalid survey ID.' });
    }
    const response = await getUserSurveyResponse(userId, surveyId);
    return res.status(200).json({
      success: true,
      responded: !!response,
      data: response || null,
    });
  } catch (err) {
    console.error('GET /surveys/:surveyId/my-response error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get response.' });
  }
}

module.exports = {
  getSurveysForMe,
  getSurveyByIdV1,
  submitResponse,
  getMyResponse,
};
