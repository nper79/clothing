# Guia de Migração: Firebase Auth → Supabase Auth

## Passo 1 - Configurar Supabase Auth

### 1.1 Ativar Google Auth no Supabase:
1. Vai ao [Dashboard Supabase](https://supabase.com/dashboard)
2. Authentication → Providers → Google
3. Enable Google provider
4. Adicionar:
   - **Client ID**: Do Google Cloud Console
   - **Client Secret**: Do Google Cloud Console
   - **Redirect URL**: `https://[your-project].supabase.co/auth/v1/callback`

### 1.2 Obter credenciais Google:
1. Vai a [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Create Credentials → OAuth 2.0 Client ID
4. Authorized redirect URI: `https://[your-project].supabase.co/auth/v1/callback`

## Passo 2 - Substituir Código de Autenticação

### 2.1 Novo Supabase Auth Service:

```typescript
// services/supabaseAuthService.ts
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
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) throw error

      // O redirect handle vai capturar o resultado
      throw new Error('OAuth redirect initiated')
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
```

### 2.2 Atualizar AuthContext:

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '../services/supabaseAuthService'; // Mudar aqui

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    // Handle OAuth redirect
    const handleRedirect = async () => {
      const hash = window.location.hash;
      if (hash.includes('access_token')) {
        const { data, error } = await supabase.auth.getSession();
        if (data.session?.user) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || undefined,
            name: data.session.user.user_metadata?.full_name,
            photoURL: data.session.user.user_metadata?.avatar_url,
            anonymous: false
          });
        }
      }
    };

    handleRedirect();

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Passo 3 - Atualizar Componentes

### 3.1 Remover Firebase dos imports:

```typescript
// Remover estes imports:
// import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
// import { auth } from './firebaseConfig';

// Substituir por:
import { supabase } from './supabaseService';
```

### 3.2 Atualizar App.tsx:

```typescript
// Antes (Firebase):
const userId = user?.id || getUserId();

// Depois (Supabase):
const userId = user?.id || getUserId(); // Mesma lógica, mas agora user.id vem do Supabase
```

## Passo 4 - Configurar OAuth Handler

### 4.1 Adicionar Auth Provider no main component:

```typescript
// App.tsx ou index.tsx
import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### 4.2 Adicionar redirect handler no useEffect:

```typescript
// Em App.tsx ou componente principal
useEffect(() => {
  // Handle OAuth redirect after Google login
  const handleAuthRedirect = async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session?.user) {
        // User está logado - redirecionar para dashboard
        window.location.hash = '';
      }
    }
  };

  handleAuthRedirect();
}, []);
```

## Passo 5 - Testar a Migração

### 5.1 Checklist de Testes:
- [ ] Google login funciona
- [ ] User profile data é carregado corretamente
- [ ] Sign out funciona
- [ ] Persistência de sessão
- [ ] Protected routes funcionam
- [ ] Feedback system usa user ID correto

### 5.2 Debug de Problemas Comuns:

```typescript
// Adicionar logging para debug
console.log('Auth state changed:', { user, session });

// Verificar se userId está correto
console.log('Current userId:', userId);

// Verificar se RLS policies funcionam
const { data, error } = await supabase
  .from('user_profile')
  .select('*')
  .eq('user_id', userId);
```

## Passo 6 - Limpar Firebase (Opcional)

### 6.1 Remover dependências:
```bash
npm uninstall firebase
```

### 6.2 Remover arquivos Firebase:
- `firebaseConfig.ts`
- `services/authService.ts` (versão Firebase)

## Tempo Estimado de Migração

- **Setup Supabase Auth**: 30 minutos
- **Substituir código**: 2-3 horas
- **Testes**: 1 hora
- **Total**: **~4 horas**

## Benefícios da Migração

✅ **User ID real** vs gerado localmente
✅ **RLS policies funcionam** corretamente
✅ **Dados seguros** e isolados por utilizador
✅ **Integração completa** com Supabase
✅ **Menos código** para manter
✅ **Dashboard unificado**