const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { list, create, update, remove } = require('../../controllers/interestsMongoController');

const router = express.Router();

// GET /interests - return only isActive === true, sorted by name (public)
router.get('/', (req, res, next) => {
  req.query.active = 'true'; // force active-only for v1
  return list(req, res, next);
});

// Mutations require JWT
router.post('/', verifyJwt, create);
router.put('/:id', verifyJwt, update);
router.delete('/:id', verifyJwt, remove);

module.exports = router;
