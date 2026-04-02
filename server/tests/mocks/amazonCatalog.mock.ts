import type { CatalogItem, CatalogSearchResponse } from '../../src/types/amazon.types.js';

export const mockCatalogItems: Record<string, CatalogItem> = {
  '885909950805': {
    asin: 'B075CYMYK6',
    identifiers: [
      { identifierType: 'UPC', identifier: '885909950805' },
      { identifierType: 'EAN', identifier: '0885909950805' },
    ],
    images: [
      {
        link: 'https://m.media-amazon.com/images/I/71xZv6hKShL.jpg',
        height: 500,
        width: 500,
        variant: 'MAIN',
      },
    ],
    productTypes: [{ productType: 'MICROPHONE' }],
    salesRanks: [
      { title: 'Musical Instruments', rank: 1234 },
      { title: 'Condenser Microphones', rank: 42 },
    ],
    summaries: [
      {
        marketplaceId: 'ATVPDKIKX0DER',
        brandName: 'Neewer',
        browseClassification: {
          displayName: 'Musical Instruments',
          classificationId: 'music_instruments',
        },
        itemName: 'Neewer NW-700 Professional Studio Broadcasting Recording Condenser Microphone',
        manufacturer: 'Neewer',
      },
    ],
  },
  '0123456789012': {
    asin: 'B00TEST1234',
    identifiers: [{ identifierType: 'UPC', identifier: '0123456789012' }],
    images: [
      {
        link: 'https://m.media-amazon.com/images/I/test.jpg',
        height: 500,
        width: 500,
        variant: 'MAIN',
      },
    ],
    productTypes: [{ productType: 'TEST_PRODUCT' }],
    salesRanks: [{ title: 'Test Category', rank: 5000 }],
    summaries: [
      {
        marketplaceId: 'ATVPDKIKX0DER',
        brandName: 'TestBrand',
        browseClassification: {
          displayName: 'Test Products',
          classificationId: 'test_products',
        },
        itemName: 'Test Product Name',
        manufacturer: 'TestManufacturer',
      },
    ],
  },
};

const item885909950805 = mockCatalogItems['885909950805'];
if (!item885909950805) throw new Error('Mock catalog item not found');

export const mockCatalogSearchResponse: CatalogSearchResponse = {
  items: [item885909950805],
  numberOfResults: 1,
};

export const mockEmptyCatalogResponse: CatalogSearchResponse = {
  items: [],
  numberOfResults: 0,
};

export class MockAmazonCatalogService {
  async searchByIdentifier(identifierType: string, identifier: string): Promise<CatalogItem | null> {
    return mockCatalogItems[identifier] || null;
  }

  async searchByUpc(upc: string): Promise<CatalogItem | null> {
    return mockCatalogItems[upc] || null;
  }

  async searchByEan(ean: string): Promise<CatalogItem | null> {
    return mockCatalogItems[ean] || null;
  }

  async searchByBarcode(barcode: string, barcodeType: string): Promise<CatalogItem | null> {
    return mockCatalogItems[barcode] || null;
  }

  async getByAsin(asin: string): Promise<CatalogItem | null> {
    const item = Object.values(mockCatalogItems).find((item) => item.asin === asin);
    return item || null;
  }

  async getSalesRank(asin: string): Promise<CatalogItem | null> {
    return this.getByAsin(asin);
  }
}
