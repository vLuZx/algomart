import amazonClient from './client.service.js';
import type {
	BarcodeType,
	AmazonCatalogResponse,
} from '../../types/amazon.types.js';
import { inferBarcodeType,  isValidBarcode } from '../../utils/barcode.utils.js';

/**
 * Amazon Catalog Items API Service
 * Handles product lookup by UPC, EAN, or ASIN
 */
class AmazonCatalogService {
	private readonly API_VERSION = '2022-04-01';
	private readonly SEARCH_INCLUDED_DATA = 'identifiers,summaries,productTypes,salesRanks,dimensions,images,attributes';

	private createHttpError(message: string, statusCode: number, name = 'AmazonCatalogError'): Error {
		const error = new Error(message) as Error & { statusCode?: number };
		error.name = name;
		error.statusCode = statusCode;
		return error;
	}

	/**
	 * Search catalog items by barcode
	 */
	async searchCatalogItemsByBarcode(barcode: string): Promise<any> {

		// Trim the barcode
		const cleanBarcode = barcode.trim();

		// Check is the barcode is considered valid
		if (!isValidBarcode(cleanBarcode)) {
			throw this.createHttpError('Invalid barcode input. Barcode must be 12 digits (UPC) or 13 digits (EAN).', 400, 'InvalidBarcodeError');
		}

		// Prepare to make request
		const resolvedIdentifierType: BarcodeType = inferBarcodeType(barcode)
		const marketplaceId = amazonClient.getMarketplaceId();

		// Attempt to make a request to the SP-API for the item with the barcode
		try {
			return await amazonClient.get<any>(`/catalog/${this.API_VERSION}/items`, {
				identifiers: cleanBarcode,
				identifiersType: resolvedIdentifierType,
				marketplaceIds: marketplaceId,
				includedData: this.SEARCH_INCLUDED_DATA,
			});
		} 
		// Error Case: Bad response
		catch (error) {
			throw this.createHttpError(`
				Error: ${error}, 
				Message: Failed to search catalog for ${resolvedIdentifierType} ${cleanBarcode}`, 500, 'AmazonCatalogSearchError'
			);
		}
	}

	/**
	 * Search catalog items by ASIN
	 */
	async searchCatalogItemsByAsin(asin: string): Promise<any> {
		const cleanAsin = asin.trim();
		if (!cleanAsin) {
			throw this.createHttpError('ASIN is required', 400, 'InvalidAsinError');
		}

		const marketplaceId = amazonClient.getMarketplaceId();

		try {
			return await amazonClient.get<any>(`/catalog/${this.API_VERSION}/items`, {
				identifiers: cleanAsin,
				identifiersType: 'ASIN',
				marketplaceIds: marketplaceId,
				includedData: this.SEARCH_INCLUDED_DATA,
			});
		} catch (error) {
			throw this.createHttpError(
				`Error: ${error}, Message: Failed to search catalog for ASIN ${cleanAsin}`,
				500,
				'AmazonCatalogSearchError'
			);
		}
	}

	public getASIN(catalogSearchResponse: AmazonCatalogResponse): string  {
		if (!catalogSearchResponse.items || catalogSearchResponse.items.length === 0) {
			throw this.createHttpError('No items found in catalog search response', 404, 'CatalogItemNotFoundError');
		}
		if (catalogSearchResponse.items[0]?.asin === undefined) {
			throw this.createHttpError('ASIN not found in catalog search response', 404, 'AsinNotFoundError');
		}
		return catalogSearchResponse.items[0]?.asin;
	}

}

export default new AmazonCatalogService();
