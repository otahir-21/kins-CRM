const express = require('express');
const multer = require('multer');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  getActiveAds,
  listAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
} = require('../../controllers/v1/adController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Public: mobile app fetches active ads (no auth)
router.get('/active', getActiveAds);

// CRM: all below require JWT
router.use(verifyJwt);

router.get('/', listAds);
router.get('/:id', getAdById);
router.post('/', upload.single('image'), createAd);
router.put('/:id', upload.single('image'), updateAd);
router.delete('/:id', deleteAd);

module.exports = router;
