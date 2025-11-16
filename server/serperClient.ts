import fetch from 'node-fetch';

interface ImageSearchParams {
  imageUrl: string;
  query?: string;
  country?: string;
  language?: string;
}

export interface ShoppingSearchParameters {
  q?: string;
  type?: string;
  num?: number;
  page?: number;
  engine?: string;
}

export interface ShoppingProduct {
  title: string;
  source?: string;
  link: string;
  price?: string;
  imageUrl?: string;
  rating?: number;
  ratingCount?: number;
  productId?: string;
  position?: number;
}

export interface ImageShoppingResponse {
  searchParameters?: ShoppingSearchParameters;
  shopping: ShoppingProduct[];
}

const SCRAPINGDOG_LENS_ENDPOINT = 'https://api.scrapingdog.com/google_lens';

const ensureApiKey = () => {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  if (!apiKey) {
    throw new Error('SCRAPINGDOG_API_KEY is not configured.');
  }
  return apiKey;
};

const pickString = (record: any, keys: string[], predicate?: (value: string) => boolean): string | undefined => {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0 && (!predicate || predicate(trimmed))) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const pickUrl = (record: any, keys: string[]): string | undefined =>
  pickString(record, keys, (value) => /^https?:\/\//i.test(value));

const pickNumber = (record: any, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^\d.]/g, ''));
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

const normalizeShoppingList = (data: any): ShoppingProduct[] => {
  // Check for lens_results format first
  if (data?.lens_results && Array.isArray(data.lens_results)) {
    return data.lens_results
      .filter((item: any) => typeof item === 'object' && item !== null)
      .map((item: any, index: number) => {
        const link = pickUrl(item, ['link', 'url']) ?? '';
        const title = pickString(item, ['title']) ?? '';
        let price = pickString(item, ['tag', 'price']) ?? '';

        // If no price in standard fields, try to extract from title
        if (!price && title) {
          const priceMatch = title.match(/[\$€£¥]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:USD|EUR|GBP|CHF)|(?:CHF|USD|EUR|GBP)\s*\d+(?:[.,]\d+)?/i);
          if (priceMatch) {
            price = priceMatch[0];
          }
        }

        const source = pickString(item, ['source']);
        const imageUrl = pickUrl(item, ['thumbnail', 'image']);

        return {
          title,
          source,
          link,
          price,
          imageUrl,
          rating: pickNumber(item, ['rating']),
          ratingCount: pickNumber(item, ['reviews']),
          productId: index.toString(),
          position: index + 1,
        };
      })
      // Filter to show ONLY products with prices
      .filter((product) => {
        const hasTitle = Boolean(product.title);
        const hasPrice = Boolean(product.price);
        return hasTitle && hasPrice;
      })
      // Sort by relevance (items with price and link first)
      .sort((a, b) => {
        // Prioritize items with both price and link
        const aScore = (a.price ? 1 : 0) + (a.link ? 1 : 0);
        const bScore = (b.price ? 1 : 0) + (b.link ? 1 : 0);
        return bScore - aScore;
      });
  }

  const candidateLists = [
    data?.products,
    data?.visual_matches,
    data?.organic_results,
    data?.shopping_results,
  ];

  const list =
    candidateLists.find((entries): entries is any[] => Array.isArray(entries) && entries.length > 0) ?? [];

  return list
    .map((item: any, index: number) => {
      const link = pickUrl(item, ['product_link', 'link', 'source', 'url']) ?? '';
      const title = pickString(item, ['title', 'product_title', 'name']) ?? '';
      let price = pickString(item, ['tag', 'price', 'price_text', 'sale_price']) ??
               (pickNumber(item, ['price', 'extracted_price'])?.toString());

      // If no price in standard fields, try to extract from title
      if (!price && title) {
        const priceMatch = title.match(/[\$€£¥]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:USD|EUR|GBP|CHF)|(?:CHF|USD|EUR|GBP)\s*\d+(?:[.,]\d+)?/i);
        if (priceMatch) {
          price = priceMatch[0];
        }
      }
      const source = pickString(item, ['source', 'vendor', 'merchant', 'seller']);
      const imageUrl =
        pickUrl(item, ['thumbnail', 'image', 'thumbnail_url']) ??
        pickString(item, ['thumbnail', 'image']);

      return {
        title,
        source,
        link,
        price,
        imageUrl,
        rating: pickNumber(item, ['rating', 'rating_value']),
        ratingCount: pickNumber(item, ['reviews', 'reviews_count', 'rating_count']),
        productId: pickString(item, ['product_id', 'catalog_id']) ?? index.toString(),
        position: typeof item.position === 'number' ? item.position : index + 1,
      };
    })
    // Filter to show ONLY products with prices
    .filter((product) => {
      const hasTitle = Boolean(product.title);
      const hasPrice = Boolean(product.price);
      const hasLink = Boolean(product.link);
      return hasTitle && hasPrice && hasLink;
    })
    // Sort by relevance (items with price, title and link first)
    .sort((a, b) => {
      // Prioritize items with complete info
      const aScore = (a.price ? 1 : 0) + (a.link ? 1 : 0) + (a.source ? 1 : 0);
      const bScore = (b.price ? 1 : 0) + (b.link ? 1 : 0) + (b.source ? 1 : 0);
      return bScore - aScore;
    });
};

export async function searchShoppingByImage({
  imageUrl,
  query,
  country = 'us',
  language = 'en',
}: ImageSearchParams): Promise<ImageShoppingResponse> {
  if (!imageUrl) {
    throw new Error('Missing image URL for shopping search.');
  }

  const apiKey = ensureApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    url: imageUrl,
    country: country,
    product: 'true', // Enable product search
    visual_matches: 'true', // Get visual matches
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const response = await fetch(`${SCRAPINGDOG_LENS_ENDPOINT}?${params.toString()}`, {
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(raw || `Scrapingdog Lens request failed (${response.status})`);
  }

  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(raw || 'Failed to parse Scrapingdog Lens response');
  }

  // Don't throw errors for common "no results" cases
  if (data.error && typeof data.error === 'string') {
    if (!data.error.includes('No results') &&
        !data.error.includes('not found') &&
        !data.error.includes('could not find') &&
        !data.error.includes("didn't return any results")) {
      throw new Error(data.error);
    }
  }

  const shopping = normalizeShoppingList(data);

  // If no visual matches found, try text search as fallback
  if (shopping.length === 0 && query) {
    try {
      return await searchShoppingByText(query, country, language);
    } catch (error) {
      console.warn('[scrapingdog] fallback shopping search failed', error);
    }
  }

  return {
    searchParameters: {
      q: query,
      type: 'google_lens',
      engine: 'scrapingdog',
      gl: country,
      hl: language,
    },
    shopping,
  };
}

async function searchShoppingByText(
  query: string,
  country: string,
  language: string
): Promise<ImageShoppingResponse> {
  const apiKey = ensureApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    query: query,
    country: country,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const response = await fetch(`${SCRAPINGDOG_LENS_ENDPOINT}?${params.toString()}`, {
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(raw || `Scrapingdog shopping request failed (${response.status})`);
  }

  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(raw || 'Failed to parse Scrapingdog shopping response');
  }

  if (data.error && typeof data.error === 'string') {
    if (!data.error.includes('No results') &&
        !data.error.includes('not found')) {
      throw new Error(data.error);
    }
  }

  return {
    searchParameters: {
      q: query,
      type: 'text_search',
      engine: 'scrapingdog',
      gl: country,
      hl: language,
    },
    shopping: normalizeShoppingList(data),
  };
}
