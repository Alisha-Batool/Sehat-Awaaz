import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

function getStoredUser() {
  const storedBackendUser = localStorage.getItem('user');
  if (!localStorage.getItem('accessToken') || !storedBackendUser) {
    localStorage.removeItem('user');
    localStorage.removeItem('sehat_user');
    return null;
  }

  try {
    const user = JSON.parse(storedBackendUser);
    if (!user?.userId || user.isDemo) {
      localStorage.removeItem('user');
      localStorage.removeItem('sehat_user');
      return null;
    }
    localStorage.removeItem('sehat_user');
    return user;
  } catch (error) {
    console.error('Could not read the saved Sehat Awaaz user profile', error);
    localStorage.removeItem('user');
    return null;
  }
}

function persistUserSession(data) {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.removeItem('sehat_user');
  const userData = {
    userId: data.userId,
    email: data.email,
    name: data.name || '',
    isGuest: false,
  };
  localStorage.setItem('user', JSON.stringify(userData));
  return userData;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  const login = useCallback(async (phone) => {
    const { data } = await authApi.sendOTP(phone);
    return data;
  }, []);

  const verify = useCallback(async (phone, otp) => {
    const { data } = await authApi.verifyOTP(phone, otp);
    const userData = persistUserSession(data);
    setUser(userData);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authApi.register(name, email, password);
    return data;
  }, []);

  const verifyEmail = useCallback(async (token) => {
    const { data } = await authApi.verifyEmail(token);
    return data;
  }, []);

  const resendVerification = useCallback(async (email) => {
    const { data } = await authApi.resendVerification(email);
    return data;
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    const { data } = await authApi.requestPasswordReset(email);
    return data;
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    const { data } = await authApi.resetPassword(token, password);
    return data;
  }, []);

  const passwordLogin = useCallback(async (email, password) => {
    const { data } = await authApi.passwordLogin(email, password);
    const userData = persistUserSession(data);
    setUser(userData);
    return data;
  }, []);

  const guestLogin = useCallback(async () => {
    const { data } = await authApi.guest();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const userData = { userId: data.guestId, isGuest: true };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sehat_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      verify,
      register,
      passwordLogin,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      guestLogin,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
