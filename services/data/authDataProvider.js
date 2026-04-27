const mongoAuthProvider = require('./providers/mongo/authProvider');
const firebaseAuthProvider = require('./providers/firebase/authProvider');
const { getSelectedBackend } = require('./backendSelector');

function getAuthDataProvider() {
  const backend = getSelectedBackend('auth');
  if (backend === 'firebase') return firebaseAuthProvider;
  return mongoAuthProvider;
}

module.exports = {
  getAuthDataProvider,
  getSelectedBackend,
};
