import type { Session } from '../types/session';
import type {
  CompetitionLevel,
  ScannedProductInput,
  ScannerSeedProduct,
  SellerPopularity,
  SessionProduct,
} from '../types/product';

interface SessionSeed {
  id: string;
  title: string;
  updatedAt: string;
  productCount: number;
}

interface ProductSeed extends ScannerSeedProduct {
  key: string;
  foundPrice: number;
  reviewCount: number;
  requiresApproval?: boolean;
  restrictions?: string[];
}

const CATEGORY_DETAILS: Record<string, { shipping: number; dimensions: string; weight: string }> = {
  Electronics: {
    shipping: 3.5,
    dimensions: '7.5 x 6.8 x 3.2 inches',
    weight: '0.55 lbs',
  },
  Fashion: {
    shipping: 4.25,
    dimensions: '10.8 x 3.4 x 8.6 inches',
    weight: '1.2 lbs',
  },
  'Sports & Outdoors': {
    shipping: 4.95,
    dimensions: '12.2 x 7.8 x 3.5 inches',
    weight: '1.7 lbs',
  },
  'Home & Kitchen': {
    shipping: 5.25,
    dimensions: '13.4 x 8.1 x 4.7 inches',
    weight: '2.1 lbs',
  },
  Furniture: {
    shipping: 8.5,
    dimensions: '24.0 x 23.0 x 11.0 inches',
    weight: '21.8 lbs',
  },
  'Home & Garden': {
    shipping: 4.5,
    dimensions: '11.8 x 6.2 x 6.2 inches',
    weight: '2.4 lbs',
  },
};

const COMPETITION_LEVELS: CompetitionLevel[] = ['Low', 'Medium', 'High', 'Very High'];

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function makeIso(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(year, month, day, hour, minute).toISOString();
}

function createCreatedAt(updatedAt: string) {
  return new Date(new Date(updatedAt).getTime() - 1000 * 60 * 60 * 24 * 7).toISOString();
}

const sessionSeeds: SessionSeed[] = [
  { id: '1', title: 'Spring Collection 2026', updatedAt: makeIso(2026, 3, 14, 10, 30), productCount: 24 },
  { id: '2', title: 'Premium Accessories', updatedAt: makeIso(2026, 3, 13, 15, 45), productCount: 12 },
  { id: '3', title: 'Summer Catalog', updatedAt: makeIso(2026, 3, 12, 9, 20), productCount: 45 },
  { id: '4', title: 'Client Meeting - Tech Corp', updatedAt: makeIso(2026, 3, 10, 14, 15), productCount: 8 },
  { id: '5', title: 'Weekend Flash Sale', updatedAt: makeIso(2026, 3, 8, 16, 0), productCount: 31 },
  { id: '6', title: 'New Arrivals', updatedAt: makeIso(2026, 3, 7, 11, 30), productCount: 18 },
  { id: '7', title: 'Clearance Items', updatedAt: makeIso(2026, 3, 5, 13, 45), productCount: 67 },
  { id: '8', title: 'Gift Ideas', updatedAt: makeIso(2026, 3, 3, 10, 0), productCount: 15 },
  { id: '9', title: 'Winter Essentials', updatedAt: makeIso(2026, 3, 1, 9, 15), productCount: 42 },
  { id: '10', title: 'Back to School Promo', updatedAt: makeIso(2026, 2, 28, 14, 30), productCount: 29 },
  { id: '11', title: 'Holiday Special', updatedAt: makeIso(2026, 2, 26, 11, 0), productCount: 38 },
  { id: '12', title: 'Luxury Items Selection', updatedAt: makeIso(2026, 2, 24, 16, 45), productCount: 16 },
  { id: '13', title: 'Budget Friendly Options', updatedAt: makeIso(2026, 2, 22, 10, 20), productCount: 54 },
  { id: '14', title: 'Corporate Orders - Blue Inc', updatedAt: makeIso(2026, 2, 20, 13, 15), productCount: 22 },
  { id: '15', title: 'Featured Products', updatedAt: makeIso(2026, 2, 18, 9, 45), productCount: 35 },
  { id: '16', title: 'Seasonal Favorites', updatedAt: makeIso(2026, 2, 16, 15, 30), productCount: 41 },
  { id: '17', title: 'Trending Now', updatedAt: makeIso(2026, 2, 14, 11, 10), productCount: 27 },
  { id: '18', title: 'Limited Edition', updatedAt: makeIso(2026, 2, 12, 14, 0), productCount: 9 },
  { id: '19', title: 'Customer Favorites', updatedAt: makeIso(2026, 2, 10, 10, 30), productCount: 33 },
  { id: '20', title: 'Exclusive Launch', updatedAt: makeIso(2026, 2, 8, 16, 20), productCount: 19 },
  { id: '21', title: 'Best Sellers 2026', updatedAt: makeIso(2026, 2, 6, 9, 50), productCount: 48 },
  { id: '22', title: 'VIP Client Selection', updatedAt: makeIso(2026, 2, 4, 13, 40), productCount: 14 },
  { id: '23', title: 'Flash Deal Archive', updatedAt: makeIso(2026, 2, 2, 11, 25), productCount: 61 },
  { id: '24', title: 'Partner Showcase', updatedAt: makeIso(2026, 1, 29, 15, 15), productCount: 26 },
  { id: '25', title: 'Eco-Friendly Collection', updatedAt: makeIso(2026, 1, 27, 10, 5), productCount: 37 },
];

