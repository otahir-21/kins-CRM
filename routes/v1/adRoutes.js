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
  // Increased to 50MB to allow larger marketplace ad images
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Public: mobile app fetches active ads (no auth)
router.get('/active', getActiveAds);

// Public: CRM list all ads (no auth) – same data as mobile, list view for dashboard
router.get('/', listAds);

// CRM: create/update/delete and get-by-id require JWT
router.use(verifyJwt);
router.get('/:id', getAdById); // get single ad (CRM)
router.post('/', upload.single('image'), createAd);
router.put('/:id', upload.single('image'), updateAd);
router.delete('/:id', deleteAd);

module.exports = router;
