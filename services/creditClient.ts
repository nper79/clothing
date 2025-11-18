export interface CreditPack {
  id: string;
  label: string;
  description: string;
  credits: number;
  priceCents: number;
  bestValue?: boolean;
}

const toJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const handleError = async (response: Response) => {
  const payload = await toJson(response);
  const message = payload?.error || `Request failed with status ${response.status}`;
  throw new Error(message);
};

export const CreditClient = {
  async listPacks(): Promise<CreditPack[]> {
    const response = await fetch('/api/credits/packs');
    if (!response.ok) {
      await handleError(response);
    }
    const payload = await response.json();
    return payload?.packs ?? [];
  },

  async getBalance(userId: string): Promise<number> {
    const response = await fetch(`/api/credits/balance?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      await handleError(response);
    }
    const payload = await response.json();
    return typeof payload?.balance === 'number' ? payload.balance : 0;
  },

  async purchasePack(userId: string, packId: string): Promise<{ balance: number }> {
    const response = await fetch('/api/credits/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, packId }),
    });

    if (!response.ok) {
      await handleError(response);
    }

    const payload = await response.json();
    return { balance: payload?.balance ?? 0 };
  },
};
