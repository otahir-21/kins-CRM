const mongoose = require('mongoose');
const crypto = require('crypto');
const BrandVerificationRequest = require('../../models/BrandVerificationRequest');
const User = require('../../models/User');
const { uploadToBunnyCDN } = require('../../upload-helpers');

function toBrandRequestResponse(doc, user) {
  if (!doc || !doc._id) return null;
  const u = user || doc.user || null;
  const userPayload =
    u && u._id
      ? {
          id: u._id.toString(),
          name: u.name ?? null,
          username: u.username ?? null,
          profilePictureUrl: u.profilePictureUrl ?? null,
          followerCount: u.followerCount ?? 0,
          followingCount: u.followingCount ?? 0,
        }
      : null;

  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    brandName: doc.brandName,
    companyName: doc.companyName ?? null,
    website: doc.website ?? null,
    contactEmail: doc.contactEmail ?? null,
    contactPhone: doc.contactPhone ?? null,
    industry: doc.industry ?? null,
    description: doc.description ?? null,
    socialLinks: doc.socialLinks ?? [],
    documentUrls: doc.documentUrls ?? [],
    status: doc.status,
    reviewNotes: doc.reviewNotes ?? null,
    reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : null,
    reviewedAt: doc.reviewedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    user: userPayload,
  };
}

/**
 * POST /api/v1/brands/verification/document
 * Upload a brand verification document (image or PDF) to Bunny CDN and return its URL.
 * Multipart field name: "document".
 */
async function uploadVerificationDocument(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Document file is required (field: document).' });
    }
    const original = req.file.originalname || 'document';
    const ext = (original.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : 'jpg';
    const filename = `brand-verification-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${safeExt}`;
    const contentType = req.file.mimetype || 'application/octet-stream';
    const { url } = await uploadToBunnyCDN(req.file.buffer, filename, 'brand-verification', contentType);
    return res.status(201).json({ success: true, url });
  } catch (err) {
    console.error('POST /brands/verification/document error:', err);
    const isConfigMissing =
      err.message &&
      (err.message.includes('Bunny CDN config missing') || err.message.includes('not configured'));
    const status = isConfigMissing ? 503 : 500;
    return res.status(status).json({ success: false, error: err.message || 'Failed to upload document.' });
  }
}

/**
 * POST /api/v1/brands/verification
 * Current user submits or updates their brand verification request.
 */
async function submitVerification(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const {
      brandName,
      companyName,
      website,
      contactEmail,
      contactPhone,
      industry,
      description,
      socialLinks,
      documentUrls,
    } = req.body || {};

    if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
      return res.status(400).json({ success: false, error: 'brandName is required.' });
    }

    const base = {
      brandName: String(brandName).trim(),
      companyName: companyName != null ? String(companyName).trim() : undefined,
      website: website != null ? String(website).trim() : undefined,
      contactEmail: contactEmail != null ? String(contactEmail).trim() : undefined,
      contactPhone: contactPhone != null ? String(contactPhone).trim() : undefined,
      industry: industry != null ? String(industry).trim() : undefined,
      description: description != null ? String(description).trim() : undefined,
    };

    if (Array.isArray(socialLinks)) {
      base.socialLinks = socialLinks
        .map((s) => ({
          type: s?.type ? String(s.type).trim() : undefined,
          handle: s?.handle ? String(s.handle).trim() : undefined,
          url: s?.url ? String(s.url).trim() : undefined,
        }))
        .filter((s) => s.type || s.handle || s.url);
    }

    if (Array.isArray(documentUrls)) {
      base.documentUrls = documentUrls
        .map((u) => (u != null ? String(u).trim() : ''))
        .filter((u) => u.length > 0);
    }

    let existing = await BrandVerificationRequest.findOne({ userId }).sort({ createdAt: -1 }).lean();

    let doc;
    if (existing && existing.status === 'pending') {
      doc = await BrandVerificationRequest.findByIdAndUpdate(
        existing._id,
        { ...base, status: 'pending', reviewedBy: null, reviewedAt: null, reviewNotes: undefined },
        { new: true }
      ).lean();
    } else {
      doc = await BrandVerificationRequest.create({
        userId,
        ...base,
        status: 'pending',
      });
      doc = doc.toObject();
    }

    const user = await User.findById(userId).select('name username profilePictureUrl followerCount followingCount').lean();
    return res.status(201).json({ success: true, request: toBrandRequestResponse(doc, user) });
  } catch (err) {
    console.error('POST /brands/verification error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to submit verification.' });
  }
}

