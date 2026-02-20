const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  getSurveysForMe,
  getSurveyByIdV1,
  submitResponse,
  getMyResponse,
} = require('../../controllers/v1/surveyController');

const router = express.Router();

// Surveys for current user that they haven't responded to (don't show again after submit)
router.get('/for-me', verifyJwt, getSurveysForMe);

// Get one survey (for showing questions)
router.get('/:surveyId', getSurveyByIdV1);

// Check if I already responded (optional, for hiding survey in UI)
router.get('/:surveyId/my-response', verifyJwt, getMyResponse);

// Submit response (one per user per survey; duplicate = 409)
router.post('/:surveyId/respond', verifyJwt, submitResponse);

module.exports = router;
