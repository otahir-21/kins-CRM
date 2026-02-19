const express = require('express');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { chatNotify } = require('../../controllers/v1/chatNotifyController');

const router = express.Router();

router.use(verifyJwt);

router.post('/notify', chatNotify);

module.exports = router;
