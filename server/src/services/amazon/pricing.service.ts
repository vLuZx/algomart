import amazonClient from './client.service.js';
import type {
  GetPricingParams,
  GetCompetitivePricingParams,
  GetOffersParams,
  GetCompetitiveSummaryBatchParams,
  PricingResponse,
  OffersResponse,
  CompetitiveSummaryBatchResponse
} from '../../types/amazon/pricing.types.js';

class AmazonPricingService {
  private readonly API_VERSION = 'v0';
  private readonly BATCH_VERSION = '2022-05-01';

  private createHttpError(message: string, statusCode: number, name = 'AmazonPricingError'): Error {
    const error = new Error(message) as Error & { statusCode?: number };
    error.name = name;
    error.statusCode = statusCode;
    return error;
  }

  async getPricing(params: GetPricingParams): Promise<PricingResponse[]> {
    const { identifiers, type, marketplaceId, itemCondition, customerType } = params;
    // Validate required parameters
    if (!identifiers?.length || !['ASIN', 'SKU'].includes(type) || !marketplaceId) {
      throw this.createHttpError('Missing or invalid required parameters', 400);
    }
    // Build query for Amazon API
    const query: any = {
      MarketplaceId: marketplaceId,
      [type === 'ASIN' ? 'Asins' : 'Skus']: identifiers.join(','), // Use correct key for identifier type
    };
    if (itemCondition) query.ItemCondition = itemCondition;
    if (customerType) query.CustomerType = customerType;
    try {
      // Call Amazon Pricing API
      const res = await amazonClient.get<any>(`/products/pricing/v0/price`, query);
      // Normalize response: flatten to array of pricing info
      return (res?.payload || []).map((item: any) => ({
        identifier: item[type === 'ASIN' ? 'ASIN' : 'SellerSKU'],
        price: item?.Offers?.[0]?.ListingPrice?.Amount ?? null,
        currency: item?.Offers?.[0]?.ListingPrice?.CurrencyCode ?? '',
        condition: item?.Offers?.[0]?.ItemCondition,
        offersCount: item?.Offers?.length ?? 0,
      }));
    } catch (err) {
      throw this.createHttpError('Amazon getPricing error: ' + (err as Error).message, 500);
    }
  }

  async getCompetitivePricing(params: GetCompetitivePricingParams): Promise<PricingResponse[]> {
    const { identifiers, type, marketplaceId } = params;
    // Validate required parameters
    if (!identifiers?.length || !['ASIN', 'SKU'].includes(type) || !marketplaceId) {
      throw this.createHttpError('Missing or invalid required parameters', 400);
    }
    // Build query for Amazon API
    const query: any = {
      MarketplaceId: marketplaceId,
      [type === 'ASIN' ? 'Asins' : 'Skus']: identifiers.join(','),
    };
    try {
      // Call Amazon Competitive Pricing API
      const res = await amazonClient.get<any>(`/products/pricing/v0/competitivePrice`, query);
      // Normalize response: flatten to array of competitive pricing info
      return (res?.payload || []).map((item: any) => ({
        identifier: item[type === 'ASIN' ? 'ASIN' : 'SellerSKU'],
        price: item?.CompetitivePricing?.CompetitivePrices?.[0]?.Price?.ListingPrice?.Amount ?? null,
        currency: item?.CompetitivePricing?.CompetitivePrices?.[0]?.Price?.ListingPrice?.CurrencyCode ?? '',
        condition: item?.CompetitivePricing?.CompetitivePrices?.[0]?.condition,
        offersCount: item?.CompetitivePricing?.NumberOfOfferListings ?? 0,
      }));
    } catch (err) {
      throw this.createHttpError('Amazon getCompetitivePricing error: ' + (err as Error).message, 500);
    }
  }

  async getListingOffers(sellerSKU: string, params: GetOffersParams): Promise<OffersResponse> {
    // Validate required parameters
    if (!sellerSKU || !params?.marketplaceId) {
      throw this.createHttpError('Missing required parameters', 400);
    }
    // Build query for Amazon API
    const query: any = { MarketplaceId: params.marketplaceId };
    if (params.itemCondition) query.ItemCondition = params.itemCondition;
    if (params.customerType) query.CustomerType = params.customerType;
    try {
      // Call Amazon Listing Offers API
      const res = await amazonClient.get<any>(`/products/pricing/v0/listings/${encodeURIComponent(sellerSKU)}/offers`, query);
      // Normalize offers array from response
      return {
        identifier: sellerSKU,
        offers: (res?.payload?.Offers || []).map((offer: any) => ({
          price: offer?.ListingPrice?.Amount ?? null,
          currency: offer?.ListingPrice?.CurrencyCode ?? '',
          sellerId: offer?.SellerId ?? '',
          condition: offer?.ItemCondition ?? '',
          isPrime: !!offer?.IsPrime,
        })),
      };
    } catch (err) {
      throw this.createHttpError('Amazon getListingOffers error: ' + (err as Error).message, 500);
    }
  }

  async getItemOffers(asin: string, params: GetOffersParams): Promise<OffersResponse> {
    // Validate required parameters
    if (!asin || !params?.marketplaceId) {
      throw this.createHttpError('Missing required parameters', 400);
    }
    // Build query for Amazon API
    const query: any = { MarketplaceId: params.marketplaceId };
    if (params.itemCondition) query.ItemCondition = params.itemCondition;
    if (params.customerType) query.CustomerType = params.customerType;
    try {
      // Call Amazon Item Offers API
      const res = await amazonClient.get<any>(`/products/pricing/v0/items/${encodeURIComponent(asin)}/offers`, query);
      // Normalize offers array from response
      return {
        identifier: asin,
        offers: (res?.payload?.Offers || []).map((offer: any) => ({
          price: offer?.ListingPrice?.Amount ?? null,
          currency: offer?.ListingPrice?.CurrencyCode ?? '',
          sellerId: offer?.SellerId ?? '',
          condition: offer?.ItemCondition ?? '',
          isPrime: !!offer?.IsPrime,
        })),
      };
    } catch (err) {
      throw this.createHttpError('Amazon getItemOffers error: ' + (err as Error).message, 500);
    }
  }

  async getCompetitiveSummaryBatch(batchParams: GetCompetitiveSummaryBatchParams): Promise<CompetitiveSummaryBatchResponse[]> {
    // Validate batch size (Amazon allows max 20)
    if (!batchParams?.requests?.length || batchParams.requests.length > 20) {
      throw this.createHttpError('Batch must have 1-20 requests', 400);
    }
    try {
      // Call Amazon Competitive Summary Batch API
      const res = await amazonClient.post<any>(
        `/batches/products/pricing/2022-05-01/items/competitiveSummary`,
        { requests: batchParams.requests }
      );
      // Each result may have error or summary; normalize to array
      return (res?.responses || []).map((item: any) => ({
        asin: item?.asin,
        marketplaceId: item?.marketplaceId,
        summary: item?.summary
          ? {
              lowestPrice: item.summary.lowestPrice?.amount ?? null,
              currency: item.summary.lowestPrice?.currency ?? '',
              offerCount: item.summary.offerCount ?? 0,
            }
          : null,
        error: item?.error,
      }));
    } catch (err) {
      throw this.createHttpError('Amazon getCompetitiveSummaryBatch error: ' + (err as Error).message, 500);
    }
  }
}

export default new AmazonPricingService();
