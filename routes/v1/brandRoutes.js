const express = require('express');
const multer = require('multer');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  submitVerification,
  getMyVerification,
  uploadVerificationDocument,
} = require('../../controllers/v1/brandController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /^(image\/(jpeg|png|gif|webp)|application\/pdf)$/i.test(file.mimetype);
    cb(null, allowed);
  },
});

router.use(verifyJwt);

// Upload a document for brand verification (returns Bunny CDN URL)
router.post('/verification/document', upload.single('document'), uploadVerificationDocument);

// Brand onboarding: submit or update verification request
router.post('/verification', submitVerification);

// Current user's latest verification request
router.get('/verification/me', getMyVerification);

module.exports = router;
