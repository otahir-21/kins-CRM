const express = require('express');
const { verifyFirebaseToken, requireUser } = require('../middleware/verifyFirebaseToken');
const { getMe, getMyInterests, setMyInterests } = require('../controllers/meController');

const router = express.Router();

router.use(verifyFirebaseToken, requireUser);

router.get('/', getMe);
router.get('/interests', getMyInterests);
router.post('/interests', setMyInterests);

module.exports = router;
