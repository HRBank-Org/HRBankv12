/**
 * Extract user-friendly error message from API error response
 * Handles different error formats from backend (string, array, object)
 */
export const extractErrorMessage = (error, defaultMessage = 'An error occurred') => {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Try to get detail from axios error response
  const errorDetail = error?.response?.data?.detail || error?.detail;

  // If errorDetail is a string
  if (typeof errorDetail === 'string') {
    return errorDetail;
  }

  // If errorDetail is an array (Pydantic validation errors)
  if (Array.isArray(errorDetail)) {
    return errorDetail
      .map(err => {
        if (typeof err === 'string') return err;
        if (err.msg) return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`;
        if (err.message) return err.message;
        return String(err);
      })
      .join('; ');
  }

  // If errorDetail is an object
  if (errorDetail && typeof errorDetail === 'object') {
    if (errorDetail.msg) return errorDetail.msg;
    if (errorDetail.message) return errorDetail.message;
    return JSON.stringify(errorDetail);
  }

  // Try error.message
  if (error?.message) {
    return error.message;
  }

  // Fallback to default message
  return defaultMessage;
};

/**
 * Display error in console for debugging
 */
export const logError = (context, error) => {
  console.error(`[${context}]`, error);
  if (error?.response) {
    console.error('Response data:', error.response.data);
    console.error('Response status:', error.response.status);
  }
};
