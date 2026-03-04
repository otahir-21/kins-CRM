const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { submitVerification, getMyVerification } = require('../../controllers/v1/brandController');

const router = express.Router();

router.use(verifyJwt);

// Brand onboarding: submit or update verification request
router.post('/verification', submitVerification);

// Current user's latest verification request
router.get('/verification/me', getMyVerification);

module.exports = router;

