const express = require('express');
const multer = require('multer');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { createPost, getPost, deletePost } = require('../../controllers/v1/postsController');

const router = express.Router();

// Multer config for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max per file
    files: 10, // max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

// All routes require JWT
router.use(verifyJwt);

// Create post (with optional media upload)
router.post('/', upload.array('media', 10), createPost);

// Get single post
router.get('/:id', getPost);

// Delete post
router.delete('/:id', deletePost);

module.exports = router;
