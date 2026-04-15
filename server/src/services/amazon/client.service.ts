import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';
import aws4 from 'aws4';
import amazonAuthService from './auth.service.js';

type QueryParamValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

type AmazonRequestHeaders = Record<string, string>;

type AwsSigningCredentials = {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
};

type AmazonClientError = Error & {
	statusCode?: number;
};

/**
 * Amazon SP-API HTTP client.
 *
 * Responsibilities:
 * - Build request URLs
 * - Add query params
 * - Fetch the LWA access token
 * - Sign requests with AWS SigV4
 * - Normalize Amazon errors
 */
class AmazonClientService {
	private readonly httpClient: AxiosInstance;
	private readonly apiEndpoint: string;
	private readonly awsRegion: string;
	private readonly marketplaceId: string;
	private readonly userAgent: string;
	private readonly defaultTimeoutMs = 30_000;

	constructor() {
		this.apiEndpoint =
			process.env.SP_API_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com';
		this.awsRegion = process.env.AWS_REGION || 'us-east-1';
		this.marketplaceId = process.env.SP_API_MARKETPLACE_ID || 'ATVPDKIKX0DER';
		this.userAgent =
			process.env.SP_API_USER_AGENT || 'AlgoMart/1.0 (Language=TypeScript)';

		this.httpClient = axios.create({
			timeout: this.defaultTimeoutMs,
		});
	}

	/**
	 * Send a signed request to Amazon SP-API.
	 */
	async request<T>(config: AxiosRequestConfig): Promise<T> {
		const method = this.getHttpMethod(config.method);
		const url = this.buildUrl(config.url || '/', config.params as QueryParams | undefined);
		const accessToken = await amazonAuthService.getAccessToken();
		const requestBody = this.buildRequestBody(method, config.data);
		const unsignedHeaders = this.buildUnsignedHeaders(config.headers, accessToken, requestBody);
		const awsCredentials = this.getAwsSigningCredentials();
		const signedHeaders = this.signRequest({
			url,
			method,
			headers: unsignedHeaders,
			body: requestBody,
			credentials: awsCredentials,
		});

		try {
			const response = await this.httpClient.request<T>({
				method,
				url: url.toString(),
				headers: signedHeaders,
				data: requestBody,
				timeout: config.timeout || this.defaultTimeoutMs,
			});

			return response.data;
		} catch (error: unknown) {
			this.throwFormattedAmazonError(error, url);
		}
	}

	/**
	 * Make a GET request.
	 */
	async get<T>(url: string, params?: QueryParams): Promise<T> {
		return this.request<T>({
			method: 'GET',
			url,
			params,
		});
	}

	/**
	 * Make a POST request.
	 */
	async post<T>(url: string, data?: unknown): Promise<T> {
		return this.request<T>({
			method: 'POST',
			url,
			data,
		});
	}

	/**
	 * Return the configured marketplace ID.
	 */
	getMarketplaceId(): string {
		return this.marketplaceId;
	}

	private getHttpMethod(method?: string): string {
		return method?.toUpperCase() || 'GET';
	}

	private buildUrl(path: string, queryParams?: QueryParams): URL {
		const normalizedBaseUrl = this.apiEndpoint.endsWith('/')
			? this.apiEndpoint
			: `${this.apiEndpoint}/`;

		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		const url = new URL(normalizedPath, normalizedBaseUrl);
		const searchParams = new URLSearchParams(url.search);

		for (const [key, value] of Object.entries(queryParams || {})) {
			this.appendQueryParam(searchParams, key, value);
		}

		url.search = searchParams.toString();
		return url;
	}

	private appendQueryParam(
		searchParams: URLSearchParams,
		key: string,
		value: QueryParams[string]
	): void {
		if (value === undefined || value === null) {
			return;
		}

		if (Array.isArray(value)) {
			for (const entry of value) {
				this.appendQueryParam(searchParams, key, entry);
			}
			return;
		}

		searchParams.append(key, String(value));
	}

	private buildRequestBody(method: string, data: unknown): string | undefined {
		const requestCanHaveBody = method !== 'GET';
		const hasRequestData = data !== undefined && data !== null;

		if (!requestCanHaveBody || !hasRequestData) {
			return undefined;
		}

		return JSON.stringify(data);
	}

