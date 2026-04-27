const { getFirestore } = require('./firebaseAdmin');

const ONBOARDING_COLLECTION = 'onboarding_steps';

function db() {
  const firestore = getFirestore();
  if (!firestore) throw new Error('Firebase Firestore is not configured.');
  return firestore;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
  return null;
}

function toStep(id, data) {
  return {
    id: String(id),
    title: data.title || '',
    subtitle: data.subtitle ?? '',
    description: data.description ?? '',
    imageUrl: data.imageUrl ?? '',
    order: Number(data.order || 0),
    isActive: data.isActive !== false,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

async function getOnboardingSteps(options = {}) {
  const activeOnly = options.activeOnly === true;
  const snap = await db().collection(ONBOARDING_COLLECTION).get();
  let steps = snap.docs.map((d) => toStep(d.id, d.data() || {}));
  if (activeOnly) steps = steps.filter((s) => s.isActive);
  steps.sort((a, b) => a.order - b.order || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  return steps;
}

async function getOnboardingStepById(stepId) {
  const id = String(stepId || '').trim();
  if (!id) return null;
  const doc = await db().collection(ONBOARDING_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return toStep(doc.id, doc.data() || {});
}

async function createOnboardingStep(data) {
  const now = new Date().toISOString();
  const ref = db().collection(ONBOARDING_COLLECTION).doc();
  const payload = {
    title: String(data.title || '').trim(),
    subtitle: String(data.subtitle || '').trim(),
    description: String(data.description || '').trim(),
    imageUrl: String(data.imageUrl || '').trim(),
    order: Number(data.order || 0),
    isActive: data.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(payload);
  return toStep(ref.id, payload);
}

async function updateOnboardingStep(stepId, data) {
  const id = String(stepId || '').trim();
  if (!id) throw new Error('Invalid onboarding step ID');
  const ref = db().collection(ONBOARDING_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Onboarding step not found');
  const updates = {
    updatedAt: new Date().toISOString(),
  };
  if (data.title !== undefined) updates.title = String(data.title || '').trim();
  if (data.subtitle !== undefined) updates.subtitle = String(data.subtitle || '').trim();
  if (data.description !== undefined) updates.description = String(data.description || '').trim();
  if (data.imageUrl !== undefined) updates.imageUrl = String(data.imageUrl || '').trim();
  if (data.order !== undefined) updates.order = Number(data.order || 0);
  if (data.isActive !== undefined) updates.isActive = data.isActive === true;
  await ref.set(updates, { merge: true });
  const merged = { ...(snap.data() || {}), ...updates };
  return toStep(id, merged);
}

async function deleteOnboardingStep(stepId) {
  const id = String(stepId || '').trim();
  if (!id) throw new Error('Invalid onboarding step ID');
  const ref = db().collection(ONBOARDING_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Onboarding step not found');
  await ref.delete();
}

module.exports = {
  getOnboardingSteps,
  getOnboardingStepById,
  createOnboardingStep,
  updateOnboardingStep,
  deleteOnboardingStep,
};

