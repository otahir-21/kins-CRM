const express = require('express');
const mongoController = require('../controllers/interestsMongoController');
const firebaseController = require('../controllers/interestsFirebaseController');
const { getSelectedBackend } = require('../services/data/backendSelector');

const router = express.Router();

function withBackend(action) {
  return (req, res, next) => {
    const backend = getSelectedBackend('interests');
    const controller = backend === 'firebase' ? firebaseController : mongoController;
    return controller[action](req, res, next);
  };
}

// Categories (must be before /:id so "categories" is not treated as id)
router.get('/categories', withBackend('listCategories'));
router.post('/categories', withBackend('createCategory'));
router.put('/categories/:id', withBackend('updateCategory'));
router.delete('/categories/:id', withBackend('removeCategory'));

// Deactivate all uncategorized tags (soft-delete)
router.delete('/uncategorized', withBackend('deactivateUncategorized'));

// List: grouped (categories + tags) or flat tags. Create tag.
router.get('/', withBackend('list'));
router.post('/', withBackend('create'));

// Single tag (interest) update/delete
router.put('/:id', withBackend('update'));
router.delete('/:id', withBackend('remove'));

module.exports = router;
module.exports.dashboard = router;
