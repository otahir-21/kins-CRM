const { db, auth, admin } = require('./firebase-config');

/**
 * Normalize phone to E.164 (e.g. +14155551234). Used as unique user identifier.
 * @param {string} phone - Phone number (with or without +)
 * @returns {string} E.164 format
 */
function normalizePhoneToE164(phone) {
  if (!phone || typeof phone !== 'string') throw new Error('Phone number is required');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) throw new Error('Invalid phone number');
  // E.164: + and digits. Leading 0 → UK (+44); 10 digits → US (+1); 11 starting with 1 → +1; else assume with country code.
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Get user by phone number (phone is the unique identifier; doc ID = E.164 phone).
 * @param {string} phone - Phone number (any format, will be normalized)
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserByPhone(phone) {
  try {
    const e164 = normalizePhoneToE164(phone);
    const userDoc = await db.collection('users').doc(e164).get();
    if (!userDoc.exists) return null;
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user by phone:', error);
    throw error;
  }
}

/**
 * Create a new user with phone as unique identifier (doc ID = E.164 phone).
 * @param {string} phone - Phone number (will be normalized to E.164)
 * @returns {Promise<Object>} Created user
 */
async function createUserByPhone(phone) {
  try {
    const e164 = normalizePhoneToE164(phone);
    const userRef = db.collection('users').doc(e164);
    const existing = await userRef.get();
    if (existing.exists) {
      return { id: existing.id, ...existing.data() };
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    const userData = {
      phoneNumber: e164,
      name: null,
      gender: null,
      documentUrl: null,
      interests: [],
      fcmToken: null,
      createdAt: now,
      updatedAt: now,
    };
    await userRef.set(userData);
    const created = await userRef.get();
    return { id: created.id, ...created.data() };
  } catch (error) {
    console.error('Error creating user by phone:', error);
    throw error;
  }
}

/**
 * Get all users from Firestore
 * @returns {Promise<Array>} Array of user objects
 */
async function getAllUsers() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Get user by ID from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function getUserById(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Get user with authentication data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object with Firestore and Auth data
 */
async function getUserWithAuthData(userId) {
  try {
    // Get Firestore data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // Get Auth data
    let authData = null;
    try {
      const userRecord = await auth.getUser(userId);
      authData = {
        uid: userRecord.uid,
        phoneNumber: userRecord.phoneNumber,
        email: userRecord.email,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime
        }
      };
    } catch (error) {
      console.warn(`Could not get auth data for user ${userId}:`, error.message);
    }
    
    return {
      id: userId,
      firestore: userData,
      auth: authData
    };
  } catch (error) {
    console.error('Error getting user with auth data:', error);
    throw error;
  }
}

/**
 * Get user documents from subcollection
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of document objects
 */
async function getUserDocuments(userId) {
  try {
    const documentsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('documents')
      .get();
    
    const documents = [];
    documentsSnapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return documents;
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}

/**
 * Get complete user profile with all data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Complete user profile
 */
async function getCompleteUserProfile(userId) {
  try {
    // Get user data
    const user = await getUserWithAuthData(userId);
    
    // Get documents
    const documents = await getUserDocuments(userId);
    
    return {
      ...user,
      documents: documents
    };
  } catch (error) {
    console.error('Error getting complete profile:', error);
    throw error;
  }
}

/**
 * Get all users with complete data (including auth and documents)
 * @returns {Promise<Array>} Array of complete user profiles
 */
async function getAllUsersComplete() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      const documents = await getUserDocuments(userId);
      
      // Get auth data
      let authData = null;
      try {
        const userRecord = await auth.getUser(userId);
        authData = {
          phoneNumber: userRecord.phoneNumber,
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime
        };
      } catch (error) {
        console.warn(`Could not get auth data for user ${userId}:`, error.message);
      }
      
      users.push({
        id: userId,
        ...userData,
        auth: authData,
        documents: documents
      });
    }
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Search users by name
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching users
 */
async function searchUsersByName(searchTerm) {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const name = (userData.name || '').toLowerCase();
      
      if (name.includes(searchTerm.toLowerCase())) {
        users.push({
          id: doc.id,
          ...userData
        });
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Filter users by gender
 * @param {string} gender - Gender filter ('male', 'female', 'other')
 * @returns {Promise<Array>} Array of filtered users
 */
async function getUsersByGender(gender) {
  try {
    const usersSnapshot = await db
      .collection('users')
      .where('gender', '==', gender)
      .get();
    
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error filtering users:', error);
    throw error;
  }
}

/**
 * Get users with documents uploaded
 * @returns {Promise<Array>} Array of users with documents
 */
async function getUsersWithDocuments() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.documentUrl) {
        users.push({
          id: doc.id,
          ...userData
        });
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users with documents:', error);
    throw error;
  }
}

/**
 * Update user data
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user object
 */
async function updateUser(userId, updateData) {
  try {
    const userRef = db.collection('users').doc(userId);
    
    await userRef.update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return await getUserById(userId);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Get user statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getUserStatistics() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    const stats = {
      totalUsers: users.length,
      usersByGender: {
        male: users.filter(u => u.gender === 'male').length,
        female: users.filter(u => u.gender === 'female').length,
        other: users.filter(u => u.gender === 'other').length,
        unknown: users.filter(u => !u.gender).length
      },
      usersWithDocuments: users.filter(u => u.documentUrl).length,
      usersWithoutDocuments: users.filter(u => !u.documentUrl).length
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting statistics:', error);
    throw error;
  }
}

/**
 * Get user's selected interests
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of interest IDs
 */
async function getUserInterests(userId) {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.interests || [];
  } catch (error) {
    console.error('Error getting user interests:', error);
    throw error;
  }
}

/**
 * Add interest to user (max 10 interests)
 * @param {string} userId - User ID
 * @param {string} interestId - Interest ID to add
 * @returns {Promise<Object>} Updated user object
 */
async function addUserInterest(userId, interestId) {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentInterests = user.interests || [];
    
    // Check if interest already exists
    if (currentInterests.includes(interestId)) {
      throw new Error('Interest already added');
    }

    // Check max limit (10 interests)
    if (currentInterests.length >= 10) {
      throw new Error('Maximum 10 interests allowed');
    }

    // Add interest
    const updatedInterests = [...currentInterests, interestId];

    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      interests: updatedInterests,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return await getUserById(userId);
  } catch (error) {
    console.error('Error adding user interest:', error);
    throw error;
  }
}

