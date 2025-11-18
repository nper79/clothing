// Novo serviço de autenticação Supabase
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseService';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  photoURL?: string;
  anonymous: boolean;
}

const mapUser = (user: User | null | undefined): AuthUser | null => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? undefined,
    name: (user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0],
    photoURL: (user.user_metadata?.avatar_url as string | undefined) || undefined,
    anonymous: false,
  };
};

class SupabaseAuthService {
  async signUpWithEmail(email: string, password: string, fullName?: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }

    const user = mapUser(data.user);
    if (!user) {
      throw new Error('Unable to create user account');
    }
    return user;
  }

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const user = mapUser(data.user);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  async signInWithGoogle(): Promise<void> {
    console.log('[SupabaseAuth] Starting Google OAuth sign in...');
    const redirectUrl = `${window.location.origin}`;
    console.log('[SupabaseAuth] Redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[SupabaseAuth] OAuth error:', error);
      throw error;
    }

    console.log('[SupabaseAuth] OAuth initiated successfully');
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(mapUser(session?.user));
    });

    return () => subscription.unsubscribe();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return mapUser(user);
  }
}

export const authService = new SupabaseAuthService();
