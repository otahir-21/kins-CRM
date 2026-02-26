const express = require('express');
const multer = require('multer');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { getMe, updateMeAbout, uploadProfilePicture, setMyInterests, getMyInterests, getFirebaseToken, saveFcmToken, deleteMe } = require('../../controllers/v1/meController');

const router = express.Router();

// Same as post upload: field name "media", so app can use one pattern for both
const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'));
    }
  },
});

router.use(verifyJwt);

router.get('/', getMe);
router.get('/firebase-token', getFirebaseToken);
router.post('/fcm-token', saveFcmToken);
router.put('/about', updateMeAbout);
router.post('/profile-picture', (req, res, next) => {
  profilePictureUpload.array('media', 1)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'Invalid file. Use field name: media (same as post upload), max 10MB.' });
    }
    next();
  });
}, uploadProfilePicture);
router.delete('/', deleteMe);
router.get('/interests', getMyInterests);
router.post('/interests', setMyInterests);

module.exports = router;
