/**
 * User/data helpers — MongoDB only (Firebase/Firestore removed)
 */
const mongoose = require('mongoose');
const User = require('./models/User');

function toUserDoc(user) {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : user;
  return {
    id: u._id.toString(),
    name: u.name ?? null,
    email: u.email ?? null,
    phoneNumber: u.phoneNumber ?? null,
    gender: u.gender ?? null,
    documentUrl: u.documentUrl ?? null,
    interests: (u.interests || []).map((i) => (i && i.toString ? i.toString() : String(i))),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function normalizePhoneToE164(phone) {
  if (!phone || typeof phone !== 'string') throw new Error('Phone number is required');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) throw new Error('Invalid phone number');
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

async function getUserByPhone(phone) {
  const e164 = normalizePhoneToE164(phone);
  const user = await User.findOne({
    $or: [{ phoneNumber: e164 }, { provider: 'phone', providerUserId: e164 }],
  }).lean();
  return user ? toUserDoc(user) : null;
}

async function createUserByPhone(phone) {
  const e164 = normalizePhoneToE164(phone);
  let user = await User.findOne({
    $or: [{ phoneNumber: e164 }, { provider: 'phone', providerUserId: e164 }],
  }).lean();
  if (user) return toUserDoc(user);
  user = await User.create({
    provider: 'phone',
    providerUserId: e164,
    phoneNumber: e164,
  });
  return toUserDoc(user);
}

async function getAllUsers() {
  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  return users.map(toUserDoc);
}

async function getUserById(userId) {
  if (!userId) return null;
  let user = null;
  if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === userId) {
    user = await User.findById(userId).lean();
  }
  if (!user) user = await User.findOne({ phoneNumber: userId }).lean();
  if (!user) user = await User.findOne({ provider: 'phone', providerUserId: userId }).lean();
  return user ? toUserDoc(user) : null;
}

async function getUserWithAuthData(userId) {
  const user = await getUserById(userId);
  if (!user) return { id: userId, firestore: null, auth: null };
  return {
    id: user.id,
    firestore: user,
    auth: { phoneNumber: user.phoneNumber },
  };
}

async function getUserDocuments(userId) {
  const user = await User.findById(mongoose.Types.ObjectId.isValid(userId) ? userId : null).lean();
  if (!user) return [];
  if (!user.documentUrl) return [];
  return [{ id: 'doc1', url: user.documentUrl, type: 'document' }];
}

async function getCompleteUserProfile(userId) {
  const user = await getUserWithAuthData(userId);
  const documents = await getUserDocuments(userId);
  return { ...user, documents };
}

async function getAllUsersComplete() {
  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  const result = [];
  for (const u of users) {
    const doc = toUserDoc(u);
    const docs = await getUserDocuments(u._id.toString());
    result.push({ ...doc, auth: { phoneNumber: doc.phoneNumber }, documents: docs });
  }
  return result;
}

async function searchUsersByName(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') return [];
  const re = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({ name: re }).lean();
  return users.map(toUserDoc);
}

async function getUsersByGender(gender) {
  const users = await User.find({ gender }).lean();
  return users.map(toUserDoc);
}

async function getUsersWithDocuments() {
  const users = await User.find({ documentUrl: { $exists: true, $ne: null, $ne: '' } }).lean();
  return users.map(toUserDoc);
}

async function updateUser(userId, updateData) {
  const id = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
  if (!id) return null;
  const allowed = ['name', 'gender', 'documentUrl'];
  const filtered = {};
  Object.keys(updateData || {}).forEach((k) => {
    if (allowed.includes(k)) filtered[k] = updateData[k];
  });
  if (Object.keys(filtered).length === 0) return getUserById(userId);
  const user = await User.findByIdAndUpdate(id, { ...filtered, updatedAt: new Date() }, { new: true }).lean();
  return user ? toUserDoc(user) : null;
}

async function getUserStatistics() {
  const users = await User.find({}).lean();
  const list = users.map(toUserDoc);
  return {
    totalUsers: list.length,
    usersByGender: {
      male: list.filter((u) => u.gender === 'male').length,
      female: list.filter((u) => u.gender === 'female').length,
      other: list.filter((u) => u.gender === 'other').length,
      unknown: list.filter((u) => !u.gender).length,
    },
    usersWithDocuments: list.filter((u) => u.documentUrl).length,
    usersWithoutDocuments: list.filter((u) => !u.documentUrl).length,
  };
}

async function getUserInterests(userId) {
  const user = await getUserById(userId);
  return user ? user.interests || [] : [];
}

async function addUserInterest(userId, interestId) {
  const u = await User.findById(mongoose.Types.ObjectId.isValid(userId) ? userId : null);
  if (!u) throw new Error('User not found');
  const current = (u.interests || []).map((i) => i.toString());
  if (current.includes(interestId)) throw new Error('Interest already added');
  if (current.length >= 10) throw new Error('Maximum 10 interests allowed');
  u.interests.push(mongoose.Types.ObjectId(interestId));
  await u.save();
  return getUserById(userId);
}

async function removeUserInterest(userId, interestId) {
  const u = await User.findById(mongoose.Types.ObjectId.isValid(userId) ? userId : null);
  if (!u) throw new Error('User not found');
  u.interests = (u.interests || []).filter((i) => i.toString() !== interestId);
  await u.save();
  return getUserById(userId);
}

async function updateUserInterests(userId, interestIds) {
  const u = await User.findById(mongoose.Types.ObjectId.isValid(userId) ? userId : null);
  if (!u) throw new Error('User not found');
  if (!Array.isArray(interestIds)) throw new Error('Interest IDs must be an array');
  if (interestIds.length > 10) throw new Error('Maximum 10 interests allowed');
  const unique = [...new Set(interestIds)].filter((id) => mongoose.Types.ObjectId.isValid(id));
  u.interests = unique.map((id) => new mongoose.Types.ObjectId(id));
  u.interestsUpdatedAt = new Date();
  await u.save();
  return getUserById(userId);
}

module.exports = {
  normalizePhoneToE164,
  getUserByPhone,
  createUserByPhone,
  getAllUsers,
  getUserById,
  getUserWithAuthData,
  getUserDocuments,
  getCompleteUserProfile,
  getAllUsersComplete,
  searchUsersByName,
  getUsersByGender,
  getUsersWithDocuments,
  updateUser,
  getUserStatistics,
  getUserInterests,
  addUserInterest,
  removeUserInterest,
  updateUserInterests,
};
