const Ad = require('../../models/Ad');
const BunnyService = require('../../services/BunnyService');
const { isValidObjectId } = require('../../utils/validateObjectId');
const crypto = require('crypto');

function getUploadedFile(req) {
  if (req.file) return { buffer: req.file.buffer, fileName: req.file.originalname };
  if (req.files && req.files.length) return { buffer: req.files[0].buffer, fileName: req.files[0].originalname };
  return null;
}

function toAdResponse(doc) {
  if (!doc || !doc._id) return null;
  return {
    id: doc._id.toString(),
    imageUrl: doc.imageUrl,
    link: doc.link,
    title: doc.title ?? null,
    isActive: doc.isActive ?? true,
    order: doc.order ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/v1/ads/active
 * Public: list active ads for mobile app (no auth). Ordered by order asc, then createdAt.
 */
async function getActiveAds(req, res) {
  try {
    const ads = await Ad.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      ads: ads.map(toAdResponse),
    });
  } catch (err) {
    console.error('GET /ads/active error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get ads.' });
  }
}

/**
 * GET /api/v1/ads
 * CRM: list all ads (paginated). Auth required.
 */
async function listAds(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const [ads, total] = await Promise.all([
      Ad.find({}).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ad.countDocuments({}),
    ]);
    return res.status(200).json({
      success: true,
      ads: ads.map(toAdResponse),
      pagination: { page, limit, total, hasMore: skip + ads.length < total },
    });
  } catch (err) {
    console.error('GET /ads error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list ads.' });
  }
}

/**
 * GET /api/v1/ads/:id
 * CRM: get one ad. Auth required.
 */
async function getAdById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ad ID.' });
    }
    const ad = await Ad.findById(id).lean();
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found.' });
    }
    return res.status(200).json({ success: true, ad: toAdResponse(ad) });
  } catch (err) {
    console.error('GET /ads/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get ad.' });
  }
}

/**
 * POST /api/v1/ads
 * CRM: create ad. Multipart: image (file), link (required), title?, isActive?, order?.
 * Auth required.
 */
async function createAd(req, res) {
  try {
    const fileInfo = getUploadedFile(req);
    if (!fileInfo) {
      return res.status(400).json({ success: false, error: 'Image file is required (field: image).' });
    }
    const link = (req.body.link || '').trim();
    if (!link) {
      return res.status(400).json({ success: false, error: 'link is required.' });
    }
    if (!BunnyService.isConfigured()) {
      return res.status(503).json({ success: false, error: 'Image upload not configured (Bunny CDN).' });
    }
    const ext = (fileInfo.fileName || '').split('.').pop() || 'jpg';
    const fileName = `ad_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const { cdnUrl } = await BunnyService.upload(fileInfo.buffer, fileName, 'ads');
    const title = (req.body.title || '').trim() || null;
    const isActive = req.body.isActive !== undefined ? req.body.isActive === true || req.body.isActive === 'true' : true;
    const order = parseInt(req.body.order, 10);
    const ad = await Ad.create({
      imageUrl: cdnUrl,
      link,
      title,
      isActive,
      order: Number.isNaN(order) ? 0 : order,
    });
    return res.status(201).json({ success: true, ad: toAdResponse(ad.toObject()) });
  } catch (err) {
    console.error('POST /ads error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create ad.' });
  }
}

/**
 * PUT /api/v1/ads/:id
 * CRM: update ad. Body: link?, title?, isActive?, order?. Optional multipart image to replace.
 * Auth required.
 */
async function updateAd(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ad ID.' });
    }
    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found.' });
    }
    const fileInfo = getUploadedFile(req);
    if (fileInfo && BunnyService.isConfigured()) {
      const ext = (fileInfo.fileName || '').split('.').pop() || 'jpg';
      const fileName = `ad_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const { cdnUrl } = await BunnyService.upload(fileInfo.buffer, fileName, 'ads');
      ad.imageUrl = cdnUrl;
    }
    if (req.body.link !== undefined) ad.link = String(req.body.link).trim();
    if (req.body.title !== undefined) ad.title = String(req.body.title).trim() || null;
    if (req.body.isActive !== undefined) ad.isActive = req.body.isActive === true || req.body.isActive === 'true';
    const orderNum = parseInt(req.body.order, 10);
    if (!Number.isNaN(orderNum)) ad.order = orderNum;
    await ad.save();
    return res.status(200).json({ success: true, ad: toAdResponse(ad.toObject()) });
  } catch (err) {
    console.error('PUT /ads/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update ad.' });
  }
}

/**
 * DELETE /api/v1/ads/:id
 * CRM: delete ad. Auth required.
 */
async function deleteAd(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ad ID.' });
    }
    const ad = await Ad.findByIdAndDelete(id);
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found.' });
    }
    return res.status(200).json({ success: true, message: 'Ad deleted.' });
  } catch (err) {
    console.error('DELETE /ads/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete ad.' });
  }
}

module.exports = {
  getActiveAds,
  listAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
};
