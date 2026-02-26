const express = require('express');
const {
  list,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  create,
  update,
  remove,
} = require('../controllers/interestsMongoController');

const router = express.Router();

// Categories (must be before /:id so "categories" is not treated as id)
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', removeCategory);

// List: grouped (categories + tags) or flat tags. Create tag.
router.get('/', list);
router.post('/', create);

// Single tag (interest) update/delete
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
module.exports.dashboard = router;