/**
 * GET /api/v1/brands/verification/me
 * Current user's latest brand verification request (if any).
 */
async function getMyVerification(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    const doc = await BrandVerificationRequest.findOne({ userId }).sort({ createdAt: -1 }).lean();
    if (!doc) {
      return res.status(200).json({ success: true, request: null });
    }
    const user = await User.findById(userId).select('name username profilePictureUrl followerCount followingCount').lean();
    return res.status(200).json({ success: true, request: toBrandRequestResponse(doc, user) });
  } catch (err) {
    console.error('GET /brands/verification/me error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get verification.' });
  }
}

/**
 * Internal helper for CRM routes: list brand verification requests with filters.
 */
async function listVerificationRequests(params = {}) {
  const {
    status = 'pending',
    page = 1,
    limit = 20,
    q = '',
  } = params;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status;
  }

  let userFilterIds = null;
  const searchQ = (q || '').trim();
  if (searchQ) {
    const escaped = searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');
    const users = await User.find({
      $or: [{ name: re }, { username: re }, { email: re }, { phoneNumber: re }],
    })
      .select('_id')
      .lean();
    userFilterIds = users.map((u) => u._id);
    if (userFilterIds.length === 0) {
      return { requests: [], pagination: { page: pageNum, limit: limitNum, total: 0, hasMore: false } };
    }
    filter.userId = { $in: userFilterIds };
  }

  const [docs, total] = await Promise.all([
    BrandVerificationRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    BrandVerificationRequest.countDocuments(filter),
  ]);

  const userIds = docs.map((d) => d.userId).filter(Boolean);
  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('name username profilePictureUrl followerCount followingCount')
          .lean()
      : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return {
    requests: docs.map((d) => toBrandRequestResponse(d, userMap.get(d.userId.toString()) || null)),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      hasMore: skip + docs.length < total,
    },
  };
}

/**
 * Internal helper for CRM routes: get single request by id (with user).
 */
async function getVerificationRequestById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await BrandVerificationRequest.findById(id).lean();
  if (!doc) return null;
  const user = await User.findById(doc.userId)
    .select('name username profilePictureUrl followerCount followingCount')
    .lean();
  return toBrandRequestResponse(doc, user);
}

/**
 * Internal helper for CRM routes: approve/reject request.
 */
async function updateVerificationStatus(id, status, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  if (!['approved', 'rejected'].includes(status)) return null;

  const { reviewNotes, reviewerId } = options;
  const update = {
    status,
    reviewNotes: reviewNotes != null ? String(reviewNotes).trim() : undefined,
    reviewedAt: new Date(),
  };
  if (reviewerId && mongoose.Types.ObjectId.isValid(reviewerId)) {
    update.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
  }

  const doc = await BrandVerificationRequest.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!doc) return null;

  if (status === 'approved') {
    await User.findByIdAndUpdate(doc.userId, { isBrand: true, isBrandVerified: true });
  }

  const user = await User.findById(doc.userId)
    .select('name username profilePictureUrl followerCount followingCount')
    .lean();
  return toBrandRequestResponse(doc, user);
}

module.exports = {
  submitVerification,
  getMyVerification,
  listVerificationRequests,
  getVerificationRequestById,
  updateVerificationStatus,
  uploadVerificationDocument,
};

