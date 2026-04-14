import amazonClient from './client.service.js';
import type {
	BarcodeType,
	CatalogSearchResponse,
} from '../../types/amazon.types.js';
import { inferBarcodeType,  isValidBarcode } from '../../utils/barcode.utils.js';

/**
 * Amazon Catalog Items API Service
 * Handles product lookup by UPC, EAN, or ASIN
 */
class AmazonCatalogService {
	private readonly API_VERSION = '2022-04-01';
	private readonly SEARCH_INCLUDED_DATA = 'identifiers,summaries,productTypes';

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
			return await amazonClient.get<CatalogSearchResponse>(`/catalog/${this.API_VERSION}/items`, {
				identifiers: cleanBarcode,
				identifiersType: resolvedIdentifierType,
				marketplaceIds: marketplaceId,
				includedData: this.SEARCH_INCLUDED_DATA,
			});
		} 
		// Error Case: Bad response
		catch (error) {
			console.log(error + `Message: Failed to search catalog for ${resolvedIdentifierType} ${cleanBarcode}`);
		}
	}

}

export default new AmazonCatalogService();
