const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  addFavorite,
  removeFavorite,
  listFavorites,
} = require('../../controllers/v1/marketplaceFavoritesController');

const router = express.Router();

// All marketplace favorites routes require JWT (user context)
router.use(verifyJwt);

router.get('/', listFavorites);
router.post('/', addFavorite);
router.delete('/:listingId', removeFavorite);

module.exports = router;