	private buildUnsignedHeaders(
		headers: AxiosRequestConfig['headers'],
		accessToken: string,
		requestBody?: string
	): AmazonRequestHeaders {
		const customHeaders = this.normalizeCustomHeaders(headers);

		const unsignedHeaders: AmazonRequestHeaders = {
			'x-amz-access-token': accessToken,
			'user-agent': this.userAgent,
			...customHeaders,
		};

		const hasContentTypeHeader =
			'content-type' in unsignedHeaders || 'Content-Type' in unsignedHeaders;

		if (requestBody && !hasContentTypeHeader) {
			unsignedHeaders['content-type'] = 'application/json';
		}

		return unsignedHeaders;
	}

	private normalizeCustomHeaders(
		headers: AxiosRequestConfig['headers']
	): AmazonRequestHeaders {
		const rawHeaders = (headers as Record<string, unknown>) || {};
		const normalizedHeaders: AmazonRequestHeaders = {};

		for (const [key, value] of Object.entries(rawHeaders)) {
			if (typeof value === 'string') {
				normalizedHeaders[key] = value;
				continue;
			}

			if (typeof value === 'number' || typeof value === 'boolean') {
				normalizedHeaders[key] = String(value);
				continue;
			}

			if (Array.isArray(value)) {
				normalizedHeaders[key] = value
					.filter(
						(entry): entry is string | number | boolean =>
							typeof entry === 'string' ||
							typeof entry === 'number' ||
							typeof entry === 'boolean'
					)
					.map(String)
					.join(',');
			}
		}

		return normalizedHeaders;
	}

	private getAwsSigningCredentials(): AwsSigningCredentials {
		const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
		const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
		const sessionToken = process.env.AWS_SESSION_TOKEN;

		if (!accessKeyId || !secretAccessKey) {
			throw new Error(
				'Missing required AWS signing credentials in environment variables'
			);
		}

		return sessionToken
			? { accessKeyId, secretAccessKey, sessionToken }
			: { accessKeyId, secretAccessKey };
	}

	private signRequest(input: {
		url: URL;
		method: string;
		headers: AmazonRequestHeaders;
		body: string | undefined;
		credentials: AwsSigningCredentials;
	}): AmazonRequestHeaders {
		const signedRequest = aws4.sign(
			{
				host: input.url.host,
				path: `${input.url.pathname}${input.url.search}`,
				method: input.method,
				headers: input.headers,
				body: input.body || '',
				service: 'execute-api',
				region: this.awsRegion,
			},
			input.credentials
		) as { headers: AmazonRequestHeaders };

		return signedRequest.headers;
	}

	private throwFormattedAmazonError(error: unknown, url: URL): never {
		if (!this.isAxiosErrorWithResponse(error)) {
			throw error;
		}

		const status = error.response.status;
		const responseHeaders = error.response.headers as Record<string, string | undefined>;
		const responseData = error.response.data;

		const requestId = this.extractAmazonRequestId(responseHeaders);
		const errorMessage = this.extractAmazonErrorMessage(responseData);

		console.error('Amazon SP-API Error:', {
			status,
			data: responseData,
			url: url.toString(),
			requestId,
		});

		const formattedError = new Error(
			requestId ? `${errorMessage} (requestId: ${requestId})` : errorMessage
		) as AmazonClientError;

		formattedError.name = this.getAmazonErrorName(status);
		formattedError.statusCode = this.getMappedStatusCode(status);

		throw formattedError;
	}

	private isAxiosErrorWithResponse(
		error: unknown
	): error is AxiosError & { response: NonNullable<AxiosError['response']> } {
		return axios.isAxiosError(error) && !!error.response;
	}

	private extractAmazonRequestId(
		headers: Record<string, string | undefined>
	): string | undefined {
		return (
			headers['x-amzn-requestid'] ||
			headers['x-amzn-request-id'] ||
			headers['x-amz-request-id']
		);
	}

	private extractAmazonErrorMessage(responseData: any): string {
		return (
			responseData?.errors?.[0]?.message ||
			responseData?.message ||
			'Amazon SP-API request failed'
		);
	}

	private getAmazonErrorName(statusCode: number): string {
		if (statusCode === 401 || statusCode === 403) {
			return 'AmazonAuthError';
		}

		return 'AmazonRequestError';
	}

	private getMappedStatusCode(statusCode: number): number {
		if (statusCode === 400 || statusCode === 404) {
			return statusCode;
		}

		return 502;
	}
}

export default new AmazonClientService();