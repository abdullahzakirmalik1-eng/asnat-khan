/**
 * Asnat Khan Studio — Authentication Input Validation
 * Shared form validation rules for login, registration, and password recovery.
 */

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 6,
  MIN_NAME_LENGTH: 2
};

/**
 * Validates an email address format.
 * @param {string} email
 * @returns {{ isValid: boolean, message: string }}
 */
export function validateEmail(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { isValid: false, message: 'Please enter your email address.' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid email address (e.g. you@example.com).' };
  }

  return { isValid: true, message: '' };
}

/**
 * Validates a password input against baseline requirements.
 * Note: Keeps requirements aligned with Firebase defaults without inventing arbitrary rules.
 * @param {string} password
 * @returns {{ isValid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password) {
    return { isValid: false, message: 'Please enter your password.' };
  }

  if (password.length < VALIDATION_RULES.MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      message: `Password must be at least ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters long.`
    };
  }

  return { isValid: true, message: '' };
}

/**
 * Validates that confirmation password matches the new password.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {{ isValid: boolean, message: string }}
 */
export function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword) {
    return { isValid: false, message: 'Please confirm your password.' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match. Please re-enter.' };
  }

  return { isValid: true, message: '' };
}

/**
 * Validates a customer's full name.
 * @param {string} name
 * @returns {{ isValid: boolean, message: string }}
 */
export function validateFullName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { isValid: false, message: 'Please enter your full name.' };
  }

  if (trimmed.length < VALIDATION_RULES.MIN_NAME_LENGTH) {
    return { isValid: false, message: 'Please enter your full name (at least 2 characters).' };
  }

  return { isValid: true, message: '' };
}
