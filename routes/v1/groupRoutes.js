const express = require('express');
const multer = require('multer');
const { verifyJwt } = require('../../middleware/verifyJwt');
const { createGroup, getGroups, getGroupById, addMembers, removeMember, joinGroup, updateGroup, uploadGroupAvatar, deleteGroup } = require('../../controllers/v1/groupController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (for ~4MB images + overhead)
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
// Add member(s) to group. Body: { userId } or { userIds: [id1, id2] }. Admin only.
router.post('/:groupId/members', addMembers);
// Remove member. DELETE :groupId/members/:userId — self = leave; other = admin only.
router.delete('/:groupId/members/:userId', removeMember);
// Join group (current user). Idempotent.
router.post('/:groupId/join', joinGroup);
// Upload group avatar only. POST + multipart works reliably (use this from Flutter). Field name: "image".
router.post('/:groupId/avatar', upload.single('image'), uploadGroupAvatar);
// Update group settings (name, description, type). Admin only. For image use POST .../avatar.
router.put('/:groupId', upload.any(), updateGroup);
// Delete group. Admin only.
router.delete('/:groupId', deleteGroup);
// Group detail + members list (only for group members; admin can use to add people)
router.get('/:groupId', getGroupById);

module.exports = router;
