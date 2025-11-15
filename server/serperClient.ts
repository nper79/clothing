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

export async function searchShoppingByImage({
  imageUrl,
  query,
  country = 'us',
  language = 'en',
}: ImageSearchParams): Promise<ImageShoppingResponse> {
  if (!imageUrl) {
    throw new Error('Missing image URL for shopping search.');
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY is not configured.');
  }

  const response = await fetch('https://google.serper.dev/lens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      url: imageUrl,
      q: query || undefined,
      gl: country,
      hl: language,
      type: 'shopping',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Serper lens request failed (${response.status})`);
  }

  const data = await response.json();
  const shopping = Array.isArray(data?.shopping)
    ? data.shopping.map((item: any) => ({
        title: item.title,
        source: item.source,
        link: item.link,
        price: item.price ?? item.priceText ?? '',
        imageUrl: item.imageUrl ?? item.thumbnail ?? item.image ?? '',
        rating: item.rating,
        ratingCount: item.ratingCount,
        productId: item.productId ?? item.catalogid ?? '',
        position: item.position,
      }))
    : [];

  return {
    searchParameters: data?.searchParameters,
    shopping,
  };
}
