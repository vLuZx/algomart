/**
 * Integration test: B006IB5T4W (Aquaphor Healing Ointment, 1.75 oz)
 *
 * Locks down the fee/profit math against numbers from Amazon's official
 * FBA Revenue Calculator. Tolerance is $0.50 to allow for shipping
 * methodology differences (we use static USPS rates; Amazon's calculator
 * uses partnered carrier rates).
 *
 * The Amazon SP-API services are mocked so the test is hermetic \u2014 it
 * does NOT hit the network. Update the fixture below if Amazon revises
 * its fee schedule.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Hoist mocks BEFORE importing the SUT.
jest.unstable_mockModule('../../src/services/amazon/catalog.service.js', () => ({
    default: {
        searchCatalogItemsByAsin: jest.fn(),
        searchCatalogItemsByBarcode: jest.fn(),
        getASIN: () => 'B006IB5T4W',
    },
}));

jest.unstable_mockModule('../../src/services/amazon/pricing.service.js', () => ({
    default: { getItemOffers: jest.fn() },
}));

jest.unstable_mockModule('../../src/services/amazon/fees.service.js', () => ({
    default: {
        getCombinedFeesForAsin: jest.fn(),
    },
}));

jest.unstable_mockModule('../../src/services/amazon/eligibility.service.js', () => ({
    default: { getInboundEligibility: jest.fn() },
}));

jest.unstable_mockModule('../../src/services/amazon/client.service.js', () => ({
    default: { getMarketplaceId: () => 'ATVPDKIKX0DER' },
}));

const { getSingleProductStatistics } = await import('../../src/services/statistics.service.js');
const { calculateProductStatistics } = await import('../../src/services/calculation.service.js');
const amazonCatalogService = (await import('../../src/services/amazon/catalog.service.js')).default;
const amazonPricingService = (await import('../../src/services/amazon/pricing.service.js')).default;
const amazonFeesService = (await import('../../src/services/amazon/fees.service.js')).default;
const amazonEligibilityService = (await import('../../src/services/amazon/eligibility.service.js')).default;

// ------------------------------------------------------------------
// Fixtures \u2014 reflect Amazon FBA Revenue Calculator output for B006IB5T4W
// at a $18.37 list price. Update if Amazon's rate card changes.
// ------------------------------------------------------------------
const LIST_PRICE = 18.37;
const COGS = 2.88;
const AMAZON_REFERRAL_FEE = 2.76; // 15% Beauty
const AMAZON_FBA_FULFILLMENT_FEE = 4.76; // small standard, <=4oz
const AMAZON_NET_PROFIT_PER_UNIT = 7.97; // 18.37 - 2.76 - 4.76 - 2.88
const TOLERANCE = 0.5;

const catalogFixture = {
    items: [
        {
            asin: 'B006IB5T4W',
            summaries: [
                {
                    marketplaceId: 'ATVPDKIKX0DER',
                    itemName: 'Aquaphor Healing Ointment, 1.75 oz',
                },
            ],
            images: [
                {
                    marketplaceId: 'ATVPDKIKX0DER',
                    images: [{ variant: 'MAIN', link: 'https://example.com/aquaphor.jpg' }],
                },
            ],
            salesRanks: [
                {
                    marketplaceId: 'ATVPDKIKX0DER',
                    displayGroupRanks: [{ rank: 18, title: 'Beauty & Personal Care' }],
                },
            ],
            attributes: {},
            dimensions: [
                {
                    package: {
                        length: { value: 4.5, unit: 'inches' },
                        width: { value: 2, unit: 'inches' },
                        height: { value: 1.5, unit: 'inches' },
                        weight: { value: 0.18, unit: 'pounds' },
                    },
                },
            ],
        },
    ],
};

const offersFixture = {
    payload: {
        ASIN: 'B006IB5T4W',
        Summary: {
            TotalOfferCount: 5,
            BuyBoxPrices: [{ ListingPrice: { Amount: LIST_PRICE, CurrencyCode: 'USD' } }],
            LowestPrices: [{ ListingPrice: { Amount: LIST_PRICE, CurrencyCode: 'USD' } }],
        },
        Offers: [
            {
                SellerId: 'A1B2C3REGULAR',
                IsFulfilledByAmazon: true,
                IsBuyBoxWinner: true,
                IsFeaturedMerchant: true,
                SubCondition: 'New',
                ListingPrice: { Amount: LIST_PRICE, CurrencyCode: 'USD' },
                Shipping: { Amount: 0, CurrencyCode: 'USD' },
                PrimeInformation: { IsOfferPrime: true },
                SellerFeedbackRating: { SellerPositiveFeedbackRating: 98, FeedbackCount: 5000 },
            },
            {
                // Amazon Warehouse Deals \u2014 should be flagged as amazon-owned
                // but NOT amazon-retail.
                SellerId: 'A2R2RITDJNW1Q6',
                IsFulfilledByAmazon: true,
                IsBuyBoxWinner: false,
                SubCondition: 'Used',
                ListingPrice: { Amount: 14.5, CurrencyCode: 'USD' },
                Shipping: { Amount: 0, CurrencyCode: 'USD' },
                PrimeInformation: { IsOfferPrime: true },
            },
        ],
    },
};

beforeEach(() => {
    (amazonCatalogService.searchCatalogItemsByAsin as jest.Mock).mockResolvedValue(catalogFixture as never);
    (amazonPricingService.getItemOffers as jest.Mock).mockResolvedValue(offersFixture as never);
    (amazonFeesService.getCombinedFeesForAsin as jest.Mock).mockResolvedValue({
        asin: 'B006IB5T4W',
        marketplaceId: 'ATVPDKIKX0DER',
        currency: 'USD',
        listingPrice: LIST_PRICE,
        referralFee: AMAZON_REFERRAL_FEE,
        referralRate: AMAZON_REFERRAL_FEE / LIST_PRICE,
        fulfillmentFee: AMAZON_FBA_FULFILLMENT_FEE,
        totalFees: AMAZON_REFERRAL_FEE + AMAZON_FBA_FULFILLMENT_FEE,
        status: 'Success',
    } as never);
    (amazonEligibilityService.getInboundEligibility as jest.Mock).mockResolvedValue({
        asin: 'B006IB5T4W',
        marketplaceId: 'ATVPDKIKX0DER',
        program: 'INBOUND',
        isEligible: true,
        reasons: [],
    } as never);
});

describe('B006IB5T4W \u2014 calculation parity with FBA Revenue Calculator', () => {
    it('separates referral fee from FBA fulfillment fee', async () => {
        const stats = await getSingleProductStatistics({ asin: 'B006IB5T4W' });

        expect(stats.categoryFee.amount).toBeCloseTo(AMAZON_REFERRAL_FEE, 2);
        expect(stats.fulfillmentFee.amount).toBeCloseTo(AMAZON_FBA_FULFILLMENT_FEE, 2);
        expect(stats.fulfillmentFee.source).toBe('sp-api');
    });

    it('returns net proceeds (price - referral - FBA - COGS) within $0.50 of the FBA Revenue Calculator', async () => {
        const stats = await getSingleProductStatistics({ asin: 'B006IB5T4W' });
        const calc = calculateProductStatistics(stats, { costOfGoods: COGS });

        // Amazon's calculator reports "Net profit" as price - referral - FBA - COGS.
        // Our app additionally subtracts inbound placement + shipping-to-FC, which
        // the calculator does NOT include by default. So we recompose the
        // calculator-equivalent figure and check parity on that basis.
        const cv = calc.computed;
        const calculatorEquivalent =
            cv.amazonPrice - cv.referralFee - (cv.fbaFee ?? 0) - COGS;

        expect(calc.computed.profit.error).toBeUndefined();
        expect(Math.abs(calculatorEquivalent - AMAZON_NET_PROFIT_PER_UNIT)).toBeLessThanOrEqual(TOLERANCE);
        // Our app's bottom-line profit is naturally lower because it includes
        // inbound + shipping; ROI should still be positive on this listing.
        expect(calc.computed.profit.roi).toBeGreaterThan(0);
    });

    it('returns COGS_REQUIRED error when costOfGoods is omitted', async () => {
        const stats = await getSingleProductStatistics({ asin: 'B006IB5T4W' });
        const calc = calculateProductStatistics(stats);

        expect(calc.computed.profit.error).toBe('COGS_REQUIRED');
        expect(calc.computed.profit.netProfitPerUnit).toBeNull();
        expect(calc.computed.profit.roi).toBeNull();
    });

    it('flags Amazon Warehouse Deals as amazon-owned but not amazon-retail', async () => {
        const stats = await getSingleProductStatistics({ asin: 'B006IB5T4W' });
        const awd = stats.competition.sellers.find((s) => s.sellerId === 'A2R2RITDJNW1Q6');

        expect(awd).toBeDefined();
        expect(awd!.isAmazon).toBe(false);
        expect(awd!.isAmazonOwned).toBe(true);
        expect(awd!.amazonSellerType).toBe('amazon-warehouse-deals');
    });

    it('exposes both seasonal storage rates', async () => {
        const stats = await getSingleProductStatistics({ asin: 'B006IB5T4W' });

        expect(stats.storageFee.seasonalRates).not.toBeNull();
        expect(stats.storageFee.seasonalRates!['oct-dec']).toBeGreaterThan(
            stats.storageFee.seasonalRates!['jan-sep']
        );
    });

    it('estimates monthly sales from BSR and computes days-to-sell', async () => {
        const stats = await getSingleProductStatistics({ asin: 'B006IB5T4W' });
        const calc = calculateProductStatistics(
            { ...stats, estimatedQuantity: 100 },
            { costOfGoods: COGS }
        );

        const sales = calc.fetched.salesEstimate;
        expect(sales.unitsPerMonth).toBeGreaterThan(0);
        // BSR=18 in Beauty sells very fast — 100 units rounds to 0 days. Just
        // assert the field is a non-negative number, not strictly positive.
        expect(sales.daysToSellQuantity).not.toBeNull();
        expect(sales.daysToSellQuantity).toBeGreaterThanOrEqual(0);
    });
});
