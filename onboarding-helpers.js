/**
 * Onboarding — stubbed (Firebase removed). Implement with MongoDB if needed.
 */
async function getOnboardingSteps(options = {}) {
  return [];
}
async function getOnboardingStepById(stepId) {
  return null;
}
async function createOnboardingStep(data) {
  throw new Error('Onboarding not implemented (Firebase removed).');
}
async function updateOnboardingStep(stepId, data) {
  throw new Error('Onboarding not implemented (Firebase removed).');
}
async function deleteOnboardingStep(stepId) {
  throw new Error('Onboarding not implemented (Firebase removed).');
}
module.exports = {
  getOnboardingSteps,
  getOnboardingStepById,
  createOnboardingStep,
  updateOnboardingStep,
  deleteOnboardingStep,
};
