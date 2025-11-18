import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService, type AuthUser } from '../services/supabaseAuthService';
import { CreditClient, type CreditPack } from '../services/creditClient';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  credits: number | null;
  creditPacks: CreditPack[];
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  purchaseCredits: (packId: string) => Promise<{ balance: number }>;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemoSession, setUseDemoSession] = useState(false);

  const fetchBalance = useCallback(
    async (targetUser?: AuthUser | null) => {
      const currentUser = targetUser ?? user;
      if (!currentUser) {
        setCredits(null);
        return null;
      }

      try {
        const balance = await CreditClient.getBalance(currentUser.id);
        setCredits(balance);
        return balance;
      } catch (error) {
        console.error('Failed to load credits', error);
        setCredits(null);
        return null;
      }
    },
    [user]
  );

  useEffect(() => {
    let mounted = true;

    const loadInitialUser = async () => {
      if (useDemoSession) {
        setLoading(false);
        return;
      }
      try {
        const currentUser = await authService.getCurrentUser();
        if (!mounted) return;
        setUser(currentUser);
        await fetchBalance(currentUser);
      } catch (error) {
        console.error('Failed to load current user', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialUser();

    const unsubscribe = useDemoSession
      ? () => {}
      : authService.onAuthStateChanged(async (nextUser) => {
          if (!mounted) return;
          setUser(nextUser);
          if (nextUser) {
            await fetchBalance(nextUser);
          } else {
            setCredits(null);
          }
        });

    CreditClient.listPacks()
      .then((packs) => {
        if (mounted) {
          setCreditPacks(packs);
        }
      })
      .catch((error) => {
        console.warn('Unable to load credit packs', error);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [fetchBalance, useDemoSession]);

  const refreshCredits = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setLoading(true);
      try {
        const createdUser = await authService.signUpWithEmail(email, password, fullName);
        setUseDemoSession(false);
        setUser(createdUser);
        await fetchBalance(createdUser);
      } finally {
        setLoading(false);
      }
    },
    [fetchBalance]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const signedIn = await authService.signInWithEmail(email, password);
        setUseDemoSession(false);
        setUser(signedIn);
        await fetchBalance(signedIn);
      } finally {
        setLoading(false);
      }
    },
    [fetchBalance]
  );

  const signInWithGoogle = useCallback(async () => {
    setUseDemoSession(false);
    await authService.signInWithGoogle();
  }, []);

  const signInAsDemo = useCallback(async () => {
    setUseDemoSession(true);
    const demoUser: AuthUser = {
      id: `demo_${Date.now()}`,
      email: 'demo@example.com',
      name: 'Demo User',
      anonymous: true,
    };
    setUser(demoUser);
    await fetchBalance(demoUser);
  }, [fetchBalance]);

  const signOut = useCallback(async () => {
    if (!useDemoSession) {
      await authService.signOut();
    }
    setUseDemoSession(false);
    setUser(null);
    setCredits(null);
  }, [useDemoSession]);

  const purchaseCredits = useCallback(
    async (packId: string) => {
      if (!user) {
        throw new Error('You need to be signed in to purchase credits.');
      }
      const result = await CreditClient.purchasePack(user.id, packId);
      setCredits(result.balance);
      return { balance: result.balance };
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      credits,
      creditPacks,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInAsDemo,
      signOut,
      refreshCredits,
      purchaseCredits,
    }),
    [
      user,
      loading,
      credits,
      creditPacks,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshCredits,
      purchaseCredits,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
