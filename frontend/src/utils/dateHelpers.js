/**
 * Format Firestore timestamp to readable date string
 * Handles multiple Firestore timestamp formats
 * @param {any} timestamp - Firestore timestamp (can be object, string, Date, etc.)
 * @returns {string} Formatted date string or 'N/A'
 */
export const formatFirestoreDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    // If it's a string (ISO format)
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString();
    }
    
    // If it's a Firestore timestamp object with seconds
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    
    // If it's a Firestore timestamp object with _seconds
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000).toLocaleDateString();
    }
    
    // If it's a Firestore timestamp object with toDate method
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    
    // Try to convert directly
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error, timestamp);
    return 'N/A';
  }
};

/**
 * Format Firestore timestamp to readable date and time string
 * @param {any} timestamp - Firestore timestamp
 * @returns {string} Formatted date and time string or 'N/A'
 */
export const formatFirestoreDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    
    // If it's a string (ISO format)
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleString();
    }
    
    // If it's a Firestore timestamp object with seconds
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    
    // If it's a Firestore timestamp object with _seconds
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000).toLocaleString();
    }
    
    // If it's a Firestore timestamp object with toDate method
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    
    // Try to convert directly
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error, timestamp);
    return 'N/A';
  }
};
