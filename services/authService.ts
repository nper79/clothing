import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebaseConfig';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  photoURL?: string;
  anonymous: boolean;
}

export interface AuthService {
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  getCurrentUser(): Promise<AuthUser | null>;
}

class FirebaseAuthService implements AuthService {
  async signInWithGoogle(): Promise<AuthUser> {
    if (!isFirebaseConfigured()) {
      // Mock authentication for demo purposes
      const mockUser: AuthUser = {
        id: 'demo_user_' + Date.now(),
        email: 'demo@example.com',
        name: 'Demo User',
        photoURL: undefined,
        anonymous: false
      };

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockUser;
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        return {
          id: result.user.uid,
          email: result.user.email || undefined,
          name: result.user.displayName || undefined,
          photoURL: result.user.photoURL || undefined,
          anonymous: false
        };
      }
      throw new Error('Failed to authenticate with Google');
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    if (!isFirebaseConfigured()) {
      // Mock sign out
      console.log('Mock sign out performed');
      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (!isFirebaseConfigured()) {
      // Mock no user is signed in initially
      callback(null);
      return () => {}; // Return empty unsubscribe function
    }

    return onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        callback({
          id: user.uid,
          email: user.email || undefined,
          name: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          anonymous: false
        });
      } else {
        callback(null);
      }
    });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!isFirebaseConfigured()) {
      return null;
    }

    return new Promise((resolve) => {
      const unsubscribe = this.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
}

export const authService = new FirebaseAuthService();