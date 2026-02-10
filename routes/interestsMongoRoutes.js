const express = require('express');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { list, create, update, remove } = require('../controllers/interestsMongoController');

const router = express.Router();

router.get('/', list);
router.post('/', verifyFirebaseToken, create);
router.put('/:id', verifyFirebaseToken, update);
router.delete('/:id', verifyFirebaseToken, remove);

// Same routes without Firebase auth for CRM dashboard (no Bearer token sent)
const routerDashboard = express.Router();
routerDashboard.get('/', list);
routerDashboard.post('/', create);
routerDashboard.put('/:id', update);
routerDashboard.delete('/:id', remove);

module.exports = router;
module.exports.dashboard = routerDashboard;
