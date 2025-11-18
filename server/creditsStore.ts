import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_STARTING_CREDITS = Number(process.env.DEFAULT_STARTING_CREDITS ?? '5');

export { DEFAULT_STARTING_CREDITS };
const PERSONAL_LOOK_CREDIT_COST = Math.max(Number(process.env.PERSONAL_LOOK_CREDIT_COST ?? '2'), 1);
const REMIX_LOOK_CREDIT_COST = Math.max(Number(process.env.REMIX_LOOK_CREDIT_COST ?? '1'), 1);

const CREDIT_PACKS = [
  {
    id: 'starter',
    label: 'Starter Pack',
    description: 'Great for trying a handful of looks',
    credits: 15,
    priceCents: 900,
  },
  {
    id: 'creator',
    label: 'Creator Pack',
    description: 'For weekly outfit refreshes',
    credits: 40,
    priceCents: 2200,
    bestValue: true,
  },
  {
    id: 'studio',
    label: 'Studio Pack',
    description: 'Power users and stylists',
    credits: 120,
    priceCents: 5400,
  },
];

type CreditAccountRow = {
  user_id: string;
  credits: number;
  updated_at: string;
};

const fallbackAccounts = new Map<string, CreditAccountRow>();

const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const getFallbackAccount = (userId: string): CreditAccountRow => {
  const existing = fallbackAccounts.get(userId);
  if (existing) {
    return existing;
  }
  const created: CreditAccountRow = {
    user_id: userId,
    credits: DEFAULT_STARTING_CREDITS,
    updated_at: nowIso(),
  };
  fallbackAccounts.set(userId, created);
  return created;
};

const setFallbackAccount = (userId: string, credits: number) => {
  const next: CreditAccountRow = {
    user_id: userId,
    credits,
    updated_at: nowIso(),
  };
  fallbackAccounts.set(userId, next);
  return next;
};

const logSupabaseFailure = (error: unknown) => {
  console.warn('[credits] Supabase unavailable, using in-memory credits store.', error);
};

export class CreditError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const nowIso = () => new Date().toISOString();

const ensureAccount = async (userId: string): Promise<CreditAccountRow> => {
  if (!userId) {
    throw new Error('Missing user id');
  }

  if (!supabase) {
    return getFallbackAccount(userId);
  }

  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      return data;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('user_credits')
      .insert([
        {
          user_id: userId,
          credits: DEFAULT_STARTING_CREDITS,
          updated_at: nowIso(),
        },
      ])
      .select()
      .single();

    if (insertError || !inserted) {
      throw insertError ?? new Error('Failed to create credit account');
    }

    return inserted;
  } catch (error) {
    logSupabaseFailure(error);
    return getFallbackAccount(userId);
  }
};

const updateAccount = async (userId: string, credits: number) => {
  if (!supabase) {
    return setFallbackAccount(userId, credits);
  }

  try {
    const { data, error } = await supabase
      .from('user_credits')
      .update({ credits, updated_at: nowIso() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error('Failed to update credits');
    }

    return data;
  } catch (error) {
    logSupabaseFailure(error);
    return setFallbackAccount(userId, credits);
  }
};

const recordTransaction = async (
  userId: string,
  change: number,
  reason: string,
  metadata?: Record<string, unknown>
) => {
  if (!supabase) {
    return;
  }

  try {
    await supabase.from('credit_transactions').insert([
      {
        user_id: userId,
        delta: change,
        reason,
        metadata: metadata ?? {},
      },
    ]);
  } catch (error) {
    logSupabaseFailure(error);
  }
};

export const getCreditBalance = async (userId: string): Promise<number> => {
  const account = await ensureAccount(userId);
  return account.credits;
};

export const addCredits = async (
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<number> => {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  const account = await ensureAccount(userId);
  const nextCredits = account.credits + amount;
  await updateAccount(userId, nextCredits);
  await recordTransaction(userId, amount, reason, metadata);
  return nextCredits;
};

export const deductCredits = async (
  userId: string,
  amount: number,
  reason: string
): Promise<number> => {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  const account = await ensureAccount(userId);
  if (account.credits < amount) {
    throw new CreditError('Insufficient credits', 402);
  }
  const nextCredits = account.credits - amount;
  await updateAccount(userId, nextCredits);
  await recordTransaction(userId, -amount, reason);
  return nextCredits;
};

export const chargeForPersonalizedLooks = async (userId: string, lookCount: number) => {
  const totalCost = PERSONAL_LOOK_CREDIT_COST * Math.max(lookCount, 1);
  await deductCredits(userId, totalCost, 'personalized_looks');
};

export const chargeForRemix = async (userId: string) => {
  await deductCredits(userId, REMIX_LOOK_CREDIT_COST, 'remix');
};

export const purchaseCreditPack = async (userId: string, packId: string) => {
  const pack = CREDIT_PACKS.find((entry) => entry.id === packId);
  if (!pack) {
    throw new CreditError('Unknown credit pack', 404);
  }

  const updated = await addCredits(userId, pack.credits, 'pack_purchase', {
    packId: pack.id,
  });

  return { balance: updated, pack };
};

export const getCreditPacks = () => CREDIT_PACKS;

export const CREDIT_CONFIG = {
  startingCredits: DEFAULT_STARTING_CREDITS,
  personalLookCost: PERSONAL_LOOK_CREDIT_COST,
  remixCost: REMIX_LOOK_CREDIT_COST,
};