/**
 * Remove interest from user
 * @param {string} userId - User ID
 * @param {string} interestId - Interest ID to remove
 * @returns {Promise<Object>} Updated user object
 */
async function removeUserInterest(userId, interestId) {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentInterests = user.interests || [];
    
    // Remove interest if it exists
    const updatedInterests = currentInterests.filter(id => id !== interestId);

    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      interests: updatedInterests,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return await getUserById(userId);
  } catch (error) {
    console.error('Error removing user interest:', error);
    throw error;
  }
}

/**
 * Update user's interests (bulk update, max 10)
 * @param {string} userId - User ID
 * @param {Array<string>} interestIds - Array of interest IDs
 * @returns {Promise<Object>} Updated user object
 */
async function updateUserInterests(userId, interestIds) {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate array
    if (!Array.isArray(interestIds)) {
      throw new Error('Interest IDs must be an array');
    }

    // Check max limit (10 interests)
    if (interestIds.length > 10) {
      throw new Error('Maximum 10 interests allowed');
    }

    // Remove duplicates
    const uniqueInterestIds = [...new Set(interestIds)];

    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      interests: uniqueInterestIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return await getUserById(userId);
  } catch (error) {
    console.error('Error updating user interests:', error);
    throw error;
  }
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
  updateUserInterests
};
