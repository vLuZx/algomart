/**
 * Normalize a catalog item from Amazon SP-API response
 */
export function normalizeCatalogItem(item) {
    // Extract title from summaries or attributes
    let title = null;
    if (item.summaries && item.summaries.length > 0 && item.summaries[0]) {
        title = item.summaries[0].itemName || null;
    }
    // Extract brand
    let brand = null;
    if (item.summaries && item.summaries.length > 0 && item.summaries[0]) {
        brand = item.summaries[0].brandName || null;
    }
    // Extract manufacturer
    let manufacturer = null;
    if (item.summaries && item.summaries.length > 0 && item.summaries[0]) {
        manufacturer = item.summaries[0].manufacturer || null;
    }
    // Extract image - prefer large images
    let image = null;
    if (item.images && item.images.length > 0) {
        // Find main image or first available
        const mainImage = item.images.find(img => img.variant === 'MAIN') || item.images[0];
        if (mainImage) {
            image = mainImage.link;
        }
    }
    // Extract product group/type
    let productGroup = null;
    let productType = null;
    if (item.summaries && item.summaries.length > 0 && item.summaries[0]?.browseClassification) {
        productGroup = item.summaries[0].browseClassification.displayName || null;
    }
    if (item.productTypes && item.productTypes.length > 0 && item.productTypes[0]) {
        productType = item.productTypes[0].productType || null;
    }
    // Extract identifiers
    const identifiers = (item.identifiers || []).map(id => ({
        type: id.identifierType,
        value: id.identifier,
    }));
    // Extract sales ranks
    let salesRanks = null;
    if (item.salesRanks && item.salesRanks.length > 0) {
        salesRanks = item.salesRanks.map(sr => ({
            category: sr.title,
            rank: sr.rank,
        }));
    }
    return {
        asin: item.asin,
        title,
        brand,
        manufacturer,
        image,
        productGroup,
        productType,
        identifiers,
        salesRanks,
        rawData: item,
    };
}
/**
 * Normalize pricing response from Amazon SP-API
 */
export function normalizePriceResponse(item) {
    let listingPrice = null;
    let landedPrice = null;
    let lowestPrice = null;
    let buyBoxPrice = null;
    let currency = 'USD';
    if (item.Product?.Offers && item.Product.Offers.length > 0) {
        const offer = item.Product.Offers[0];
        if (offer && offer.BuyingPrice?.ListingPrice) {
            listingPrice = {
                amount: offer.BuyingPrice.ListingPrice.Amount,
                currency: offer.BuyingPrice.ListingPrice.CurrencyCode,
            };
            currency = offer.BuyingPrice.ListingPrice.CurrencyCode;
        }
        if (offer && offer.BuyingPrice?.LandedPrice) {
            landedPrice = {
                amount: offer.BuyingPrice.LandedPrice.Amount,
                currency: offer.BuyingPrice.LandedPrice.CurrencyCode,
            };
        }
        if (offer && offer.RegularPrice) {
            buyBoxPrice = {
                amount: offer.RegularPrice.Amount,
                currency: offer.RegularPrice.CurrencyCode,
            };
        }
    }
    // Check competitive pricing for lowest price
    if (item.Product?.CompetitivePricing?.CompetitivePrices) {
        const competitivePrices = item.Product.CompetitivePricing.CompetitivePrices;
        if (competitivePrices.length > 0 && competitivePrices[0].Price?.ListingPrice) {
            const competitivePrice = competitivePrices[0].Price.ListingPrice;
            lowestPrice = {
                amount: competitivePrice.Amount,
                currency: competitivePrice.CurrencyCode,
            };
        }
    }
    return {
        asin: item.ASIN,
        listingPrice,
        landedPrice,
        lowestPrice,
        currency,
        buyBoxPrice,
        rawData: item,
    };
}
/**
 * Normalize offer summary from competitive pricing response
 * Note: Amazon SP-API does not always provide seller count directly.
 * This extracts the available offer count data by condition and fulfillment channel.
 */
export function normalizeOfferSummary(response) {
    if (!response.payload || response.payload.length === 0) {
        return null;
    }
    const item = response.payload[0];
    if (!item) {
        return null;
    }
    const asin = item.ASIN;
    const offerCounts = [];
    const competitivePrices = [];
    let totalOffers = 0;
    // Extract offer counts by condition and fulfillment channel
    if (item.Product?.CompetitivePricing?.NumberOfOfferListings) {
        const offerListings = item.Product.CompetitivePricing.NumberOfOfferListings;
        offerListings.forEach((listing) => {
            offerCounts.push({
                condition: listing.condition || 'Unknown',
                fulfillmentChannel: listing.fulfillmentChannel || 'Unknown',
                count: listing.offerCount || 0,
            });
            totalOffers += listing.offerCount || 0;
        });
    }
    // Extract competitive prices
    if (item.Product?.CompetitivePricing?.CompetitivePrices) {
        const prices = item.Product.CompetitivePricing.CompetitivePrices;
        prices.forEach((priceInfo) => {
            if (priceInfo.Price?.ListingPrice) {
                competitivePrices.push({
                    condition: priceInfo.condition || 'Unknown',
                    amount: priceInfo.Price.ListingPrice.Amount,
                    currency: priceInfo.Price.ListingPrice.CurrencyCode,
                    fulfillmentChannel: priceInfo.offerType,
                });
            }
        });
    }
    return {
        asin,
        offerCounts,
        competitivePrices,
        totalOffers,
        rawData: response,
    };
}
/**
 * Normalize sales rank data from catalog item
 */
export function normalizeSalesRank(item) {
    const salesRanks = [];
    let primaryCategory = null;
    let primaryRank = null;
    if (item.salesRanks && item.salesRanks.length > 0) {
        item.salesRanks.forEach(sr => {
            salesRanks.push({
                category: sr.title,
                rank: sr.rank,
            });
        });
        // First rank is typically the primary/main category
        if (item.salesRanks[0]) {
            primaryCategory = item.salesRanks[0].title;
            primaryRank = item.salesRanks[0].rank;
        }
    }
    return {
        asin: item.asin,
        salesRanks,
        primaryCategory,
        primaryRank,
        rawData: item,
    };
}
//# sourceMappingURL=response.utils.js.map