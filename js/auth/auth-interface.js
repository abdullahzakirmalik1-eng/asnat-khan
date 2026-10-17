/**
 * Asnat Khan Studio — Authentication Interface & Contract
 * Provider: Firebase Authentication (to be connected in Phase 2)
 * 
 * This module defines the strict interface contract and integration boundary
 * that Firebase Authentication will satisfy in the next implementation step.
 * 
 * IMPORTANT: No fake authentication or mock sessions are created here.
 * The UI remains cleanly decoupled from the underlying identity provider.
 */

export class AuthIntegrationPendingError extends Error {
  constructor(message = 'Firebase Authentication will be connected in the next implementation step.') {
    super(message);
    this.name = 'AuthIntegrationPendingError';
    this.code = 'auth/provider-pending-configuration';
  }
}

/**
 * Checks whether Firebase Authentication has been initialized.
 * Returns false during Phase 1.
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  return false;
}

/**
 * Sign in with email and password.
 * To be fulfilled by Firebase: signInWithEmailAndPassword(auth, email, password)
 * 
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: Object }>}
 */
export async function signInWithEmail(email, password) {
  // Integration Boundary: Firebase will be connected in the next phase.
  throw new AuthIntegrationPendingError(
    'Firebase Authentication is scheduled for integration in the next step. Forms and UI are fully prepared.'
  );
}

/**
 * Create a new customer account.
 * To be fulfilled by Firebase: createUserWithEmailAndPassword(auth, email, password)
 * 
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: Object }>}
 */
export async function createAccount(fullName, email, password) {
  throw new AuthIntegrationPendingError(
    'Firebase Authentication is scheduled for integration in the next step. Account registration will connect directly to Firebase identity.'
  );
}

/**
 * Send a password reset email.
 * To be fulfilled by Firebase: sendPasswordResetEmail(auth, email)
 * 
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function requestPasswordReset(email) {
  throw new AuthIntegrationPendingError(
    'Password recovery service will be connected to Firebase Authentication in the next step.'
  );
}

/**
 * Confirm a password reset using the action code.
 * To be fulfilled by Firebase: confirmPasswordReset(auth, actionCode, newPassword)
 * 
 * @param {string} actionCode - The oobCode from the reset email link
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function confirmPasswordReset(actionCode, newPassword) {
  throw new AuthIntegrationPendingError(
    'Password update verification will be validated by Firebase in the next step.'
  );
}

/**
 * Verify password reset code validity.
 * To be fulfilled by Firebase: verifyPasswordResetCode(auth, actionCode)
 * 
 * @param {string} actionCode
 * @returns {Promise<string>} returns customer email
 */
export async function verifyResetCode(actionCode) {
  throw new AuthIntegrationPendingError(
    'Reset code verification will be handled by Firebase.'
  );
}

/**
 * Send email verification to the current user.
 * To be fulfilled by Firebase: sendEmailVerification(user)
 * 
 * @returns {Promise<void>}
 */
export async function sendEmailVerification() {
  throw new AuthIntegrationPendingError(
    'Email verification will be dispatched through Firebase Authentication in the next step.'
  );
}

/**
 * Check whether the current customer email is verified.
 * To be fulfilled by Firebase: user.reload(); return user.emailVerified;
 * 
 * @returns {Promise<boolean>}
 */
export async function checkEmailVerification() {
  return false;
}

/**
 * Sign out the current customer.
 * To be fulfilled by Firebase: signOut(auth)
 * 
 * @returns {Promise<void>}
 */
export async function signOut() {
  return;
}

/**
 * Observe authentication state changes.
 * To be fulfilled by Firebase: onAuthStateChanged(auth, callback)
 * 
 * @param {Function} callback - (user: Object | null) => void
 * @returns {Function} unsubscribe function
 */
export function onAuthStateChanged(callback) {
  // During Phase 1 (pre-Firebase), default state is null (unauthenticated).
  if (typeof callback === 'function') {
    setTimeout(() => callback(null), 0);
  }
  return () => {};
}
