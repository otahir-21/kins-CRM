const { db, admin } = require('./firebase-config');

/**
 * Create a new interest
 * @param {Object} interestData - Interest data { name }
 * @returns {Promise<Object>} Created interest
 */
async function createInterest(interestData) {
  try {
    const { name } = interestData;
    
    if (!name || name.trim() === '') {
      throw new Error('Interest name is required');
    }

    const interestRef = db.collection('interests').doc();
    const interest = {
      id: interestRef.id,
      name: name.trim(),
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await interestRef.set(interest);

    return {
      id: interestRef.id,
      ...interest,
    };
  } catch (error) {
    console.error('Error creating interest:', error);
    throw error;
  }
}

/**
 * Get all interests
 * @param {Object} filters - Optional filters { isActive, limit }
 * @returns {Promise<Array>} Array of interests
 */
async function getAllInterests(filters = {}) {
  try {
    let query = db.collection('interests');

    // Filter by active status
    if (filters.isActive !== undefined) {
      query = query.where('isActive', '==', filters.isActive);
    }

    // Order by creation date
    query = query.orderBy('createdAt', 'desc');

    // Apply limit if provided
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    const interests = [];

    snapshot.forEach(doc => {
      interests.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return interests;
  } catch (error) {
    console.error('Error getting interests:', error);
    throw error;
  }
}

/**
 * Get interest by ID
 * @param {string} interestId - Interest ID
 * @returns {Promise<Object|null>} Interest object or null
 */
async function getInterestById(interestId) {
  try {
    const interestDoc = await db.collection('interests').doc(interestId).get();

    if (!interestDoc.exists) {
      return null;
    }

    return {
      id: interestDoc.id,
      ...interestDoc.data(),
    };
  } catch (error) {
    console.error('Error getting interest:', error);
    throw error;
  }
}

/**
 * Update interest
 * @param {string} interestId - Interest ID
 * @param {Object} updateData - Data to update { name, isActive }
 * @returns {Promise<Object>} Updated interest
 */
async function updateInterest(interestId, updateData) {
  try {
    const interestRef = db.collection('interests').doc(interestId);
    const interestDoc = await interestRef.get();

    if (!interestDoc.exists) {
      throw new Error('Interest not found');
    }

    const updateFields = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updateData.name !== undefined) {
      if (updateData.name.trim() === '') {
        throw new Error('Interest name cannot be empty');
      }
      updateFields.name = updateData.name.trim();
    }

    if (updateData.isActive !== undefined) {
      updateFields.isActive = updateData.isActive;
    }

    await interestRef.update(updateFields);

    return await getInterestById(interestId);
  } catch (error) {
    console.error('Error updating interest:', error);
    throw error;
  }
}

/**
 * Delete interest (soft delete by setting isActive to false)
 * @param {string} interestId - Interest ID
 * @returns {Promise<Object>} Deleted interest
 */
async function deleteInterest(interestId) {
  try {
    // Soft delete by setting isActive to false
    return await updateInterest(interestId, { isActive: false });
  } catch (error) {
    console.error('Error deleting interest:', error);
    throw error;
  }
}

/**
 * Hard delete interest (permanently remove)
 * @param {string} interestId - Interest ID
 * @returns {Promise<boolean>} Success status
 */
async function hardDeleteInterest(interestId) {
  try {
    const interestRef = db.collection('interests').doc(interestId);
    const interestDoc = await interestRef.get();

    if (!interestDoc.exists) {
      throw new Error('Interest not found');
    }

    await interestRef.delete();
    return true;
  } catch (error) {
    console.error('Error hard deleting interest:', error);
    throw error;
  }
}

module.exports = {
  createInterest,
  getAllInterests,
  getInterestById,
  updateInterest,
  deleteInterest,
  hardDeleteInterest,
};
