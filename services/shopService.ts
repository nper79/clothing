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

    const response = await fetch('/api/shop-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, query, country, language }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to search shopping items');
    }

    const payload = await response.json();
    return payload.result ?? { shopping: [] };
  },
};
