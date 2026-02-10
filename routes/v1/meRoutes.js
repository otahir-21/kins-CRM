const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { getMe, updateMeAbout, setMyInterests, getMyInterests } = require('../../controllers/v1/meController');

const router = express.Router();

router.use(verifyJwt);

router.get('/', getMe);
router.put('/about', updateMeAbout);
router.get('/interests', getMyInterests);
router.post('/interests', setMyInterests);

module.exports = router;
