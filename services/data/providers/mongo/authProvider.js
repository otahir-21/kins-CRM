const User = require('../../../../models/User');

async function findActiveUserByProvider(provider, providerUserId) {
  return User.findOne({
    provider,
    providerUserId,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();
}

async function createProviderUser(payload) {
  const created = await User.create(payload);
  return created && created.toObject ? created.toObject() : created;
}

async function updateUserById(userId, updates) {
  await User.findByIdAndUpdate(userId, updates);
}

module.exports = {
  findActiveUserByProvider,
  createProviderUser,
  updateUserById,
};
