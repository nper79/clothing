import type { ShopItem } from '../types/explore';

export interface ShoppingSearchParameters {
  q?: string;
  type?: string;
  num?: number;
  page?: number;
  engine?: string;
}

export interface ShoppingProduct {
  title: string;
  link: string;
  price?: string;
  source?: string;
  imageUrl?: string;
  rating?: number;
  ratingCount?: number;
  productId?: string;
  position?: number;
}

export interface ShopImageSearchResult {
  searchParameters?: ShoppingSearchParameters;
  shopping: ShoppingProduct[];
}

export interface ItemShoppingResult {
  item: ShopItem;
  data?: ShopImageSearchResult;
  error?: string;
}

const TRUSTED_MERCHANT_KEYWORDS = [
  'amazon',
  'uniqlo',
  'macys',
  'nordstrom',
  'bloomingdale',
  'zara',
  'hm.com',
  'h&m',
  'cosstores',
  'everlane',
  'aritzia',
  'anthropologie',
  'urbanoutfitters',
  'banana republic',
  'gap',
  'jcrew',
  'madewell',
  'shopbop',
  'target',
  'asos',
  'ssense',
];

const isTrustedMerchant = (product: ShoppingProduct): boolean => {
  const source = (product.source ?? '').toLowerCase();
  let host = '';
  try {
    host = new URL(product.link ?? '').hostname.toLowerCase();
  } catch {
    host = '';
  }
  if (!host && !source) {
    return false;
  }
  return TRUSTED_MERCHANT_KEYWORDS.some((keyword) => {
    const normalized = keyword.toLowerCase();
    return source.includes(normalized) || host.includes(normalized.replace(/\s+/g, ''));
  });
};

const buildCachedResult = (item: ShopItem): ItemShoppingResult | null => {
  if (!item.cachedProducts || item.cachedProducts.length === 0) {
    return null;
  }
  return {
    item,
    data: {
      shopping: item.cachedProducts,
    },
  };
};

export const ShopService = {
  async searchByImage(
    imageUrl: string,
    query?: string,
    country = 'us',
    language = 'en'
  ): Promise<ShopImageSearchResult> {
    if (!imageUrl) {
      throw new Error('Image URL is required for shopping search.');
    }

    const payload: Record<string, unknown> = { imageUrl, country, language };
    if (query) {
      payload.query = query;
    }

    const response = await fetch('/api/shop-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to search shopping items');
    }

    const json = await response.json();
    const result: ShopImageSearchResult = json.result ?? { shopping: [] };
    const shopping = Array.isArray(result.shopping)
      ? result.shopping.filter((product) => isTrustedMerchant(product))
      : [];
    return {
      ...result,
      shopping,
    };
  },

  async searchItemsByImage(
    items: ShopItem[],
    country = 'us',
    language = 'en'
  ): Promise<ItemShoppingResult[]> {
    const results: ItemShoppingResult[] = [];
    const targets = items.slice(0, 6);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const item of targets) {
      if (!item.gridCellUrl) {
        results.push({
          item,
          error: 'No segmented grid cell available yet. Rebuild the grid in the admin panel.',
        });
        continue;
      }

      try {
        const query = item.searchQuery || item.label;
        const data = await ShopService.searchByImage(item.gridCellUrl, query, country, language);
        results.push({ item, data });
      } catch (error) {
        results.push({
          item,
          error: error instanceof Error ? error.message : 'Search failed',
        });
      }

      // Avoid rate limits by spacing requests slightly
      await delay(250);
    }

    return results;
  },

  getCachedResults(items: ShopItem[]): ItemShoppingResult[] {
    return items
      .map((item) => buildCachedResult(item))
      .filter((entry): entry is ItemShoppingResult => Boolean(entry));
  },

  mergeResults(items: ShopItem[], ...batches: Array<ItemShoppingResult[] | null | undefined>): ItemShoppingResult[] {
    const map = new Map<string, ItemShoppingResult>();
    for (const batch of batches) {
      if (!batch) continue;
      for (const entry of batch) {
        map.set(entry.item.id, entry);
      }
    }
    return items.map((item) => map.get(item.id) ?? { item });
  },
};
