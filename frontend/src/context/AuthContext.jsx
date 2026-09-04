import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('LOADING'); // 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'
  const [authError, setAuthError] = useState(null);

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

          const role = localStorage.getItem(`user_role_${firebaseUser.uid}`) || 'ADMIN';
          const userObj = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
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
      const role = email.toLowerCase().includes('analyst') ? 'ANALYST' : 'ADMIN';
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
      const role = localStorage.getItem(`user_role_${fbUser.uid}`) || (email.toLowerCase().includes('admin') ? 'ADMIN' : 'ANALYST');
      
      const userObj = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || email.split('@')[0],
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
        role: userObj.role,
        token: idToken
      }));
      return userObj;
    } catch (err) {
      // Local fallback mode if Firebase credentials are unseeded or demo account
      if (!auth || err.code === 'auth/invalid-api-key' || err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key')) {
        const role = email.toLowerCase().includes('analyst') ? 'ANALYST' : 'ADMIN';
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

  const register = async (name, email, password, role = 'ANALYST') => {
    setAuthError(null);
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
      login,
      register,
      logout,
      getToken,
      isAuthenticated: authState === 'AUTHENTICATED',
      isLoading: authState === 'LOADING',
      isAdmin: user?.role === 'ADMIN'
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
