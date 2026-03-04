const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  listListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} = require('../../controllers/v1/marketplaceController');

const router = express.Router();

// Public/app: list + get do not strictly require auth, but verifyJwt is cheap and keeps shape consistent.
router.get('/listings', listListings);
router.get('/listings/:id', getListingById);

// Seller actions: require JWT
router.use(verifyJwt);
router.post('/listings', createListing);
router.put('/listings/:id', updateListing);
router.delete('/listings/:id', deleteListing);

module.exports = router;

