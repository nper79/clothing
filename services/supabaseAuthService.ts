// Novo serviço de autenticação Supabase
import { supabase } from './supabaseService'
import type { AuthUser } from '../types'

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

class SupabaseAuthService implements AuthService {
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) throw error

      // OAuth redirect vai acontecer
      throw new Error('Redirecting to Google OAuth...')
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const user: AuthUser = {
            id: session.user.id,
            email: session.user.email || undefined,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            photoURL: session.user.user_metadata?.avatar_url,
            anonymous: false
          }
          callback(user)
        } else {
          callback(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return null

      return {
        id: user.id,
        email: user.email || undefined,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        photoURL: user.user_metadata?.avatar_url,
        anonymous: false
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }
}

export const authService = new SupabaseAuthService()