const productSeeds: ProductSeed[] = [
  {
    key: '1',
    asin: 'B08XM4X5J1',
    title: 'Wireless Bluetooth Headphones with Active Noise Cancellation',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    rating: 4.5,
    reviewCount: 2847,
    category: 'Electronics',
    price: 89.99,
    foundPrice: 75,
    sellerPopularity: 'High',
    restrictions: ['Lithium battery regulations apply'],
  },
  {
    key: '2',
    asin: 'B08KJ4Z8TW',
    title: 'Premium Leather Crossbody Bag for Women',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    rating: 4.8,
    reviewCount: 1932,
    category: 'Fashion',
    price: 124.5,
    foundPrice: 110,
    sellerPopularity: 'Very High',
  },
  {
    key: '3',
    asin: 'B09JQMJHXT',
    title: 'Smart Watch Fitness Tracker with Heart Rate Monitor',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    rating: 4.3,
    reviewCount: 1577,
    category: 'Electronics',
    price: 199.99,
    foundPrice: 185.5,
    sellerPopularity: 'Medium',
  },
  {
    key: '4',
    asin: 'B07Q2BGKQ3',
    title: 'Stainless Steel Water Bottle - 32oz Insulated',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
    rating: 4.7,
    reviewCount: 3241,
    category: 'Sports & Outdoors',
    price: 34.99,
    foundPrice: 28.99,
    sellerPopularity: 'High',
  },
  {
    key: '5',
    asin: 'B09MFDZ2JN',
    title: 'Organic Cotton Bed Sheet Set - Queen Size',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop',
    rating: 4.6,
    reviewCount: 2460,
    category: 'Home & Kitchen',
    price: 79.99,
    foundPrice: 72.5,
    sellerPopularity: 'Medium',
  },
  {
    key: '6',
    asin: 'B08F3GQPZX',
    title: 'Professional Chef Knife Set - 8 Pieces',
    image: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&h=400&fit=crop',
    rating: 4.9,
    reviewCount: 4016,
    category: 'Home & Kitchen',
    price: 149.99,
    foundPrice: 135,
    sellerPopularity: 'Very High',
    requiresApproval: true,
    restrictions: ['Blade category may require gated approval in some regions'],
  },
  {
    key: '7',
    asin: 'B08D9P4PQH',
    title: 'Ergonomic Office Chair with Lumbar Support',
    image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=400&fit=crop',
    rating: 4.4,
    reviewCount: 1184,
    category: 'Furniture',
    price: 289,
    foundPrice: 265,
    sellerPopularity: 'High',
  },
  {
    key: '8',
    asin: 'B09TKS3MKL',
    title: 'Portable Bluetooth Speaker - Waterproof',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop',
    rating: 4.5,
    reviewCount: 2190,
    category: 'Electronics',
    price: 59.99,
    foundPrice: 54.99,
    sellerPopularity: 'High',
  },
  {
    key: '9',
    asin: 'B08G7YJ1XL',
    title: 'Yoga Mat with Carrying Strap - Non-Slip',
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    rating: 4.6,
    reviewCount: 2678,
    category: 'Sports & Outdoors',
    price: 39.99,
    foundPrice: 35,
    sellerPopularity: 'Medium',
  },
  {
    key: '10',
    asin: 'B08WNXM9PL',
    title: 'Digital Air Fryer - 6 Quart Capacity',
    image: 'https://images.unsplash.com/photo-1585076800246-50c29df5ced4?w=400&h=400&fit=crop',
    rating: 4.7,
    reviewCount: 3894,
    category: 'Home & Kitchen',
    price: 119.99,
    foundPrice: 105,
    sellerPopularity: 'Very High',
  },
  {
    key: '11',
    asin: 'B09P6BNQYK',
    title: 'Gaming Mouse with RGB Lighting - Programmable',
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop',
    rating: 4.4,
    reviewCount: 1488,
    category: 'Electronics',
    price: 49.99,
    foundPrice: 42.5,
    sellerPopularity: 'High',
  },
  {
    key: '12',
    asin: 'B08F1R3B9V',
    title: 'Ceramic Plant Pots Set of 3 with Drainage',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=400&fit=crop',
    rating: 4.5,
    reviewCount: 972,
    category: 'Home & Garden',
    price: 29.99,
    foundPrice: 25.99,
    sellerPopularity: 'Medium',
  },
];

