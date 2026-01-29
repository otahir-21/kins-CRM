const { db, admin } = require('./firebase-config');

/**
 * Create a new survey
 * @param {Object} surveyData - Survey data
 * @returns {Promise<Object>} Created survey
 */
async function createSurvey(surveyData) {
  try {
    const {
      title,
      description,
      question,
      options,
      targetAudience = 'all',
      expiresAt = null,
    } = surveyData;

    // Validate required fields
    if (!title || !question || !options || !Array.isArray(options) || options.length < 2) {
      throw new Error('Title, question, and at least 2 options are required');
    }

    // Validate options
    options.forEach((opt, index) => {
      if (!opt.text || opt.text.trim() === '') {
        throw new Error(`Option ${index + 1} text is required`);
      }
    });

    const surveyRef = db.collection('surveys').doc();
    const survey = {
      id: surveyRef.id,
      title: title.trim(),
      description: description?.trim() || null,
      question: question.trim(),
      type: 'mcq',
      options: options.map((opt, index) => ({
        id: opt.id || `opt${index + 1}`,
        text: opt.text.trim(),
        order: opt.order || index + 1,
      })),
      isActive: true,
      showOnHomePage: false, // Only one can be active at a time
      targetAudience: targetAudience,
      expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(new Date(expiresAt)) : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await surveyRef.set(survey);

    return {
      id: surveyRef.id,
      ...survey,
    };
  } catch (error) {
    console.error('Error creating survey:', error);
    throw error;
  }
}

/**
 * Get all surveys
 * @param {Object} filters - Optional filters { isActive, showOnHomePage }
 * @returns {Promise<Array>} Array of surveys
 */
async function getAllSurveys(filters = {}) {
  try {
    let query = db.collection('surveys').orderBy('createdAt', 'desc');

    if (filters.isActive !== undefined) {
      query = query.where('isActive', '==', filters.isActive);
    }

    if (filters.showOnHomePage !== undefined) {
      query = query.where('showOnHomePage', '==', filters.showOnHomePage);
    }

    const snapshot = await query.get();
    const surveys = [];

    snapshot.forEach(doc => {
      surveys.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return surveys;
  } catch (error) {
    console.error('Error getting surveys:', error);
    throw error;
  }
}

/**
 * Get survey by ID
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object|null>} Survey object or null
 */
async function getSurveyById(surveyId) {
  try {
    const surveyDoc = await db.collection('surveys').doc(surveyId).get();

    if (!surveyDoc.exists) {
      return null;
    }

    return {
      id: surveyDoc.id,
      ...surveyDoc.data(),
    };
  } catch (error) {
    console.error('Error getting survey:', error);
    throw error;
  }
}

/**
 * Get active survey for home page (only one can be active)
 * @returns {Promise<Object|null>} Active survey or null
 */
async function getActiveHomePageSurvey() {
  try {
    const surveys = await getAllSurveys({ isActive: true, showOnHomePage: true });
    return surveys.length > 0 ? surveys[0] : null;
  } catch (error) {
    console.error('Error getting active home page survey:', error);
    throw error;
  }
}

/**
 * Update survey
 * @param {string} surveyId - Survey ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated survey
 */
async function updateSurvey(surveyId, updateData) {
  try {
    const surveyRef = db.collection('surveys').doc(surveyId);
    const surveyDoc = await surveyRef.get();

    if (!surveyDoc.exists) {
      throw new Error('Survey not found');
    }

    const updateFields = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updateData.title !== undefined) {
      updateFields.title = updateData.title.trim();
    }
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description?.trim() || null;
    }
    if (updateData.question !== undefined) {
      updateFields.question = updateData.question.trim();
    }
    if (updateData.options !== undefined) {
      if (!Array.isArray(updateData.options) || updateData.options.length < 2) {
        throw new Error('At least 2 options are required');
      }
      updateFields.options = updateData.options.map((opt, index) => ({
        id: opt.id || `opt${index + 1}`,
        text: opt.text.trim(),
        order: opt.order || index + 1,
      }));
    }
    if (updateData.isActive !== undefined) {
      updateFields.isActive = updateData.isActive;
    }
    if (updateData.showOnHomePage !== undefined) {
      updateFields.showOnHomePage = updateData.showOnHomePage;
      
      // If setting to show on home page, deactivate all others
      if (updateData.showOnHomePage === true) {
        await deactivateOtherHomePageSurveys(surveyId);
      }
    }
    if (updateData.targetAudience !== undefined) {
      updateFields.targetAudience = updateData.targetAudience;
    }
    if (updateData.expiresAt !== undefined) {
      updateFields.expiresAt = updateData.expiresAt 
        ? admin.firestore.Timestamp.fromDate(new Date(updateData.expiresAt))
        : null;
    }

    await surveyRef.update(updateFields);

    return await getSurveyById(surveyId);
  } catch (error) {
    console.error('Error updating survey:', error);
    throw error;
  }
}

/**
 * Deactivate other home page surveys (only one can be active)
 * @param {string} currentSurveyId - Current survey ID to keep active
 */
async function deactivateOtherHomePageSurveys(currentSurveyId) {
  try {
    const activeSurveys = await getAllSurveys({ showOnHomePage: true });
    
    const batch = db.batch();
    activeSurveys.forEach(survey => {
      if (survey.id !== currentSurveyId) {
        const surveyRef = db.collection('surveys').doc(survey.id);
        batch.update(surveyRef, {
          showOnHomePage: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    if (activeSurveys.length > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error deactivating other surveys:', error);
    throw error;
  }
}

/**
 * Delete survey (soft delete)
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} Deleted survey
 */
async function deleteSurvey(surveyId) {
  try {
    return await updateSurvey(surveyId, { isActive: false });
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw error;
  }
}

/**
 * Submit survey response
 * @param {string} userId - User ID
 * @param {string} surveyId - Survey ID
 * @param {string} selectedOptionId - Selected option ID
 * @returns {Promise<Object>} Response object
 */
async function submitSurveyResponse(userId, surveyId, selectedOptionId) {
  try {
    // Validate survey exists
    const survey = await getSurveyById(surveyId);
    if (!survey || !survey.isActive) {
      throw new Error('Survey not found or inactive');
    }

    // Validate option exists
    const option = survey.options.find(opt => opt.id === selectedOptionId);
    if (!option) {
      throw new Error('Invalid option selected');
    }

    // Check if user already responded
    const existingResponse = await getUserSurveyResponse(userId, surveyId);
    if (existingResponse) {
      throw new Error('User has already responded to this survey');
    }

    // Create response
    const responseRef = db
      .collection('users')
      .doc(userId)
      .collection('surveyResponses')
      .doc();
    
    const response = {
      id: responseRef.id,
      surveyId,
      userId,
      selectedOptionId,
      selectedOptionText: option.text,
      answeredAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await responseRef.set(response);

    return response;
  } catch (error) {
    console.error('Error submitting survey response:', error);
    throw error;
  }
}

/**
 * Get user's survey response
 * @param {string} userId - User ID
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object|null>} Response or null
 */
async function getUserSurveyResponse(userId, surveyId) {
  try {
    const responsesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('surveyResponses')
      .where('surveyId', '==', surveyId)
      .get();

    if (responsesSnapshot.empty) {
      return null;
    }

    const response = responsesSnapshot.docs[0];
    return {
      id: response.id,
      ...response.data(),
    };
  } catch (error) {
    console.error('Error getting user survey response:', error);
    throw error;
  }
}

/**
 * Get survey analytics
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} Analytics data
 */
async function getSurveyAnalytics(surveyId) {
  try {
    const survey = await getSurveyById(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Get all responses for this survey
    const allUsersSnapshot = await db.collection('users').get();
    const responses = [];
    
    for (const userDoc of allUsersSnapshot.docs) {
      const userResponse = await getUserSurveyResponse(userDoc.id, surveyId);
      if (userResponse) {
        responses.push(userResponse);
      }
    }

    // Calculate statistics
    const totalResponses = responses.length;
    const optionStats = {};

    survey.options.forEach(option => {
      optionStats[option.id] = {
        optionId: option.id,
        optionText: option.text,
        count: 0,
        percentage: 0,
      };
    });

    responses.forEach(response => {
      if (optionStats[response.selectedOptionId]) {
        optionStats[response.selectedOptionId].count++;
      }
    });

    // Calculate percentages
    Object.keys(optionStats).forEach(optionId => {
      if (totalResponses > 0) {
        optionStats[optionId].percentage = Math.round(
          (optionStats[optionId].count / totalResponses) * 100
        );
      }
    });

    return {
      surveyId,
      surveyTitle: survey.title,
      surveyQuestion: survey.question,
      totalResponses,
      optionStats: Object.values(optionStats),
      responses: responses.map(r => ({
        userId: r.userId,
        selectedOption: r.selectedOptionText,
        answeredAt: r.answeredAt,
      })),
    };
  } catch (error) {
    console.error('Error getting survey analytics:', error);
    throw error;
  }
}

/**
 * Get all survey responses for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of responses
 */
async function getUserSurveyResponses(userId) {
  try {
    const responsesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('surveyResponses')
      .orderBy('answeredAt', 'desc')
      .get();

    const responses = [];
    responsesSnapshot.forEach(doc => {
      responses.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return responses;
  } catch (error) {
    console.error('Error getting user survey responses:', error);
    throw error;
  }
}

module.exports = {
  createSurvey,
  getAllSurveys,
  getSurveyById,
  getActiveHomePageSurvey,
  updateSurvey,
  deleteSurvey,
  submitSurveyResponse,
  getUserSurveyResponse,
  getSurveyAnalytics,
  getUserSurveyResponses,
};
