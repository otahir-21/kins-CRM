const User = require('../../../../models/User');

async function findById(userId) {
  return User.findById(userId).lean();
}

async function updateById(userId, updates, options = {}) {
  const { returnUpdated = false } = options;
  if (returnUpdated) {
    return User.findByIdAndUpdate(userId, updates, { new: true }).lean();
  }
  await User.findByIdAndUpdate(userId, updates);
  return null;
}

async function deleteById(userId) {
  await User.findByIdAndDelete(userId);
}

module.exports = {
  findById,
  updateById,
  deleteById,
};