function buildProduct(seed: ProductSeed, sessionId: string, sessionIndex: number, index: number): SessionProduct {
  const categoryMeta = CATEGORY_DETAILS[seed.category] ?? CATEGORY_DETAILS.Electronics;
  const priceOffset = ((sessionIndex + index) % 5) - 2;
  const foundOffset = ((sessionIndex * 3 + index) % 4) - 1.5;
  const price = roundCurrency(Math.max(seed.price + priceOffset * 1.35, 9.99));
  const foundPrice = roundCurrency(Math.max(seed.foundPrice + foundOffset * 1.1, 4.99));
  const amazonFees = roundCurrency(price * 0.15);
  const estimatedShipping = roundCurrency(categoryMeta.shipping + ((index + sessionIndex) % 3) * 0.35);
  const profitMargin = roundCurrency(price - foundPrice - amazonFees - estimatedShipping);
  const competitionLevel = COMPETITION_LEVELS[(sessionIndex + index) % COMPETITION_LEVELS.length];
  const sellerPopularityScore = 180 + sessionIndex * 17 + index * 13 + Math.round(seed.rating * 100);
  const salesRank = 900 + sessionIndex * 111 + index * 41;
  const bsr = 11000 + sessionIndex * 540 + index * 221;
  const monthlySalesEstimate = 120 + sessionIndex * 11 + index * 9;

  return {
    id: `${sessionId}-${seed.key}-${index + 1}`,
    asin: seed.asin,
    title: seed.title,
    image: seed.image,
    rating: seed.rating,
    reviewCount: seed.reviewCount + index * 7,
    category: seed.category,
    price,
    foundPrice,
    sellerPopularity: seed.sellerPopularity,
    sellerPopularityScore,
    estimatedShipping,
    amazonFees,
    profitMargin,
    requiresApproval: Boolean(seed.requiresApproval),
    competitionLevel,
    salesRank,
    bsr,
    dimensions: categoryMeta.dimensions,
    weight: categoryMeta.weight,
    restrictions: seed.restrictions ?? [],
    monthlySalesEstimate,
  };
}

