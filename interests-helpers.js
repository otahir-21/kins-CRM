/**
 * Interests — stubbed (use /api/interests and MongoDB instead). Kept for seed-interests compatibility.
 */
async function createInterest(interestData) {
  throw new Error('Use API POST /api/interests (MongoDB) instead.');
}
async function getAllInterests(filters = {}) {
  return [];
}
async function getInterestById(interestId) {
  return null;
}
async function updateInterest(interestId, updateData) {
  throw new Error('Use API PUT /api/interests/:id (MongoDB) instead.');
}
async function deleteInterest(interestId) {
  throw new Error('Use API DELETE /api/interests/:id (MongoDB) instead.');
}
async function hardDeleteInterest(interestId) {
  throw new Error('Use API DELETE /api/interests/:id (MongoDB) instead.');
}
module.exports = {
  createInterest,
  getAllInterests,
  getInterestById,
  updateInterest,
  deleteInterest,
  hardDeleteInterest,
};
