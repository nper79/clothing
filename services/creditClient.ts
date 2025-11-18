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

// Retry wrapper for handling 425 Too Early errors
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 500
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a 425 error or network error
      const isRetryable = error instanceof Error && (
        error.message.includes('425') ||
        error.message.includes('Too Early') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('NetworkError')
      );

      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retries exceeded');
};

export const CreditClient = {
  async listPacks(): Promise<CreditPack[]> {
    return withRetry(async () => {
      const response = await fetch('/api/credits/packs');
      if (!response.ok) {
        await handleError(response);
      }
      const payload = await response.json();
      return payload?.packs ?? [];
    });
  },

  async getBalance(userId: string): Promise<number> {
    return withRetry(async () => {
      const response = await fetch(`/api/credits/balance?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        await handleError(response);
      }
      const payload = await response.json();
      return typeof payload?.balance === 'number' ? payload.balance : 0;
    });
  },

  async purchasePack(userId: string, packId: string): Promise<{ balance: number }> {
    return withRetry(async () => {
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
    });
  },
};
