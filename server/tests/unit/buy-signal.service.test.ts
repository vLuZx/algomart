import { describe, it, expect } from '@jest/globals';
import {
    computeBuySignal,
    type BuySignalInput,
} from '../../src/services/buy-signal.service.js';
import type {
    CompetitionAggregate,
    SellerOffer,
} from '../../src/services/statistics.service.js';

// ────────────────────────────────────────────────────────────────────────────
// Fixture builders
// ────────────────────────────────────────────────────────────────────────────

const baseAggregate = (overrides: Partial<CompetitionAggregate> = {}): CompetitionAggregate => ({
    totalSellerCount: 3,
    fbaSellerCount: 2,
    fbmSellerCount: 1,
    newConditionCount: 3,
    amazonIsSelling: false,
    amazonIsBuyBoxWinner: false,
    buyBoxPrice: { amount: 25, currency: 'USD' },
    buyBoxSellerId: 'A1',
    lowestFbaPrice: { amount: 25, currency: 'USD' },
    lowestFbmPrice: null,
    priceSpread: 1,
    averageFeedbackRating: 95,
    ...overrides,
});

const seller = (overrides: Partial<SellerOffer> = {}): SellerOffer => ({
    sellerId: 'A1',
    isAmazon: false,
    isAmazonOwned: false,
    amazonSellerType: null,
    isFulfilledByAmazon: true,
    isBuyBoxWinner: false,
    isFeaturedMerchant: true,
    isPrimeEligible: true,
    condition: 'New',
    listingPrice: { amount: 25, currency: 'USD' },
    shippingPrice: { amount: 0, currency: 'USD' },
    landedPrice: { amount: 25, currency: 'USD' },
    feedbackRating: 98,
    feedbackCount: 5000,
    shipsFrom: 'US',
    ...overrides,
});

const baseInput = (overrides: Partial<BuySignalInput> = {}): BuySignalInput => ({
    amazonPrice: 25,
    costOfGoods: 8,
    referralFee: 3.75,
    fulfillmentFee: 4.5,
    // 25 - 3.75 - 4.5 - 8 = 8.75
    netProfitPerUnit: 8.75,
    roi: 109.4,           // 8.75 / 8 = 109.4%
    marginPercentage: 35, // 8.75 / 25 = 35%
    daysToSell: 10,
    bsrCategory: 'Health & Personal Care',
    competition: { aggregate: baseAggregate(), sellers: [seller({ isBuyBoxWinner: true })] },
    flags: { isHazmat: false },
    weightLb: 0.5,
    estimatedBuyBoxSharePct: 33,
    inboundEligible: true,
    now: new Date('2026-04-15'), // not Q4-approaching
    ...overrides,
});

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('computeBuySignal — tier classification', () => {
    it('returns BUY for a healthy mid-tier product', () => {
        const result = computeBuySignal(baseInput());
        expect(result.tier).toBe('BUY');
        expect(result.score).toBeGreaterThanOrEqual(66);
        expect(result.score).toBeLessThan(86);
        expect(result.hardDisqualifiers).toEqual([]);
    });

    it('reaches STRONG_BUY for a near-perfect setup (alignment bonus)', () => {
        const result = computeBuySignal(
            baseInput({
                // 60% margin, 150% ROI on Books (4% returns), 5 day sell-through,
                // Amazon not selling, 1 FBA competitor, light item.
                amazonPrice: 30,
                costOfGoods: 12,
                referralFee: 4.5,
                fulfillmentFee: 4.5,
                netProfitPerUnit: 18, // 30 * 0.6
                roi: 150,
                marginPercentage: 60,
                daysToSell: 5,
                bsrCategory: 'Books',
                competition: {
                    aggregate: baseAggregate({
                        fbaSellerCount: 1,
                        amazonIsSelling: false,
                        priceSpread: 0.5,
                    }),
                    sellers: [seller({ isBuyBoxWinner: true })],
                },
                weightLb: 0.5,
                estimatedBuyBoxSharePct: 50,
            })
        );
        expect(result.tier).toBe('STRONG_BUY');
        expect(result.score).toBeGreaterThanOrEqual(86);
    });

    it('returns AVOID for a no-margin slow seller', () => {
        const result = computeBuySignal(
            baseInput({
                amazonPrice: 10,
                costOfGoods: 9,
                referralFee: 1.5,
                fulfillmentFee: 4,
                netProfitPerUnit: -4.5,
                roi: -50,
                marginPercentage: -45,
                daysToSell: 200,
            })
        );
        expect(result.tier).toBe('AVOID');
        expect(result.score).toBeLessThanOrEqual(30);
        expect(result.hardDisqualifiers).toContain('NEGATIVE_PROFIT');
    });
});

