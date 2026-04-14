import type { Request, Response } from 'express';
import amazonCatalogService from '../../services/amazon/catalog.service.js';

export async function searchByBarcode(req: Request, res: Response) {
    // Use :code param to get barcode
    const { code } = req.params;
    // Check if code in undefined on string[], must be string type only
    if (!code || Array.isArray(code)) {
        return res.status(400).json({ error: 'Invalid barcode parameter' });
    }
    // Attenots to make request to service
    try {
        const result = await amazonCatalogService.searchCatalogItemsByBarcode(code);
        res.json(result);
    } 
    // Error Case: Request failed, send Bad Response status with error message
    catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
}
