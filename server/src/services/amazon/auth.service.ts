import axios from 'axios';
import type { LWAAccessTokenResponse, CachedToken } from '../../types/amazon.types.js';

/**
 * Amazon LWA (Login with Amazon) Authentication Service
 * Handles OAuth token retrieval and caching for SP-API
 */
class AmazonAuthService {
	private tokenCache: CachedToken | null = null;
	private readonly LWA_ENDPOINT = 'https://api.amazon.com/auth/o2/token';

	/**
	 * Get a valid access token, refreshing if necessary
	 */
	async getAccessToken(): Promise<string> {
		if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
			return this.tokenCache.accessToken;
		}

		return this.refreshAccessToken();
	}

	/**
	 * Request a new access token from LWA
	 */
	private async refreshAccessToken(): Promise<string> {
		const clientId = process.env.SP_API_CLIENT_ID;
		const clientSecret = process.env.SP_API_CLIENT_SECRET;
		const refreshToken = process.env.SP_API_REFRESH_TOKEN;

		if (!clientId || !clientSecret || !refreshToken) {
			throw new Error('Missing required SP-API credentials in environment variables');
		}

		const formBody = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
		});

		try {
			const response = await axios.post<LWAAccessTokenResponse>(
				this.LWA_ENDPOINT,
				formBody.toString(),
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					},
					timeout: 10000,
				}
			);

			const { access_token, expires_in } = response.data;

			if (!access_token || !expires_in) {
				throw new Error('Amazon LWA token response was missing access token data');
			}

			this.tokenCache = {
				accessToken: access_token,
				expiresAt: Date.now() + Math.max(expires_in - 60, 60) * 1000,
			};

			return access_token;
		} catch (error: any) {
			console.error('Failed to refresh LWA access token:', error.response?.data || error.message);
			throw new Error('Failed to authenticate with Amazon SP-API');
		}
	}

	/**
	 * Clear the cached token (useful for testing or forcing refresh)
	 */
	clearTokenCache(): void {
		this.tokenCache = null;
	}
}

export default new AmazonAuthService();