describe('computeBuySignal — hard disqualifiers cap at 30', () => {
    it('caps when ROI < 10%', () => {
        const result = computeBuySignal(
            baseInput({ roi: 5, marginPercentage: 12, netProfitPerUnit: 1, costOfGoods: 20 })
        );
        expect(result.hardDisqualifiers).toContain('LOW_ROI');
        expect(result.score).toBeLessThanOrEqual(30);
    });

    it('caps when margin < 8%', () => {
        const result = computeBuySignal(
            baseInput({ marginPercentage: 5, roi: 50, netProfitPerUnit: 1.25, amazonPrice: 25 })
        );
        expect(result.hardDisqualifiers).toContain('LOW_MARGIN');
        expect(result.score).toBeLessThanOrEqual(30);
    });

    it('caps when Amazon Retail wins the Buy Box on new inventory', () => {
        const result = computeBuySignal(
            baseInput({
                competition: {
                    aggregate: baseAggregate({ amazonIsSelling: true, amazonIsBuyBoxWinner: true }),
                    sellers: [
                        seller({
                            sellerId: 'ATVPDKIKX0DER',
                            isAmazon: true,
                            isAmazonOwned: true,
                            amazonSellerType: 'amazon-retail',
                            isBuyBoxWinner: true,
                            condition: 'New',
                        }),
                    ],
                },
            })
        );
        expect(result.hardDisqualifiers).toContain('AMAZON_RETAIL_BUY_BOX');
        expect(result.score).toBeLessThanOrEqual(30);
    });

    it('caps when Amazon Warehouse Deals wins the Buy Box', () => {
        const result = computeBuySignal(
            baseInput({
                competition: {
                    aggregate: baseAggregate(),
                    sellers: [
                        seller({
                            sellerId: 'A2R2RITDJNW1Q6',
                            isAmazonOwned: true,
                            amazonSellerType: 'amazon-warehouse-deals',
                            isBuyBoxWinner: true,
                            condition: 'Used',
                        }),
                    ],
                },
            })
        );
        expect(result.hardDisqualifiers).toContain('AMAZON_WAREHOUSE_DEALS_BUY_BOX');
        expect(result.score).toBeLessThanOrEqual(30);
    });

    it('caps when inbound ineligible', () => {
        const result = computeBuySignal(baseInput({ inboundEligible: false }));
        expect(result.hardDisqualifiers).toContain('INBOUND_INELIGIBLE');
        expect(result.score).toBeLessThanOrEqual(30);
    });

    it('caps when hazmat-flagged', () => {
        const result = computeBuySignal(baseInput({ flags: { isHazmat: true } }));
        expect(result.hardDisqualifiers).toContain('HAZMAT_RESTRICTED');
        expect(result.score).toBeLessThanOrEqual(30);
    });

    it('emits COGS_REQUIRED when costOfGoods missing', () => {
        const result = computeBuySignal(
            baseInput({ costOfGoods: null, netProfitPerUnit: null, roi: null, marginPercentage: null })
        );
        expect(result.hardDisqualifiers).toContain('COGS_REQUIRED');
        expect(result.score).toBeLessThanOrEqual(30);
        expect(result.breakdown.profitability.score).toBe(0);
    });
});

describe('computeBuySignal — component scoring', () => {
    it('awards full velocity points for <7 day sell-through', () => {
        const result = computeBuySignal(baseInput({ daysToSell: 5 }));
        expect(result.breakdown.velocity.score).toBe(25);
    });

    it('awards zero velocity points for >180 day sell-through', () => {
        const result = computeBuySignal(baseInput({ daysToSell: 200 }));
        expect(result.breakdown.velocity.score).toBe(0);
    });

    it('awards zero velocity points when daysToSell unknown', () => {
        const result = computeBuySignal(baseInput({ daysToSell: null }));
        expect(result.breakdown.velocity.score).toBe(0);
        expect(result.breakdown.velocity.details).toMatch(/unknown/i);
    });

    it('penalizes saturated FBA competition', () => {
        const result = computeBuySignal(
            baseInput({
                competition: {
                    aggregate: baseAggregate({ fbaSellerCount: 12 }),
                    sellers: [seller({ isBuyBoxWinner: true })],
                },
                estimatedBuyBoxSharePct: 5,
            })
        );
        // 12 sellers => 0 FBA points; Amazon not selling +5; share <20% +0
        expect(result.breakdown.competition.score).toBe(5);
    });

    it('rewards low-competition listings with no Amazon presence', () => {
        const result = computeBuySignal(
            baseInput({
                competition: {
                    aggregate: baseAggregate({ fbaSellerCount: 1, amazonIsSelling: false }),
                    sellers: [seller({ isBuyBoxWinner: true })],
                },
                estimatedBuyBoxSharePct: 50,
            })
        );
        // +5 (Amazon absent) + 10 (1 FBA) + 5 (>40% share) = 20
        expect(result.breakdown.competition.score).toBe(20);
    });
});

