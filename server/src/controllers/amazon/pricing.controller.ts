
import type { Request, Response } from 'express';
import pricingService from '../../services/amazon/pricing.service.js';

function parseIdentifiers(identifiers: unknown): string[] {
  if (typeof identifiers === 'string') {
    return identifiers
      .split(',')
      .map((identifier) => identifier.trim())
      .filter(Boolean);
  }

  if (Array.isArray(identifiers)) {
    return identifiers
      .filter((identifier): identifier is string => typeof identifier === 'string')
      .map((identifier) => identifier.trim())
      .filter(Boolean);
  }

  return [];
}

function parseSingleValue(value: unknown): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== 'string') {
    return undefined;
  }

  const trimmedValue = rawValue.trim();
  return trimmedValue || undefined;
}

export async function getPricing(req: Request, res: Response) {
  try {
    const { identifiers, type, marketplaceId, itemCondition, customerType } = req.query;
    const ids = parseIdentifiers(identifiers);
    const pricingParams: Parameters<typeof pricingService.getPricing>[0] = {
      identifiers: ids,
      type: (parseSingleValue(type) as 'ASIN' | 'SKU') ?? 'ASIN',
      marketplaceId: parseSingleValue(marketplaceId) ?? '',
    };

    const parsedItemCondition = parseSingleValue(itemCondition);
    if (parsedItemCondition) {
      pricingParams.itemCondition = parsedItemCondition;
    }

    const parsedCustomerType = parseSingleValue(customerType);
    if (parsedCustomerType) {
      pricingParams.customerType = parsedCustomerType;
    }

    const result = await pricingService.getPricing(pricingParams);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

export async function getCompetitivePricing(req: Request, res: Response) {
  try {
    const { identifiers, type, marketplaceId } = req.query;
    const ids = parseIdentifiers(identifiers);
    const result = await pricingService.getCompetitivePricing({
      identifiers: ids,
      type: (parseSingleValue(type) as 'ASIN' | 'SKU') ?? 'ASIN',
      marketplaceId: parseSingleValue(marketplaceId) ?? '',
    });
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

export async function getListingOffers(req: Request, res: Response) {
  try {
    let sellerSKU = req.params.sellerSKU;
    if (Array.isArray(sellerSKU)) sellerSKU = sellerSKU[0];
    const { marketplaceId, itemCondition, customerType } = req.query;
    const offersParams: Parameters<typeof pricingService.getListingOffers>[1] = {
      marketplaceId: parseSingleValue(marketplaceId) ?? '',
    };

    const parsedItemCondition = parseSingleValue(itemCondition);
    if (parsedItemCondition) {
      offersParams.itemCondition = parsedItemCondition;
    }

    const parsedCustomerType = parseSingleValue(customerType);
    if (parsedCustomerType) {
      offersParams.customerType = parsedCustomerType;
    }

    const result = await pricingService.getListingOffers(sellerSKU ?? '', offersParams);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

export async function getItemOffers(req: Request, res: Response) {
  try {
    let asin = req.params.asin;
    if (Array.isArray(asin)) asin = asin[0];
    const { marketplaceId, itemCondition, customerType } = req.query;
    const offersParams: Parameters<typeof pricingService.getItemOffers>[1] = {
      marketplaceId: parseSingleValue(marketplaceId) ?? '',
    };

    const parsedItemCondition = parseSingleValue(itemCondition);
    if (parsedItemCondition) {
      offersParams.itemCondition = parsedItemCondition;
    }

    const parsedCustomerType = parseSingleValue(customerType);
    if (parsedCustomerType) {
      offersParams.customerType = parsedCustomerType;
    }

    const result = await pricingService.getItemOffers(asin ?? '', offersParams);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

export async function getCompetitiveSummaryBatch(req: Request, res: Response) {
  try {
    const { requests } = req.body;
    const result = await pricingService.getCompetitiveSummaryBatch({ requests });
    // If some items have errors, return 207 Multi-Status, else 200
    const hasPartial = result.some(r => r.error);
    res.status(hasPartial ? 207 : 200).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}
