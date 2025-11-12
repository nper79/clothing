import React, { createContext, useContext, ReactNode } from 'react';

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
  // Create mock user for testing
  const mockUser: AuthUser = {
    id: 'test-user-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    name: 'Test User',
    photoURL: undefined,
    anonymous: false
  };

  const signInWithGoogle = async () => {
    console.log('Mock sign in - no actual authentication');
  };

  const signOut = async () => {
    console.log('Mock sign out - no actual authentication');
  };

  const value = {
    user: mockUser,
    loading: false,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};