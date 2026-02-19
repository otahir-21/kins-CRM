const mongoose = require('mongoose');
const Group = require('../../models/Group');
const BunnyService = require('../../services/BunnyService');
const { isValidObjectId } = require('../../utils/validateObjectId');

function toGroupMember(memberDoc, adminIds) {
  if (!memberDoc || !memberDoc._id) return null;
  const id = memberDoc._id.toString();
  return {
    id,
    name: memberDoc.name ?? null,
    username: memberDoc.username ?? null,
    profilePictureUrl: memberDoc.profilePictureUrl ?? null,
    isAdmin: adminIds.includes(id),
  };
}

function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/v1/groups
 * List groups. Query: member=me (only groups I'm in), search=q (name/description), type=interactive|updates_only, page, limit.
 * Returns for each: id, name, description, type, memberCount, imageUrl, isMember.
 */
async function getGroups(req, res) {
  try {
    const userId = req.userId;
    const memberFilter = (req.query.member || '').toLowerCase();
    const searchQ = (req.query.search || req.query.q || '').trim();
    const typeFilter = (req.query.type || '').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (memberFilter === 'me' || memberFilter === 'mine') {
      filter.members = userId;
    }

    if (searchQ.length >= 1) {
      const escaped = escapeRegex(searchQ);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (['interactive', 'updates_only'].includes(typeFilter)) {
      filter.type = typeFilter;
    }

    const [groups, total] = await Promise.all([
      Group.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Group.countDocuments(filter),
    ]);

    const list = groups.map((g) => {
      const memberIds = (g.members || []).map((id) => id.toString());
      const isMember = memberIds.includes(userId.toString());
      return {
        id: g._id.toString(),
        name: g.name,
        description: g.description ?? null,
        type: g.type,
        memberCount: (g.members || []).length,
        imageUrl: g.groupImageUrl ?? null,
        isMember,
      };
    });

    return res.status(200).json({
      success: true,
      groups: list,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + list.length < total,
      },
    });
  } catch (err) {
    console.error('GET /groups error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list groups.' });
  }
}

/**
 * GET /api/v1/groups/:groupId
 * Group detail with members list (id, name, username, profilePictureUrl, isAdmin).
 * Only group members can view (so admin can see list to add people).
 */
async function getGroupById(req, res) {
  try {
    const userId = req.userId;
    const groupId = req.params.groupId;

    if (!groupId || !isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID.' });
    }

    const group = await Group.findById(groupId)
      .populate('members', 'name username profilePictureUrl')
      .lean();

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const memberIds = (group.members || []).map((m) => (m && m._id ? m._id.toString() : null)).filter(Boolean);
    if (!memberIds.includes(userId.toString())) {
      return res.status(403).json({ success: false, error: 'Only group members can view this group.' });
    }

    const adminIds = (group.admins || []).map((id) => id.toString());
    const members = (group.members || [])
      .filter((m) => m && m._id)
      .map((m) => toGroupMember(m, adminIds));

    return res.status(200).json({
      success: true,
      group: {
        id: group._id.toString(),
        name: group.name,
        description: group.description ?? null,
        type: group.type,
        memberCount: members.length,
        imageUrl: group.groupImageUrl ?? null,
        isMember: true,
        isAdmin: adminIds.includes(userId.toString()),
      },
      members,
    });
  } catch (err) {
    console.error('GET /groups/:groupId error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get group.' });
  }
}

/**
 * POST /api/v1/groups
 * Create a group. Body (form-data): name, description?, type (interactive|updates_only), optional image file (field: image).
 * Creator is added as first member and admin.
 * Returns: { success, group: { id, name, description, type, memberCount, imageUrl } }
 */
async function createGroup(req, res) {
  try {
    const userId = req.userId;
    const name = (req.body.name || '').trim();
    const description = req.body.description != null ? String(req.body.description).trim() : null;
    const type = (req.body.type || 'interactive').toLowerCase();

    if (!name) {
      return res.status(400).json({ success: false, error: 'Group name is required.' });
    }
    if (!['interactive', 'updates_only'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Group type must be "interactive" or "updates_only".',
      });
    }

    let groupImageUrl = null;
    if (req.file && req.file.buffer && req.file.buffer.length) {
      if (!BunnyService.isConfigured()) {
        return res.status(500).json({ success: false, error: 'Image upload not configured (Bunny CDN).' });
      }
      const fileName = req.file.originalname || `group-${Date.now()}.jpg`;
      const { cdnUrl } = await BunnyService.upload(req.file.buffer, fileName, 'groups');
      groupImageUrl = cdnUrl;
    }

    const group = await Group.create({
      name,
      description: description || null,
      type,
      groupImageUrl,
      members: [userId],
      admins: [userId],
      createdBy: userId,
    });

    const memberCount = group.members.length;

    return res.status(201).json({
      success: true,
      group: {
        id: group._id.toString(),
        name: group.name,
        description: group.description ?? null,
        type: group.type,
        memberCount,
        imageUrl: group.groupImageUrl ?? null,
      },
    });
  } catch (err) {
    console.error('POST /groups error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create group.' });
  }
}

/**
 * POST /api/v1/groups/:groupId/members
 * Add one or more users to the group. Body: { userId } or { userIds: [id1, id2] }.
 * Caller must be a group admin.
 */
