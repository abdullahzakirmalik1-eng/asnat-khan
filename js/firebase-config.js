/**
 * Asnat Khan Studio — Firebase Client Configuration & Service Initializer
 * 
 * Supports both modern browser environments (via Google CDN ES modules)
 * and Node.js testing/server environments (via installed npm package).
 */

export const firebaseConfig = {
  apiKey: "AIzaSyBNHfp5gzjQ4UY0N3XgR-eqoRQ1GSUF37M",
  authDomain: "asnat-khan.firebaseapp.com",
  projectId: "asnat-khan",
  storageBucket: "asnat-khan.firebasestorage.app",
  messagingSenderId: "36945774036",
  appId: "1:36945774036:web:85c7afa93b95e4c8a68241",
  measurementId: "G-5EF4ELNZT1"
};

let appInstance = null;
let authInstance = null;
let analyticsInstance = null;
let authFunctions = null;
let initPromise = null;

/**
 * Dynamically resolves Firebase App and Auth modules according to the execution context.
 * In browser: uses official Google CDN ES modules (zero build step needed).
 * In Node: uses npm 'firebase/app' and 'firebase/auth'.
 */
export async function getFirebaseServices() {
  if (appInstance && authInstance && authFunctions) {
    return {
      app: appInstance,
      auth: authInstance,
      analytics: analyticsInstance,
      authFunctions
    };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let initializeApp, getApps;
    let getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword;
    let sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode;
    let sendEmailVerification, signOut, onAuthStateChanged, updateProfile;
    let getAnalytics = null;

    if (typeof window === 'undefined') {
      // Node.js environment: load from installed npm modules using variable specifiers
      const appPkg = 'firebase/app';
      const authPkg = 'firebase/auth';
      const appModule = await import(appPkg);
      const authModule = await import(authPkg);

      initializeApp = appModule.initializeApp;
      getApps = appModule.getApps;

      getAuth = authModule.getAuth;
      signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
      createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
      sendPasswordResetEmail = authModule.sendPasswordResetEmail;
      confirmPasswordReset = authModule.confirmPasswordReset;
      verifyPasswordResetCode = authModule.verifyPasswordResetCode;
      sendEmailVerification = authModule.sendEmailVerification;
      signOut = authModule.signOut;
      onAuthStateChanged = authModule.onAuthStateChanged;
      updateProfile = authModule.updateProfile;
    } else {
      // Browser environment: load directly from Google CDN ES modules
      const cdnBase = 'https://www.gstatic.com/firebasejs/10.12.2';
      const appModule = await import(/* webpackIgnore: true */ `${cdnBase}/firebase-app.js`);
      const authModule = await import(/* webpackIgnore: true */ `${cdnBase}/firebase-auth.js`);

      initializeApp = appModule.initializeApp;
      getApps = appModule.getApps;

      getAuth = authModule.getAuth;
      signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
      createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
      sendPasswordResetEmail = authModule.sendPasswordResetEmail;
      confirmPasswordReset = authModule.confirmPasswordReset;
      verifyPasswordResetCode = authModule.verifyPasswordResetCode;
      sendEmailVerification = authModule.sendEmailVerification;
      signOut = authModule.signOut;
      onAuthStateChanged = authModule.onAuthStateChanged;
      updateProfile = authModule.updateProfile;

      try {
        const analyticsModule = await import(/* webpackIgnore: true */ `${cdnBase}/firebase-analytics.js`);
        getAnalytics = analyticsModule.getAnalytics;
      } catch (e) {
        // Analytics is non-critical
      }
    }

    const existing = getApps ? getApps() : [];
    appInstance = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);

    if (getAnalytics && typeof window !== 'undefined') {
      try {
        analyticsInstance = getAnalytics(appInstance);
      } catch (e) {
        // Ignore analytics initialization errors in offline/local dev
      }
    }

    authFunctions = {
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      sendPasswordResetEmail,
      confirmPasswordReset,
      verifyPasswordResetCode,
      sendEmailVerification,
      signOut,
      onAuthStateChanged,
      updateProfile
    };

    return {
      app: appInstance,
      auth: authInstance,
      analytics: analyticsInstance,
      authFunctions
    };
  })();

  return initPromise;
}

// Eagerly initiate initialization
getFirebaseServices().catch(() => {});
