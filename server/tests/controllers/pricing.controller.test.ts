import { describe, expect, it, jest } from '@jest/globals';
import type {
  CompetitiveSummaryBatchResponse,
  GetCompetitivePricingParams,
  GetCompetitiveSummaryBatchParams,
  GetOffersParams,
  GetPricingParams,
  OffersResponse,
  PricingResponse,
} from '../../src/types/amazon/pricing.types.js';
import { createMockRequest, createMockResponse } from '../helpers/mock-express.js';

const pricingServiceMock = {
  getPricing: jest.fn<(params: GetPricingParams) => Promise<PricingResponse[]>>(),
  getCompetitivePricing: jest.fn<
    (params: GetCompetitivePricingParams) => Promise<PricingResponse[]>
  >(),
  getListingOffers: jest.fn<
    (sellerSKU: string, params: GetOffersParams) => Promise<OffersResponse>
  >(),
  getItemOffers: jest.fn<
    (asin: string, params: GetOffersParams) => Promise<OffersResponse>
  >(),
  getCompetitiveSummaryBatch: jest.fn<
    (params: GetCompetitiveSummaryBatchParams) => Promise<CompetitiveSummaryBatchResponse[]>
  >(),
};

await jest.unstable_mockModule('../../src/services/amazon/pricing.service.js', () => ({
  default: pricingServiceMock,
}));

const {
  getPricing,
  getCompetitivePricing,
  getListingOffers,
  getItemOffers,
  getCompetitiveSummaryBatch,
} = await import('../../src/controllers/amazon/pricing.controller.js');

describe('pricing.controller', () => {
  it('normalizes pricing query params before calling the service', async () => {
    const serviceResult: PricingResponse[] = [
      { identifier: 'ASIN1', price: 19.99, currency: 'USD' },
    ];
    pricingServiceMock.getPricing.mockResolvedValue(serviceResult);

    const req = createMockRequest({
      query: {
        identifiers: ' ASIN1, ASIN2 ',
        marketplaceId: ' ATVPDKIKX0DER ',
        itemCondition: ' New ',
        customerType: [' Business '],
      },
    });
    const res = createMockResponse();

    await getPricing(req, res);

    expect(pricingServiceMock.getPricing).toHaveBeenCalledWith({
      identifiers: ['ASIN1', 'ASIN2'],
      type: 'ASIN',
      marketplaceId: 'ATVPDKIKX0DER',
      itemCondition: 'New',
      customerType: 'Business',
    });
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('returns the service status code when pricing lookup fails', async () => {
    const error = Object.assign(new Error('Pricing request failed'), { statusCode: 422 });
    pricingServiceMock.getPricing.mockRejectedValue(error);

    const req = createMockRequest({
      query: {
        identifiers: 'ASIN1',
        marketplaceId: 'ATVPDKIKX0DER',
      },
    });
    const res = createMockResponse();

    await getPricing(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Pricing request failed' });
  });

  it('passes trimmed identifiers and type to competitive pricing', async () => {
    const serviceResult: PricingResponse[] = [
      { identifier: 'SKU1', price: 12.5, currency: 'USD' },
    ];
    pricingServiceMock.getCompetitivePricing.mockResolvedValue(serviceResult);

    const req = createMockRequest({
      query: {
        identifiers: [' SKU1 ', ' SKU2 '],
        type: ['SKU'],
        marketplaceId: [' ATVPDKIKX0DER '],
      },
    });
    const res = createMockResponse();

    await getCompetitivePricing(req, res);

    expect(pricingServiceMock.getCompetitivePricing).toHaveBeenCalledWith({
      identifiers: ['SKU1', 'SKU2'],
      type: 'SKU',
      marketplaceId: 'ATVPDKIKX0DER',
    });
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('passes listing offer params without blank optional values', async () => {
    const serviceResult: OffersResponse = { identifier: 'seller-sku-1', offers: [] };
    pricingServiceMock.getListingOffers.mockResolvedValue(serviceResult);

    const req = createMockRequest({
      params: { sellerSKU: 'seller-sku-1' },
      query: {
        marketplaceId: 'ATVPDKIKX0DER',
        itemCondition: '   ',
        customerType: ' Consumer ',
      },
    });
    const res = createMockResponse();

    await getListingOffers(req, res);

    expect(pricingServiceMock.getListingOffers).toHaveBeenCalledWith('seller-sku-1', {
      marketplaceId: 'ATVPDKIKX0DER',
      customerType: 'Consumer',
    });
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('passes item offer params through to the service', async () => {
    const serviceResult: OffersResponse = { identifier: 'B001234567', offers: [] };
    pricingServiceMock.getItemOffers.mockResolvedValue(serviceResult);

    const req = createMockRequest({
      params: { asin: 'B001234567' },
      query: {
        marketplaceId: 'ATVPDKIKX0DER',
        itemCondition: 'Used',
      },
    });
    const res = createMockResponse();

    await getItemOffers(req, res);

    expect(pricingServiceMock.getItemOffers).toHaveBeenCalledWith('B001234567', {
      marketplaceId: 'ATVPDKIKX0DER',
      itemCondition: 'Used',
    });
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('returns 207 for competitive summary batches with partial failures', async () => {
    const serviceResult: CompetitiveSummaryBatchResponse[] = [
      {
        asin: 'B001234567',
        marketplaceId: 'ATVPDKIKX0DER',
        summary: null,
        error: 'Offer data unavailable',
      },
    ];
    pricingServiceMock.getCompetitiveSummaryBatch.mockResolvedValue(serviceResult);

    const req = createMockRequest({
      body: {
        requests: [{ asin: 'B001234567', marketplaceId: 'ATVPDKIKX0DER' }],
      },
    });
    const res = createMockResponse();

    await getCompetitiveSummaryBatch(req, res);

    expect(pricingServiceMock.getCompetitiveSummaryBatch).toHaveBeenCalledWith({
      requests: [{ asin: 'B001234567', marketplaceId: 'ATVPDKIKX0DER' }],
    });
    expect(res.status).toHaveBeenCalledWith(207);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('returns 200 for competitive summary batches without partial failures', async () => {
    const serviceResult: CompetitiveSummaryBatchResponse[] = [
      {
        asin: 'B001234567',
        marketplaceId: 'ATVPDKIKX0DER',
        summary: {
          lowestPrice: 21.99,
          currency: 'USD',
          offerCount: 3,
        },
      },
    ];
    pricingServiceMock.getCompetitiveSummaryBatch.mockResolvedValue(serviceResult);

    const req = createMockRequest({
      body: {
        requests: [{ asin: 'B001234567', marketplaceId: 'ATVPDKIKX0DER' }],
      },
    });
    const res = createMockResponse();

    await getCompetitiveSummaryBatch(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });
});