import { describe, expect, it, jest } from '@jest/globals';
import type { CatalogSearchResponse } from '../../src/types/amazon.types.js';
import { createMockRequest, createMockResponse } from '../helpers/mock-express.js';

const searchCatalogItemsByBarcode = jest.fn<
  (barcode: string) => Promise<CatalogSearchResponse>
>();

await jest.unstable_mockModule('../../src/services/amazon/catalog.service.js', () => ({
  default: {
    searchCatalogItemsByBarcode,
  },
}));

const { searchByBarcode } = await import('../../src/controllers/amazon/catalog.controller.js');

describe('catalog.controller', () => {
  it('returns 400 when the barcode param is missing', async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await searchByBarcode(req, res);

    expect(searchCatalogItemsByBarcode).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid barcode parameter' });
  });

  it('returns the catalog response when the service succeeds', async () => {
    const serviceResult: CatalogSearchResponse = {
      numberOfResults: 1,
      items: [{ asin: 'B001234567', identifiers: [] }],
    };

    searchCatalogItemsByBarcode.mockResolvedValue(serviceResult);

    const req = createMockRequest({
      params: { code: '012345678905' },
    });
    const res = createMockResponse();

    await searchByBarcode(req, res);

    expect(searchCatalogItemsByBarcode).toHaveBeenCalledWith('012345678905');
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('returns 400 when the service throws an error', async () => {
    searchCatalogItemsByBarcode.mockRejectedValue(new Error('Catalog lookup failed'));

    const req = createMockRequest({
      params: { code: '012345678905' },
    });
    const res = createMockResponse();

    await searchByBarcode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Catalog lookup failed' });
  });
});