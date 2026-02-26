const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const {
  list,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  create,
  update,
  remove,
} = require('../../controllers/interestsMongoController');

const router = express.Router();

// Categories (before /:id)
router.get('/categories', (req, res, next) => {
  req.query.active = 'true';
  return listCategories(req, res, next);
});
router.post('/categories', verifyJwt, createCategory);
router.put('/categories/:id', verifyJwt, updateCategory);
router.delete('/categories/:id', verifyJwt, removeCategory);

// GET /interests - grouped categories + tags, active only (public for app)
router.get('/', (req, res, next) => {
  req.query.active = 'true';
  return list(req, res, next);
});

// Tag mutations require JWT
router.post('/', verifyJwt, create);
router.put('/:id', verifyJwt, update);
router.delete('/:id', verifyJwt, remove);

module.exports = router;
