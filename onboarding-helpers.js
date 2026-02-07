const { db, admin } = require('./firebase-config');

const ONBOARDING_COLLECTION = 'onboarding';

/**
 * Get onboarding steps for app (active only, ordered) or CRM (all).
 * @param {Object} options - { activeOnly: boolean }
 * @returns {Promise<Array>}
 */
async function getOnboardingSteps(options = {}) {
  const { activeOnly = true } = options;
  try {
    let query = db.collection(ONBOARDING_COLLECTION).orderBy('order', 'asc');
    if (activeOnly) {
      query = query.where('isActive', '==', true);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting onboarding steps:', error);
    throw error;
  }
}

/**
 * Get a single onboarding step by ID.
 * @param {string} stepId
 * @returns {Promise<Object|null>}
 */
async function getOnboardingStepById(stepId) {
  try {
    const doc = await db.collection(ONBOARDING_COLLECTION).doc(stepId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting onboarding step:', error);
    throw error;
  }
}

/**
 * Create a new onboarding step.
 * @param {Object} data - { title, subtitle, description, imageUrl, order?, isActive? }
 * @returns {Promise<Object>}
 */
async function createOnboardingStep(data) {
  try {
    const { title, subtitle, description, imageUrl, order, isActive = true } = data;
    if (!title || title.trim() === '') {
      throw new Error('Title is required');
    }

    const ref = db.collection(ONBOARDING_COLLECTION).doc();
    let orderValue = order;
    if (orderValue == null || orderValue === '') {
      const snapshot = await db.collection(ONBOARDING_COLLECTION).orderBy('order', 'desc').limit(1).get();
      orderValue = snapshot.empty ? 0 : (snapshot.docs[0].data().order ?? -1) + 1;
    }

    const step = {
      title: title.trim(),
      subtitle: (subtitle ?? '').trim(),
      description: (description ?? '').trim(),
      imageUrl: (imageUrl ?? '').trim(),
      order: Number(orderValue),
      isActive: !!isActive,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(step);
    return { id: ref.id, ...step };
  } catch (error) {
    console.error('Error creating onboarding step:', error);
    throw error;
  }
}

/**
 * Update an onboarding step.
 * @param {string} stepId
 * @param {Object} data - { title?, subtitle?, description?, imageUrl?, order?, isActive? }
 * @returns {Promise<Object>}
 */
async function updateOnboardingStep(stepId, data) {
  try {
    const ref = db.collection(ONBOARDING_COLLECTION).doc(stepId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Onboarding step not found');

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (data.title !== undefined) updates.title = String(data.title).trim();
    if (data.subtitle !== undefined) updates.subtitle = String(data.subtitle).trim();
    if (data.description !== undefined) updates.description = String(data.description).trim();
    if (data.imageUrl !== undefined) updates.imageUrl = String(data.imageUrl).trim();
    if (data.order !== undefined) updates.order = Number(data.order);
    if (data.isActive !== undefined) updates.isActive = !!data.isActive;

    await ref.update(updates);
    return getOnboardingStepById(stepId);
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    throw error;
  }
}

/**
 * Delete an onboarding step.
 * @param {string} stepId
 * @returns {Promise<boolean>}
 */
async function deleteOnboardingStep(stepId) {
  try {
    const ref = db.collection(ONBOARDING_COLLECTION).doc(stepId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Onboarding step not found');
    await ref.delete();
    return true;
  } catch (error) {
    console.error('Error deleting onboarding step:', error);
    throw error;
  }
}

module.exports = {
  getOnboardingSteps,
  getOnboardingStepById,
  createOnboardingStep,
  updateOnboardingStep,
  deleteOnboardingStep,
};
