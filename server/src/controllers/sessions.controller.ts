import type { Request, Response } from 'express';
import {
    addProduct,
    createSession,
    deleteProduct,
    deleteSession,
    getProduct,
    getSession,
    listProducts,
    listSessions,
    renameSession,
    updateProductFoundPrice,
    type SessionProductInput,
} from '../services/sessions.service.js';

/**
 * The auth middleware (`requireBearerToken`) has already validated the
 * `Authorization: Bearer <API_TOKEN>` header. We use that same token as
 * the user identity until real auth is added.
 */
function getApiToken(req: Request): string {
    const header = req.headers.authorization ?? '';
    return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function getPathParam(req: Request, key: string): string {
    const value = req.params[key];
    return typeof value === 'string' ? value : '';
}

function getStringParam(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function getNumberParam(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}

function getBoolParam(value: unknown): boolean {
    return value === true || value === 'true';
}

// ── Sessions ─────────────────────────────────────────────────────────

export async function listSessionsController(req: Request, res: Response) {
    try {
        const sessions = await listSessions(getApiToken(req));
        res.status(200).json({ sessions });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to list sessions',
        });
    }
}

export async function createSessionController(req: Request, res: Response) {
    try {
        const title = getStringParam(req.body?.title);
        if (!title) {
            return res.status(400).json({
                error: 'InvalidRequest',
                message: 'title is required',
            });
        }
        const session = await createSession(getApiToken(req), title);
        res.status(201).json({ session });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to create session',
        });
    }
}

export async function getSessionController(req: Request, res: Response) {
    try {
        const apiToken = getApiToken(req);
        const sessionId = getPathParam(req, 'sessionId');
        const session = await getSession(apiToken, sessionId);
        if (!session) {
            return res.status(404).json({ error: 'NotFound', message: 'Session not found' });
        }
        const products = await listProducts(apiToken, sessionId);
        res.status(200).json({ session, products });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to fetch session',
        });
    }
}

export async function renameSessionController(req: Request, res: Response) {
    try {
        const title = getStringParam(req.body?.title);
        if (!title) {
            return res.status(400).json({
                error: 'InvalidRequest',
                message: 'title is required',
            });
        }
        const session = await renameSession(getApiToken(req), getPathParam(req, 'sessionId'), title);
        if (!session) {
            return res.status(404).json({ error: 'NotFound', message: 'Session not found' });
        }
        res.status(200).json({ session });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to rename session',
        });
    }
}

export async function deleteSessionController(req: Request, res: Response) {
    try {
        const ok = await deleteSession(getApiToken(req), getPathParam(req, 'sessionId'));
        if (!ok) {
            return res.status(404).json({ error: 'NotFound', message: 'Session not found' });
        }
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to delete session',
        });
    }
}

// ── Products ─────────────────────────────────────────────────────────

function parseProductInput(body: unknown): SessionProductInput | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    const asin = getStringParam(b.asin);
    if (!asin) return null;
    const restrictions = Array.isArray(b.restrictions)
        ? (b.restrictions.filter((r) => typeof r === 'string') as string[])
        : [];
    return {
        asin,
        barcode: getStringParam(b.barcode) ?? '',
        barcodeType: getStringParam(b.barcodeType) ?? '',
        title: getStringParam(b.title) ?? 'Unknown Product',
        image: getStringParam(b.image) ?? '',
        rating: getNumberParam(b.rating),
        reviewCount: getNumberParam(b.reviewCount),
        category: getStringParam(b.category) ?? '',
        price: getNumberParam(b.price),
        foundPrice: getNumberParam(b.foundPrice),
        sellerPopularity: getStringParam(b.sellerPopularity) ?? 'Low',
        sellerPopularityScore: getNumberParam(b.sellerPopularityScore),
        estimatedShipping: getNumberParam(b.estimatedShipping),
        amazonFees: getNumberParam(b.amazonFees),
        profitMargin: getNumberParam(b.profitMargin),
        requiresApproval: getBoolParam(b.requiresApproval),
        competitionLevel: getStringParam(b.competitionLevel) ?? 'Low',
        bsr: getNumberParam(b.bsr),
        dimensions: getStringParam(b.dimensions) ?? '',
        weight: getStringParam(b.weight) ?? '',
        restrictions,
        monthlySalesEstimate: getNumberParam(b.monthlySalesEstimate),
        estimatedQuantity: getNumberParam(b.estimatedQuantity, 1),
    };
}

export async function listProductsController(req: Request, res: Response) {
    try {
        const products = await listProducts(getApiToken(req), getPathParam(req, 'sessionId'));
        res.status(200).json({ products });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to list products',
        });
    }
}

export async function addProductController(req: Request, res: Response) {
    try {
        const input = parseProductInput(req.body);
        if (!input) {
            return res.status(400).json({
                error: 'InvalidRequest',
                message: 'Valid product payload (with asin) is required',
            });
        }
        const product = await addProduct(
            getApiToken(req),
            getPathParam(req, 'sessionId'),
            input,
        );
        if (!product) {
            return res.status(404).json({ error: 'NotFound', message: 'Session not found' });
        }
        res.status(201).json({ product });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to add product',
        });
    }
}

export async function getProductController(req: Request, res: Response) {
    try {
        const product = await getProduct(
            getApiToken(req),
            getPathParam(req, 'sessionId'),
            getPathParam(req, 'productId'),
        );
        if (!product) {
            return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
        }
        res.status(200).json({ product });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to fetch product',
        });
    }
}

export async function updateProductFoundPriceController(req: Request, res: Response) {
    try {
        const foundPrice = getNumberParam(req.body?.foundPrice, NaN);
        const profitMargin = getNumberParam(req.body?.profitMargin, 0);
        if (!Number.isFinite(foundPrice) || foundPrice <= 0) {
            return res.status(400).json({
                error: 'InvalidRequest',
                message: 'foundPrice must be a positive number',
            });
        }
        const product = await updateProductFoundPrice(
            getApiToken(req),
            getPathParam(req, 'sessionId'),
            getPathParam(req, 'productId'),
            foundPrice,
            profitMargin,
        );
        if (!product) {
            return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
        }
        res.status(200).json({ product });
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to update product',
        });
    }
}

export async function deleteProductController(req: Request, res: Response) {
    try {
        const ok = await deleteProduct(
            getApiToken(req),
            getPathParam(req, 'sessionId'),
            getPathParam(req, 'productId'),
        );
        if (!ok) {
            return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
        }
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({
            error: error?.name || 'DatabaseError',
            message: error?.message || 'Failed to delete product',
        });
    }
}
