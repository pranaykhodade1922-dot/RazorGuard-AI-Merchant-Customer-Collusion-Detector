import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from '../firebase';
import { verifyRoleRegistration, fetchCurrentUser } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('LOADING'); // 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'
  const [authError, setAuthError] = useState(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);

  useEffect(() => {
    // Check local fallback session first for instant offline/dev support
    const savedLocalUser = localStorage.getItem('razorguard_auth_user');

    if (!auth) {
      if (savedLocalUser) {
        try {
          const parsed = JSON.parse(savedLocalUser);
          setUser({
            ...parsed,
            getIdToken: async () => parsed.token || 'dev-local-session-token'
          });
          setAuthState('AUTHENTICATED');
        } catch {
          setUser(null);
          setAuthState('UNAUTHENTICATED');
        }
      } else {
        setUser(null);
        setAuthState('UNAUTHENTICATED');
      }
      return;
    }

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          let idToken = '';
          try {
            idToken = await firebaseUser.getIdToken();
          } catch (e) {
            console.warn('Failed retrieving Firebase ID token:', e);
          }

          // Temporarily save session payload to allow authFetch headers
          localStorage.setItem('razorguard_auth_user', JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
            photoURL: firebaseUser.photoURL || null,
            role: 'ANALYST',
            token: idToken || 'dev-local-session-token'
          }));

          // Query backend for server-authoritative user role
          let role = null;
          try {
            const serverProfile = await fetchCurrentUser();
            if (serverProfile && serverProfile.role) {
              role = serverProfile.role;
            }
          } catch (err) {
            console.warn('Failed fetching server profile in onAuthStateChanged:', err);
          }

          if (!role) {
            const storedRole = localStorage.getItem(`user_role_${firebaseUser.uid}`);
            if (storedRole) role = storedRole;
          }

          if (!role) {
            setPendingGoogleUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
              photoURL: firebaseUser.photoURL || null,
              token: idToken
            });
            setUser(null);
            setAuthState('UNAUTHENTICATED');
            return;
          }

          localStorage.setItem(`user_role_${firebaseUser.uid}`, role);

          const userObj = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
            photoURL: firebaseUser.photoURL || null,
            role: role,
            token: idToken,
            getIdToken: async (forceRefresh = false) => {
              try {
                return await firebaseUser.getIdToken(forceRefresh);
              } catch {
                return idToken || 'dev-local-session-token';
              }
            }
          };

          setUser(userObj);
          setAuthState('AUTHENTICATED');
          localStorage.setItem('razorguard_auth_user', JSON.stringify({
            uid: userObj.uid,
            email: userObj.email,
            displayName: userObj.displayName,
            photoURL: userObj.photoURL,
            role: userObj.role,
            token: idToken || 'dev-local-session-token'
          }));
        } else if (savedLocalUser) {
          try {
            const parsed = JSON.parse(savedLocalUser);
            setUser({
              ...parsed,
              getIdToken: async () => parsed.token || 'dev-local-session-token'
            });
            setAuthState('AUTHENTICATED');
          } catch {
            setUser(null);
            setAuthState('UNAUTHENTICATED');
          }
        } else {
          setUser(null);
          setAuthState('UNAUTHENTICATED');
        }
      });
    } catch (err) {
      console.warn('onAuthStateChanged subscription error:', err);
      if (savedLocalUser) {
        try {
          const parsed = JSON.parse(savedLocalUser);
          setUser({ ...parsed, getIdToken: async () => parsed.token || 'dev-local-session-token' });
          setAuthState('AUTHENTICATED');
        } catch {
          setUser(null);
          setAuthState('UNAUTHENTICATED');
        }
      } else {
        setUser(null);
        setAuthState('UNAUTHENTICATED');
      }
    }

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    if (!auth) {
      const role = email.toLowerCase().includes('merchant')
        ? 'MERCHANT'
        : email.toLowerCase().includes('analyst')
        ? 'ANALYST'
        : 'ADMIN';
      const name = email.split('@')[0].replace('.', ' ');
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      const fallbackUser = {
        uid: `local-${Date.now()}`,
        email,
        displayName: formattedName || 'Investigator',
        role: role,
        token: 'dev-local-session-token',
        getIdToken: async () => 'dev-local-session-token'
      };
      setUser(fallbackUser);
      setAuthState('AUTHENTICATED');
      localStorage.setItem('razorguard_auth_user', JSON.stringify(fallbackUser));
      return fallbackUser;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken();

      // Temporarily store token so fetchCurrentUser authFetch gets Bearer token
      localStorage.setItem('razorguard_auth_user', JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fbUser.email.split('@')[0],
        photoURL: fbUser.photoURL || null,
        role: 'ANALYST',
        token: idToken
      }));

      // Fetch server-authoritative role from backend /api/auth/me
      let role = null;
      try {
        const serverProfile = await fetchCurrentUser();
        if (serverProfile && serverProfile.role) {
          role = serverProfile.role;
        }
      } catch (err) {
        console.warn('Backend profile fetch failed during login:', err);
      }

      if (!role) {
        const storedRole = localStorage.getItem(`user_role_${fbUser.uid}`);
        if (storedRole) role = storedRole;
      }

      if (!role) {
        role = 'ANALYST';
      }

      localStorage.setItem(`user_role_${fbUser.uid}`, role);

      const userObj = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fbUser.email.split('@')[0],
        photoURL: fbUser.photoURL || null,
        role: role,
        token: idToken,
        getIdToken: async () => idToken
      };

      setUser(userObj);
      setAuthState('AUTHENTICATED');
      console.log('LOGIN USER FROM SERVER:', { email: userObj.email, role: userObj.role, isAdmin: userObj.role === 'ADMIN' });
      localStorage.setItem('razorguard_auth_user', JSON.stringify({
        uid: userObj.uid,
        email: userObj.email,
        displayName: userObj.displayName,
        photoURL: userObj.photoURL,
        role: userObj.role,
        token: idToken
      }));
      return userObj;
    } catch (err) {
      // Local fallback mode if Firebase credentials are unseeded or demo account
      if (!auth || err.code === 'auth/invalid-api-key' || err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key')) {
        const role = email.toLowerCase().includes('merchant')
          ? 'MERCHANT'
          : email.toLowerCase().includes('analyst')
          ? 'ANALYST'
          : 'ADMIN';
        const name = email.split('@')[0].replace('.', ' ');
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        const fallbackUser = {
          uid: `local-${Date.now()}`,
          email,
          displayName: formattedName || 'Investigator',
          role: role,
          token: 'dev-local-session-token',
          getIdToken: async () => 'dev-local-session-token'
        };
        setUser(fallbackUser);
        setAuthState('AUTHENTICATED');
        localStorage.setItem('razorguard_auth_user', JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      setAuthError(err.message || 'Authentication failed');
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    if (!auth) {
      const msg = 'Firebase authentication client is uninitialized. Please configure VITE_FIREBASE_API_KEY.';
      setAuthError(msg);
      throw new Error(msg);
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken();

      // Temporarily store token so fetchCurrentUser authFetch gets Bearer token
      localStorage.setItem('razorguard_auth_user', JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fbUser.email.split('@')[0],
        photoURL: fbUser.photoURL || null,
        role: 'ANALYST',
        token: idToken
      }));

      // Query server-authoritative user profile from backend /api/auth/me
      let role = null;
      try {
        const serverProfile = await fetchCurrentUser();
        if (serverProfile && serverProfile.role) {
          role = serverProfile.role;
        }
      } catch (err) {
        console.warn('Backend profile fetch failed during Google login:', err);
      }

      if (!role) {
        const storedRole = localStorage.getItem(`user_role_${fbUser.uid}`);
        if (storedRole) role = storedRole;
      }

      // If user already has a saved or server role, complete sign in immediately
      if (role) {
        localStorage.setItem(`user_role_${fbUser.uid}`, role);

        const userObj = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
          photoURL: fbUser.photoURL || null,
          role: role,
          token: idToken,
          getIdToken: async () => idToken
        };

        setUser(userObj);
        setAuthState('AUTHENTICATED');
        localStorage.setItem('razorguard_auth_user', JSON.stringify({
          uid: userObj.uid,
          email: userObj.email,
          displayName: userObj.displayName,
          photoURL: userObj.photoURL,
          role: userObj.role,
          token: idToken
        }));
        return userObj;
      }

      // New Google User without configured role: Require explicit role selection
      const pendingData = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
        photoURL: fbUser.photoURL || null,
        token: idToken
      };
      setPendingGoogleUser(pendingData);
      return { pendingRoleSetup: true, email: fbUser.email };
    } catch (err) {
      let friendlyMsg = err.message || 'Google authentication failed.';
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        friendlyMsg = 'Google sign-in was cancelled.';
      } else if (err.code === 'auth/popup-blocked') {
        friendlyMsg = 'Google sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        friendlyMsg = 'An account already exists with the same email address using a different sign-in method.';
      } else if (err.code === 'auth/invalid-api-key' || err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key')) {
        friendlyMsg = 'Firebase API Key is invalid or unconfigured. Please configure VITE_FIREBASE_API_KEY in your environment.';
      }
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const completeGoogleRegistration = async (selectedRole) => {
    if (!pendingGoogleUser) {
      throw new Error('No pending Google sign-in session found.');
    }
    setAuthError(null);

    // Verify admin role authorization with backend if ADMIN is selected
    if (selectedRole === 'ADMIN') {
      try {
        await verifyRoleRegistration(pendingGoogleUser.email, 'ADMIN');
      } catch (err) {
        setAuthError(err.message || 'Unauthorized to create ADMIN account.');
        throw err;
      }
    }

    const role = selectedRole === 'ADMIN' ? 'ADMIN' : (selectedRole === 'MERCHANT' ? 'MERCHANT' : 'ANALYST');
    localStorage.setItem(`user_role_${pendingGoogleUser.uid}`, role);

    const userObj = {
      uid: pendingGoogleUser.uid,
      email: pendingGoogleUser.email,
      displayName: pendingGoogleUser.displayName,
      photoURL: pendingGoogleUser.photoURL,
      role: role,
      token: pendingGoogleUser.token,
      getIdToken: async () => pendingGoogleUser.token
    };

    setUser(userObj);
    setAuthState('AUTHENTICATED');
    setPendingGoogleUser(null);
    localStorage.setItem('razorguard_auth_user', JSON.stringify({
      uid: userObj.uid,
      email: userObj.email,
      displayName: userObj.displayName,
      photoURL: userObj.photoURL,
      role: userObj.role,
      token: userObj.token
    }));
    return userObj;
  };

  const cancelGoogleRegistration = () => {
    setPendingGoogleUser(null);
    setAuthError(null);
  };

  const register = async (name, email, password, role = 'ANALYST') => {
    setAuthError(null);

    // Verify backend role authorization if ADMIN role is selected
    if (role === 'ADMIN') {
      try {
        await verifyRoleRegistration(email, 'ADMIN');
      } catch (err) {
        setAuthError(err.message || 'Unauthorized to create ADMIN account.');
        throw err;
      }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      await updateProfile(fbUser, { displayName: name });
      const idToken = await fbUser.getIdToken();

      localStorage.setItem(`user_role_${fbUser.uid}`, role);

      const userObj = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: name,
        photoURL: null,
        role: role,
        token: idToken,
        getIdToken: async () => idToken
      };

      setUser(userObj);
      setAuthState('AUTHENTICATED');
      localStorage.setItem('razorguard_auth_user', JSON.stringify({
        uid: userObj.uid,
        email: userObj.email,
        displayName: name,
        photoURL: null,
        role: role,
        token: idToken
      }));
      return userObj;
    } catch (err) {
      if (err.code === 'auth/invalid-api-key' || err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key')) {
        const fallbackUser = {
          uid: `local-${Date.now()}`,
          email,
          displayName: name,
          photoURL: null,
          role: role,
          token: 'dev-local-session-token',
          getIdToken: async () => 'dev-local-session-token'
        };
        setUser(fallbackUser);
        setAuthState('AUTHENTICATED');
        localStorage.setItem('razorguard_auth_user', JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setUser(null);
    setPendingGoogleUser(null);
    setAuthState('UNAUTHENTICATED');
    localStorage.removeItem('razorguard_auth_user');
  };

  const getToken = async () => {
    if (user && typeof user.getIdToken === 'function') {
      return await user.getIdToken();
    }
    return user?.token || 'dev-local-session-token';
  };

  return (
    <AuthContext.Provider value={{
      user,
      authState,
      authError,
      pendingGoogleUser,
      login,
      loginWithGoogle,
      signInWithGoogle: loginWithGoogle,
      completeGoogleRegistration,
      cancelGoogleRegistration,
      register,
      logout,
      getToken,
      isAuthenticated: authState === 'AUTHENTICATED',
      isLoading: authState === 'LOADING',
      isAdmin: user?.role === 'ADMIN',
      isAnalyst: user?.role === 'ANALYST',
      isMerchant: user?.role === 'MERCHANT',
      userRole: user?.role || 'ANALYST'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