describe('computeBuySignal — risk penalties', () => {
    it('applies -5 when item weight > 5 lb (not stacked with -3)', () => {
        const result = computeBuySignal(baseInput({ weightLb: 6 }));
        expect(result.breakdown.riskPenalties.score).toBe(5);
    });

    it('applies -3 when item weight 3-5 lb', () => {
        const result = computeBuySignal(baseInput({ weightLb: 4 }));
        expect(result.breakdown.riskPenalties.score).toBe(3);
    });

    it('applies AWD-present penalty when AWD is in offers but not winning', () => {
        const result = computeBuySignal(
            baseInput({
                competition: {
                    aggregate: baseAggregate(),
                    sellers: [
                        seller({ isBuyBoxWinner: true }),
                        seller({
                            sellerId: 'AWD1',
                            isAmazonOwned: true,
                            amazonSellerType: 'amazon-warehouse-deals',
                            isBuyBoxWinner: false,
                            condition: 'Used',
                        }),
                    ],
                },
            })
        );
        expect(result.breakdown.riskPenalties.score).toBeGreaterThanOrEqual(8);
        // AWD not winning => penalty applies but no hard disqualifier
        expect(result.hardDisqualifiers).not.toContain('AMAZON_WAREHOUSE_DEALS_BUY_BOX');
    });

    it('applies Q4-approaching penalty for slow movers', () => {
        const result = computeBuySignal(
            baseInput({ daysToSell: 45, now: new Date('2026-09-15') })
        );
        expect(result.breakdown.riskPenalties.details.some((d) => /Q4/.test(d))).toBe(true);
    });

    it('does NOT apply Q4 penalty in spring', () => {
        const result = computeBuySignal(
            baseInput({ daysToSell: 45, now: new Date('2026-04-15') })
        );
        expect(result.breakdown.riskPenalties.details.some((d) => /Q4/.test(d))).toBe(false);
    });
});

describe('computeBuySignal — return-rate adjustment', () => {
    it('adjusts profit using the matched category rate', () => {
        const result = computeBuySignal(
            baseInput({ bsrCategory: 'Clothing, Shoes & Jewelry' })
        );
        expect(result.returnAdjustment.expectedReturnRate).toBe(0.30);
        expect(result.returnAdjustment.adjustedProfit).toBeLessThan(
            result.returnAdjustment.rawProfit
        );
        expect(result.returnAdjustment.adjustedROI).toBeLessThan(
            result.returnAdjustment.rawROI
        );
    });

    it('uses the default 10% rate when category does not match', () => {
        const result = computeBuySignal(
            baseInput({ bsrCategory: 'Industrial & Scientific' })
        );
        expect(result.returnAdjustment.expectedReturnRate).toBe(0.10);
    });

    it('uses default rate when BSR category is null', () => {
        const result = computeBuySignal(baseInput({ bsrCategory: null }));
        expect(result.returnAdjustment.expectedReturnRate).toBe(0.10);
        expect(result.returnAdjustment.category).toBe('Unknown');
    });

    it('lowers tier when category has high return rate', () => {
        const lowReturn = computeBuySignal(baseInput({ bsrCategory: 'Books' }));
        const highReturn = computeBuySignal(
            baseInput({ bsrCategory: 'Clothing, Shoes & Jewelry' })
        );
        expect(highReturn.score).toBeLessThan(lowReturn.score);
    });
});

describe('computeBuySignal — output shape', () => {
    it('always exposes a complete breakdown', () => {
        const result = computeBuySignal(baseInput());
        expect(result.breakdown).toHaveProperty('profitability');
        expect(result.breakdown).toHaveProperty('velocity');
        expect(result.breakdown).toHaveProperty('competition');
        expect(result.breakdown).toHaveProperty('riskPenalties');
        expect(typeof result.summary).toBe('string');
        expect(Array.isArray(result.primaryReasons)).toBe(true);
        expect(Array.isArray(result.wouldBecomeBuyIf)).toBe(true);
    });

    it('clamps score into 0-100', () => {
        const result = computeBuySignal(baseInput());
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
    });
});