async function addMembers(req, res) {
  try {
    const currentUserId = req.userId;
    const groupId = req.params.groupId;
    const { userId: singleUserId, userIds: bodyUserIds } = req.body;

    if (!groupId || !isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID.' });
    }

    let idsToAdd = [];
    if (Array.isArray(bodyUserIds) && bodyUserIds.length > 0) {
      idsToAdd = bodyUserIds.filter((id) => id && isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    } else if (singleUserId && isValidObjectId(singleUserId)) {
      idsToAdd = [new mongoose.Types.ObjectId(singleUserId)];
    }
    if (idsToAdd.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide userId or userIds (array of user IDs).' });
    }

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const adminIds = (group.admins || []).map((id) => id.toString());
    if (!adminIds.includes(currentUserId.toString())) {
      return res.status(403).json({ success: false, error: 'Only group admins can add members.' });
    }

    const result = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: { $each: idsToAdd } } },
      { new: true }
    );

    const memberCount = (result.members || []).length;

    return res.status(200).json({
      success: true,
      message: 'Member(s) added.',
      group: {
        id: result._id.toString(),
        name: result.name,
        description: result.description ?? null,
        type: result.type,
        memberCount,
        imageUrl: result.groupImageUrl ?? null,
      },
    });
  } catch (err) {
    console.error('POST /groups/:groupId/members error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to add members.' });
  }
}

/**
 * POST /api/v1/groups/:groupId/join
 * Current user joins the group. Idempotent if already a member.
 */
async function joinGroup(req, res) {
  try {
    const userId = req.userId;
    const groupId = req.params.groupId;

    if (!groupId || !isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID.' });
    }

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const memberIds = (group.members || []).map((id) => id.toString());
    if (memberIds.includes(userId.toString())) {
      return res.status(200).json({
        success: true,
        message: 'Already a member.',
        group: {
          id: group._id.toString(),
          name: group.name,
          description: group.description ?? null,
          type: group.type,
          memberCount: memberIds.length,
          imageUrl: group.groupImageUrl ?? null,
        },
      });
    }

    const result = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true }
    ).lean();

    const memberCount = (result.members || []).length;

    return res.status(200).json({
      success: true,
      message: 'Joined group.',
      group: {
        id: result._id.toString(),
        name: result.name,
        description: result.description ?? null,
        type: result.type,
        memberCount,
        imageUrl: result.groupImageUrl ?? null,
      },
    });
  } catch (err) {
    console.error('POST /groups/:groupId/join error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to join group.' });
  }
}

/**
 * PUT /api/v1/groups/:groupId
 * Update group settings. Only group admins can update.
 *
 * Body must be multipart/form-data (NOT application/json). Fields:
 *   - name (optional)
 *   - description (optional)
 *   - type (optional): "interactive" | "updates_only"
 *   - image (optional): file field name must be "image" or "file"
 *
 * Frontend: use FormData; append text fields and append the file with key "image" (or "file").
 */
async function updateGroup(req, res) {
  try {
    const userId = req.userId;
    const groupId = req.params.groupId;
    const name = req.body.name != null ? String(req.body.name).trim() : undefined;
    const description = req.body.description != null ? String(req.body.description).trim() : undefined;
    const type = req.body.type != null ? String(req.body.type).toLowerCase() : undefined;

    if (!groupId || !isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID.' });
    }

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const adminIds = (group.admins || []).map((id) => id.toString());
    if (!adminIds.includes(userId.toString())) {
      return res.status(403).json({ success: false, error: 'Only group admins can update the group.' });
    }

    if (type !== undefined && !['interactive', 'updates_only'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Group type must be "interactive" or "updates_only".' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name || null;
    if (description !== undefined) updates.description = description || null;
    if (type !== undefined) updates.type = type;

    // Accept file from req.file (single) or req.files.image[0] / req.files.file[0] (fields)
    const file = req.file || (req.files && ((req.files.image && req.files.image[0]) || (req.files.file && req.files.file[0])));
    if (file && file.buffer && file.buffer.length) {
      if (!BunnyService.isConfigured()) {
        return res.status(500).json({ success: false, error: 'Image upload not configured (Bunny CDN).' });
      }
      const fileName = file.originalname || `group-${Date.now()}.jpg`;
      const { cdnUrl } = await BunnyService.upload(file.buffer, fileName, 'groups');
      updates.groupImageUrl = cdnUrl;
    }

    if (Object.keys(updates).length === 0) {
      const current = await Group.findById(groupId).lean();
      return res.status(200).json({
        success: true,
        group: {
          id: current._id.toString(),
          name: current.name,
          description: current.description ?? null,
          type: current.type,
          memberCount: (current.members || []).length,
          imageUrl: current.groupImageUrl ?? null,
        },
      });
    }

    const result = await Group.findByIdAndUpdate(groupId, updates, { new: true }).lean();
    const memberCount = (result.members || []).length;

    return res.status(200).json({
      success: true,
      group: {
        id: result._id.toString(),
        name: result.name,
        description: result.description ?? null,
        type: result.type,
        memberCount,
        imageUrl: result.groupImageUrl ?? null,
      },
    });
  } catch (err) {
    console.error('PUT /groups/:groupId error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update group.' });
  }
}

/**
 * DELETE /api/v1/groups/:groupId
 * Delete the group. Only group admins can delete.
 */
async function deleteGroup(req, res) {
  try {
    const userId = req.userId;
    const groupId = req.params.groupId;

    if (!groupId || !isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID.' });
    }

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const adminIds = (group.admins || []).map((id) => id.toString());
    if (!adminIds.includes(userId.toString())) {
      return res.status(403).json({ success: false, error: 'Only group admins can delete the group.' });
    }

    await Group.findByIdAndDelete(groupId);

    return res.status(200).json({
      success: true,
      message: 'Group deleted.',
    });
  } catch (err) {
    console.error('DELETE /groups/:groupId error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete group.' });
  }
}

module.exports = { createGroup, getGroups, getGroupById, addMembers, joinGroup, updateGroup, deleteGroup };
