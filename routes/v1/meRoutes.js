const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { getMe, updateMeAbout, setMyInterests, getMyInterests, getFirebaseToken, saveFcmToken, deleteMe } = require('../../controllers/v1/meController');

const router = express.Router();

router.use(verifyJwt);

router.get('/', getMe);
router.get('/firebase-token', getFirebaseToken);
router.post('/fcm-token', saveFcmToken);
router.put('/about', updateMeAbout);
router.delete('/', deleteMe);
router.get('/interests', getMyInterests);
router.post('/interests', setMyInterests);

module.exports = router;
