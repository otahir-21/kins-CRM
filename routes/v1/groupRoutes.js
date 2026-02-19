const express = require('express');
const multer = require('multer');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { createGroup, getGroups } = require('../../controllers/v1/groupController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, allowed);
  },
});

router.use(verifyJwt);

// List groups (optional: member=me, search, type, page, limit)
router.get('/', getGroups);
// Create group: name, description?, type (interactive|updates_only), optional image (field: image)
router.post('/', upload.single('image'), createGroup);

module.exports = router;