function createProductsForSession(seed: SessionSeed, sessionIndex: number) {
  return Array.from({ length: seed.productCount }, (_, index) => {
    const template = productSeeds[(index + sessionIndex) % productSeeds.length];
    return buildProduct(template, seed.id, sessionIndex, index);
  });
}

export function buildInitialSessionState() {
  const productsBySession: Record<string, SessionProduct[]> = {};
  const sessions: Session[] = sessionSeeds.map((seed, sessionIndex) => {
    const products = createProductsForSession(seed, sessionIndex);
    productsBySession[seed.id] = products;

    return {
      id: seed.id,
      title: seed.title,
      productCount: products.length,
      createdAt: createCreatedAt(seed.updatedAt),
      updatedAt: seed.updatedAt,
    };
  });

  return { sessions, productsBySession };
}

export const scannerPool: ScannerSeedProduct[] = productSeeds.slice(0, 6).map((seed) => ({
  asin: seed.asin,
  title: seed.title,
  image: seed.image,
  rating: seed.rating,
  category: seed.category,
  price: seed.price,
  sellerPopularity: seed.sellerPopularity,
}));

function calculateDerivedFields(
  price: number,
  foundPrice: number,
  category: string,
  sellerPopularity: SellerPopularity,
) {
  const categoryMeta = CATEGORY_DETAILS[category] ?? CATEGORY_DETAILS.Electronics;
  const estimatedShipping = categoryMeta.shipping;
  const amazonFees = roundCurrency(price * 0.15);
  const profitMargin = roundCurrency(price - foundPrice - amazonFees - estimatedShipping);
  let competitionLevel: CompetitionLevel = 'Low';

  if (sellerPopularity === 'Very High') {
    competitionLevel = 'High';
  } else if (sellerPopularity === 'High' || sellerPopularity === 'Medium') {
    competitionLevel = 'Medium';
  }

  return {
    estimatedShipping,
    amazonFees,
    profitMargin,
    competitionLevel,
    dimensions: categoryMeta.dimensions,
    weight: categoryMeta.weight,
  };
}

export function createScannedProduct(
  sessionId: string,
  input: ScannedProductInput,
  sequence: number,
): SessionProduct {
  const derived = calculateDerivedFields(
    roundCurrency(input.price),
    roundCurrency(input.foundPrice),
    input.category,
    input.sellerPopularity,
  );

  return {
    id: `${sessionId}-scan-${sequence}`,
    asin: input.asin,
    title: input.title,
    image: input.image,
    rating: input.rating,
    reviewCount: 1200 + sequence,
    category: input.category,
    price: roundCurrency(input.price),
    foundPrice: roundCurrency(input.foundPrice),
    sellerPopularity: input.sellerPopularity,
    sellerPopularityScore: 200 + sequence,
    estimatedShipping: derived.estimatedShipping,
    amazonFees: derived.amazonFees,
    profitMargin: derived.profitMargin,
    requiresApproval: false,
    competitionLevel: derived.competitionLevel,
    salesRank: 1000 + sequence,
    bsr: 15000 + sequence * 9,
    dimensions: derived.dimensions,
    weight: derived.weight,
    restrictions: [],
    monthlySalesEstimate: 220 + sequence,
  };
}

export function updateProductFoundPrice(product: SessionProduct, foundPrice: number): SessionProduct {
  const normalizedFoundPrice = roundCurrency(foundPrice);
  const amazonFees = roundCurrency(product.price * 0.15);
  const profitMargin = roundCurrency(
    product.price - normalizedFoundPrice - amazonFees - product.estimatedShipping,
  );

  return {
    ...product,
    foundPrice: normalizedFoundPrice,
    amazonFees,
    profitMargin,
  };
}