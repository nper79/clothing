import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  photoURL?: string;
  anonymous: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'wardrobe_auth_user';

const readStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const persistUser = (value: AuthUser | null) => {
    if (typeof window === 'undefined') return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signInWithGoogle = async () => {
    const existing = readStoredUser();
    if (existing) {
      setUser(existing);
      return;
    }

    const mockUser: AuthUser = {
      id: 'user-' + Math.random().toString(36).slice(2),
      email: 'test@example.com',
      name: 'Wardrobe User',
      photoURL: undefined,
      anonymous: false,
    };
    persistUser(mockUser);
    setUser(mockUser);
  };

  const signOut = async () => {
    persistUser(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
