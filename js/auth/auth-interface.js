/**
 * Asnat Khan Studio — Authentication Interface & Contract
 * Provider: Firebase Authentication
 * 
 * Manages customer account sign-in, registration, password recovery,
 * email verification, and auth state listeners connected to Google Firebase.
 */

import { firebaseConfig, getFirebaseServices } from '../firebase-config.js';

export { firebaseConfig, getFirebaseServices };

export class AuthIntegrationPendingError extends Error {
  constructor(message = 'Firebase Authentication is configured and active.') {
    super(message);
    this.name = 'AuthIntegrationPendingError';
    this.code = 'auth/provider-pending-configuration';
  }
}

/**
 * Checks whether Firebase Authentication has been initialized.
 * Returns true now that valid Firebase credentials are provided.
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  return Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
}

/**
 * Returns a human-friendly studio error message for Firebase Auth error codes.
 * @param {Error|Object} error
 * @returns {string}
 */
export function getFriendlyAuthErrorMessage(error) {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address format is invalid. Please double-check your entry.';
    case 'auth/user-disabled':
      return 'This studio account has been deactivated. Please contact Asnat Khan for assistance.';
    case 'auth/user-not-found':
      return 'No studio account was found with this email. Please check your spelling or create a new account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials or reset your password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with a combination of letters and numbers.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is pending activation in the Firebase Console. Please verify Authentication settings.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access has been temporarily paused for your security. Please try again in a few moments or reset your password.';
    case 'auth/expired-action-code':
      return 'This password reset link has expired. Please request a new recovery link.';
    case 'auth/invalid-action-code':
      return 'This recovery link is invalid or has already been used. Please request a new link.';
    case 'auth/requires-recent-login':
      return 'For your security, please sign in again before performing this sensitive operation.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connectivity and try again.';
    default:
      return error.message || 'Unable to complete authentication. Please try again.';
  }
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: Object }>}
 */
export async function signInWithEmail(email, password) {
  if (!isFirebaseConfigured()) {
    throw new AuthIntegrationPendingError();
  }

  const { auth, authFunctions } = await getFirebaseServices();
  const credential = await authFunctions.signInWithEmailAndPassword(auth, email.trim(), password);
  return { user: credential.user };
}

/**
 * Create a new customer account.
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: Object }>}
 */
export async function createAccount(fullName, email, password) {
  if (!isFirebaseConfigured()) {
    throw new AuthIntegrationPendingError();
  }

  const { auth, authFunctions } = await getFirebaseServices();
  const credential = await authFunctions.createUserWithEmailAndPassword(auth, email.trim(), password);

  if (fullName && fullName.trim() && authFunctions.updateProfile) {
    try {
      await authFunctions.updateProfile(credential.user, {
        displayName: fullName.trim()
      });
    } catch (e) {
      console.warn('Could not set displayName on Firebase user profile:', e);
    }
  }

  return { user: credential.user };
}

/**
 * Send a password reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function requestPasswordReset(email) {
  if (!isFirebaseConfigured()) {
    throw new AuthIntegrationPendingError();
  }

  const { auth, authFunctions } = await getFirebaseServices();
  await authFunctions.sendPasswordResetEmail(auth, email.trim());
}

/**
 * Confirm a password reset using the action code.
 * @param {string} actionCode - The oobCode from the reset email link
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function confirmPasswordReset(actionCode, newPassword) {
  if (!isFirebaseConfigured()) {
    throw new AuthIntegrationPendingError();
  }

  const { auth, authFunctions } = await getFirebaseServices();
  await authFunctions.confirmPasswordReset(auth, actionCode, newPassword);
}

/**
 * Verify password reset code validity.
 * @param {string} actionCode
 * @returns {Promise<string>} returns customer email
 */
export async function verifyResetCode(actionCode) {
  if (!isFirebaseConfigured()) {
    throw new AuthIntegrationPendingError();
  }

  const { auth, authFunctions } = await getFirebaseServices();
  return await authFunctions.verifyPasswordResetCode(auth, actionCode);
}

/**
 * Send email verification to the current user.
 * @returns {Promise<void>}
 */
export async function sendEmailVerification() {
  if (!isFirebaseConfigured()) {
    throw new AuthIntegrationPendingError();
  }

  const { auth, authFunctions } = await getFirebaseServices();
  if (!auth.currentUser) {
    throw new Error('No authenticated customer session found. Please sign in to verify your email.');
  }

  await authFunctions.sendEmailVerification(auth.currentUser);
}

/**
 * Check whether the current customer email is verified.
 * @returns {Promise<boolean>}
 */
export async function checkEmailVerification() {
  if (!isFirebaseConfigured()) return false;

  const { auth } = await getFirebaseServices();
  if (!auth.currentUser) return false;

  try {
    await auth.currentUser.reload();
  } catch (e) {
    // If reload fails, fall back to current cached property
  }

  return Boolean(auth.currentUser.emailVerified);
}

/**
 * Sign out the current customer.
 * @returns {Promise<void>}
 */
export async function signOut() {
  if (!isFirebaseConfigured()) return;

  const { auth, authFunctions } = await getFirebaseServices();
  await authFunctions.signOut(auth);
}

/**
 * Get current authenticated Firebase user synchronously or null.
 * @returns {Object|null}
 */
export function getCurrentUser() {
  try {
    // If services resolved
    const { auth } = getFirebaseServices();
    return auth ? auth.currentUser : null;
  } catch {
    return null;
  }
}

/**
 * Observe authentication state changes.
 * @param {Function} callback - (user: Object | null) => void
 * @returns {Function} unsubscribe function
 */
export function onAuthStateChanged(callback) {
  let unsubscribeFn = () => {};

  getFirebaseServices().then(({ auth, authFunctions }) => {
    unsubscribeFn = authFunctions.onAuthStateChanged(auth, (user) => {
      if (typeof callback === 'function') {
        callback(user);
      }
    });
  }).catch(err => {
    console.error('Firebase Auth listener initialization error:', err);
    if (typeof callback === 'function') {
      callback(null);
    }
  });

  return () => {
    if (typeof unsubscribeFn === 'function') {
      unsubscribeFn();
    }
  };
}
