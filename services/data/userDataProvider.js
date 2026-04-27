const mongoUserProvider = require('./providers/mongo/userProvider');
const firebaseUserProvider = require('./providers/firebase/userProvider');
const { getSelectedBackend } = require('./backendSelector');

function getUserDataProvider() {
  const backend = getSelectedBackend('me');
  if (backend === 'firebase') return firebaseUserProvider;
  return mongoUserProvider;
}

module.exports = {
  getUserDataProvider,
};
