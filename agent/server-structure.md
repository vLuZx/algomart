# AlgoMart Server Backend Documentation

## Overview

The AlgoMart backend is a Node.js/Express server that integrates with Amazon's Selling Partner API (SP-API) to provide product catalog lookups via barcode scanning. It handles authentication, request signing, and data normalization for the mobile application.

---

## Technology Stack

- **Runtime**: Node.js (v25+)
- **Framework**: Express 5.x
- **Language**: TypeScript 6.x (ESM modules)
- **Package Manager**: pnpm 10.15.0
- **Testing**: Jest 30.x
- **HTTP Client**: Axios 1.14.0
- **AWS Signing**: aws4 1.13.2
- **Authentication**: Amazon LWA (Login with Amazon) OAuth 2.0

---

## Architecture

```
server/
├── src/
│   ├── app.ts                    # Express app configuration
│   ├── server.ts                 # HTTP server entry point
│   ├── controllers/              # Request handlers
│   │   └── amazon/
│   │       ├── catalog.controller.ts
│   │       └── pricing.controller.ts
│   ├── services/                 # Business logic
│   │   └── amazon/
│   │       ├── auth.service.ts   # LWA token management
│   │       ├── client.service.ts # SP-API HTTP client
│   │       ├── catalog.service.ts
│   │       └── pricing.service.ts
│   ├── routes/                   # API route definitions
│   │   └── amazon.routes.ts
│   ├── middleware/               # Express middleware
│   │   └── error-handler.middleware.ts
│   ├── types/                    # TypeScript types
│   │   └── amazon.types.ts
│   └── utils/                    # Helper functions
│       └── barcode.utils.ts
└── tests/                        # Jest test suites
```

---

## Environment Configuration

Required environment variables (`.env`):

```bash
# Server
SERVER_PORT=3000
NODE_ENV=development

# AWS Credentials (for request signing)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# Amazon SP-API (LWA OAuth)
SP_API_CLIENT_ID=your_lwa_client_id
SP_API_CLIENT_SECRET=your_lwa_client_secret
SP_API_REFRESH_TOKEN=your_refresh_token

# Marketplace Configuration
SP_API_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace
SP_API_ENDPOINT=https://sandbox.sellingpartnerapi-na.amazon.com
```

**Note**: Use sandbox endpoint for testing, production endpoint for live data.

---

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Health Check

**Endpoint**: `GET /health`

**Description**: Server health check

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-04-15T12:00:00.000Z"
}
```

---

### Catalog Search by Barcode

**Endpoint**: `GET /api/amazon/catalog/barcode/:code`

**Description**: Search Amazon catalog by UPC/EAN barcode. Automatically detects barcode type (UPC-12 or EAN-13).

**Parameters**:
- `code` (path param, required): 12 or 13 digit barcode

**Example Request**:
```bash
GET /api/amazon/catalog/barcode/725272730706
```

**Success Response** (200 OK):
```json
{
  "numberOfResults": 1,
  "items": [
    {
      "asin": "B08N5WRWNW",
      "identifiers": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "identifiers": [
            {
              "identifierType": "UPC",
              "identifier": "725272730706"
            }
          ]
        }
      ],
      "productTypes": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "productType": "SPORTING_GOODS"
        }
      ],
      "summaries": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "brand": "Example Brand",
          "itemName": "Example Product Name",
          "manufacturer": "Example Manufacturer",
          "packageQuantity": 1,
          "websiteDisplayGroup": "sporting_goods_display_on_website",
          "websiteDisplayGroupName": "Sporting Goods"
        }
      ]
    }
  ]
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid barcode parameter"
}
```

**Error Response** (400 Bad Request - Invalid Format):
```json
{
  "error": "InvalidBarcodeError",
  "message": "Invalid barcode input. Barcode must be 12 digits (UPC) or 13 digits (EAN).",
  "timestamp": "2026-04-15T12:00:00.000Z"
}
```

**Error Response** (500 Internal Server Error):
```json
{
  "error": "AmazonCatalogSearchError",
  "message": "Failed to search catalog for UPC 725272730706",
  "details": "[stack trace in development mode]",
  "timestamp": "2026-04-15T12:00:00.000Z"
}
```

---

### 404 Not Found

**Response** (404):
```json
{
  "error": "Not Found",
  "message": "Route GET /api/unknown not found",
  "timestamp": "2026-04-15T12:00:00.000Z"
}
```

---

## Data Types

### Barcode Types

```typescript
enum BarcodeType {
  UPC = "UPC",      // 12 digits
  EAN = "EAN",      // 13 digits
  GTIN = "GTIN",    // 8 or 14 digits
  UNKNOWN = "UNKNOWN"
}
```

### Catalog Item Structure

```typescript
type CatalogSearchResponse = {
  numberOfResults: number;
  items: CatalogItem[];
};

type CatalogItem = {
  asin: string;
  identifiers: CatalogItemIdentifierGroup[];
  productTypes?: CatalogItemProductType[];
  summaries?: CatalogItemSummary[];
};

type CatalogItemIdentifierGroup = {
  marketplaceId: string;
  identifiers: CatalogIdentifier[];
};

type CatalogIdentifier = {
  identifierType: BarcodeType;
  identifier: string;
};

type CatalogItemProductType = {
  marketplaceId: string;
  productType: string;
};

type CatalogItemSummary = {
  marketplaceId: string;
  adultProduct?: boolean;
  autographed?: boolean;
  brand?: string;
  browseClassification?: {
    displayName: string;
    classificationId: string;
  };
  itemClassification?: string;
  itemName?: string;
  manufacturer?: string;
  memorabilia?: boolean;
  packageQuantity?: number;
  size?: string;
  tradeInEligible?: boolean;
  websiteDisplayGroup?: string;
  websiteDisplayGroupName?: string;
};
```

---

## Service Layer Architecture

### 1. Auth Service (`auth.service.ts`)

**Purpose**: Manage LWA OAuth tokens for SP-API authentication

**Key Methods**:
- `getAccessToken()`: Returns cached or fresh access token
- `refreshAccessToken()`: Fetches new token from Amazon LWA
- `clearTokenCache()`: Invalidates cached token

**Flow**:
1. Check if cached token exists and is not expired
2. If expired, request new token from LWA endpoint
3. Cache token with expiration (expires_in - 60 seconds buffer)
4. Return access token

**Authentication Endpoint**: `https://api.amazon.com/auth/o2/token`

**Request Format**:
```
POST /auth/o2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={SP_API_REFRESH_TOKEN}
&client_id={SP_API_CLIENT_ID}
&client_secret={SP_API_CLIENT_SECRET}
```

**Response**:
```json
{
  "access_token": "Atza|...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "Atzr|..."
}
```

---

### 2. Client Service (`client.service.ts`)

**Purpose**: Low-level HTTP client for SP-API with AWS SigV4 signing

**Key Methods**:
- `request<T>(config)`: Core request method with signing
- `get<T>(url, params)`: GET request helper
- `post<T>(url, data)`: POST request helper
- `getMarketplaceId()`: Returns configured marketplace ID

**Request Flow**:
1. Build full URL with query parameters
2. Fetch LWA access token from auth service
3. Build unsigned headers (User-Agent, x-amz-access-token, Content-Type)
4. Sign request with AWS SigV4 using aws4 library
5. Execute HTTP request
6. Return parsed response or throw formatted error

**AWS Signing**:
- Service: `execute-api`
- Region: From `AWS_REGION` env var
- Credentials: AWS access key + secret from env
- Algorithm: AWS Signature Version 4

**Headers**:
```
User-Agent: AlgoMart/1.0 (Language=TypeScript)
x-amz-access-token: {LWA_ACCESS_TOKEN}
Content-Type: application/json
Authorization: {AWS4-HMAC-SHA256 signature}
```

---

### 3. Catalog Service (`catalog.service.ts`)

**Purpose**: Product catalog lookups via SP-API

**Key Methods**:
- `searchCatalogItemsByBarcode(barcode)`: Search by UPC/EAN
- `getASIN(response)`: Extract ASIN from response

**Validation**:
- Barcode must be 12 or 13 digits
- Automatically infers UPC vs EAN based on length
- Throws `InvalidBarcodeError` (400) for invalid input

**SP-API Endpoint**:
```
GET /catalog/2022-04-01/items
```

**Query Parameters**:
- `identifiers`: Barcode value
- `identifiersType`: UPC or EAN
- `marketplaceIds`: Marketplace ID (e.g., ATVPDKIKX0DER)
- `includedData`: `identifiers,summaries,productTypes`

**Error Handling**:
- `InvalidBarcodeError` (400): Invalid barcode format
- `TooManyResultsInCatalogSearchResponse` (500): Multiple items found
- `NoResultInCatalogSearchResponse` (500): No items found
- `AmazonCatalogSearchError` (500): SP-API request failed

---

## Utility Functions

### Barcode Utils (`barcode.utils.ts`)

**Functions**:

1. **`inferBarcodeType(code: string): BarcodeType`**
   - Determines barcode type from length
   - 12 digits → UPC
   - 13 digits → EAN
   - 8 or 14 digits → GTIN
   - Otherwise → UNKNOWN

2. **`isValidBarcode(code: string): boolean`**
   - Validates barcode is 12 or 13 numeric digits
   - Used for input validation

3. **`isValidAsin(asin: string): boolean`**
   - Validates ASIN format (10 alphanumeric characters)
   - Case-insensitive

---

## Middleware

### Error Handler (`error-handler.middleware.ts`)

**Global Error Handler**:
- Logs error details (message, stack, path, method)
- Returns standardized JSON error response
- Includes stack trace in development mode only
- Respects `statusCode` property on error object

**404 Handler**:
- Catches unmatched routes
- Returns route not found message with method and path

**Error Response Format**:
```json
{
  "error": "ErrorName",
  "message": "Error description",
  "details": "Stack trace (dev only)",
  "timestamp": "ISO 8601 timestamp"
}
```

---

## Testing

**Framework**: Jest 30.x with experimental VM modules

**Test Structure**:
```
tests/
├── controllers/
│   ├── amazon-catalog.controller.test.ts
│   ├── amazon-pricing.controller.test.ts
│   ├── amazon-analysis.controller.test.ts
│   └── amazon-offers.controller.test.ts
├── integration/
│   └── api.test.ts
└── utils/
    ├── barcode.utils.test.ts
    └── response.utils.test.ts
```

**Run Tests**:
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

**Test Stats**:
- Test Suites: 8 passed
- Tests: 63 passed
- Coverage: [Run `pnpm test:coverage` to generate]

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm dev

# Build TypeScript
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Clean build artifacts
pnpm clean
```

---

## Request/Response Flow Diagram

```
Mobile App
    ↓
[GET /api/amazon/catalog/barcode/725272730706]
    ↓
Express Router (amazon.routes.ts)
    ↓
Catalog Controller (catalog.controller.ts)
    ├─ Validate barcode parameter
    ↓
Catalog Service (catalog.service.ts)
    ├─ Validate barcode format (isValidBarcode)
    ├─ Infer barcode type (inferBarcodeType)
    ↓
Client Service (client.service.ts)
    ├─ Get LWA access token
    │   ↓
    │  Auth Service (auth.service.ts)
    │   ├─ Check token cache
    │   ├─ Refresh if expired
    │   └─ Return access token
    ├─ Build SP-API request URL
    ├─ Sign with AWS SigV4
    ├─ Execute HTTP request
    ↓
Amazon SP-API (sellingpartnerapi-na.amazon.com)
    ↓
Parse Response
    ↓
Return to Mobile App
```

---

## Amazon SP-API Integration Details

### Authentication Flow

1. **LWA Token Retrieval**:
   - Use refresh token to get access token
   - Token valid for ~1 hour
   - Cache token with expiration tracking

2. **Request Signing**:
   - Add `x-amz-access-token` header with LWA token
   - Sign entire request with AWS SigV4
   - Include AWS credentials (access key + secret)
   - Service name: `execute-api`

### Catalog Items API (v2022-04-01)

**Documentation**: [Amazon SP-API Catalog Items](https://developer-docs.amazon.com/sp-api/docs/catalog-items-api-v2022-04-01-reference)

**Base Path**: `/catalog/2022-04-01/items`

**Search by Identifier**:
- Supports UPC, EAN, GTIN, ASIN
- Returns product metadata, identifiers, summaries
- Marketplace-specific data

**Included Data Options**:
- `identifiers`: UPC, EAN, ASIN mappings
- `summaries`: Product name, brand, manufacturer
- `productTypes`: Category classification
- `salesRanks`: Best seller rank (optional)
- `images`: Product images (optional)

---

## Error Handling Strategy

### Client Errors (4xx)

- **400 Bad Request**: Invalid input (barcode format, missing params)
- **404 Not Found**: Route doesn't exist

### Server Errors (5xx)

- **500 Internal Server Error**: Amazon API failures, authentication errors
- **503 Service Unavailable**: Amazon API rate limiting

### Custom Error Types

```typescript
class InvalidBarcodeError extends Error {
  statusCode = 400;
}

class AmazonCatalogSearchError extends Error {
  statusCode = 500;
}

class TooManyResultsInCatalogSearchResponse extends Error {
  statusCode = 500;
}

class NoResultInCatalogSearchResponse extends Error {
  statusCode = 500;
}
```

---

## Security Considerations

1. **Credentials Management**:
   - Never commit `.env` file
   - Use `.env.example` as template
   - Rotate AWS credentials regularly
   - Store refresh token securely

2. **CORS Configuration**:
   - Currently allows all origins (development)
   - Restrict in production to mobile app domain

3. **Rate Limiting**:
   - Amazon SP-API has rate limits
   - Implement request throttling if needed
   - Cache frequent lookups

4. **Input Validation**:
   - Sanitize barcode input
   - Validate parameter types
   - Prevent SQL injection (N/A - no database)

---

## Future Enhancements

### Planned Features

1. **Pricing API Integration** (`pricing.service.ts`)
   - Get competitive pricing
   - Calculate profit margins
   - Track price history

2. **Product Analysis** (`analysis.service.ts`)
   - Sales rank analysis
   - Competition scoring
   - Profitability calculator

3. **Offers API** (`offers.service.ts`)
   - Lowest offers
   - Buy box eligibility
   - FBA fees

4. **Database Integration**:
   - Cache catalog lookups
   - Store scan history
   - User session management

5. **WebSocket Support**:
   - Real-time scan updates
   - Batch processing notifications

---

## Troubleshooting

### Common Issues

**1. Authentication Errors**
```
Error: Failed to authenticate with Amazon SP-API
```
**Solution**: Check SP-API credentials in `.env`, verify refresh token is valid

**2. Invalid Barcode Format**
```
Error: Invalid barcode input. Barcode must be 12 digits (UPC) or 13 digits (EAN).
```
**Solution**: Ensure barcode is numeric, 12 or 13 digits

**3. AWS Signing Errors**
```
Error: SignatureDoesNotMatch
```
**Solution**: Verify AWS access key and secret are correct, check system clock sync

**4. No Results from Catalog**
```
Error: no product found
```
**Solution**: Barcode may not exist in Amazon catalog, try different marketplace

**5. Rate Limiting**
```
Error: Request was throttled
```
**Solution**: Implement exponential backoff, reduce request frequency

---

## API Response Examples

### Successful Catalog Search

```json
{
  "numberOfResults": 1,
  "items": [
    {
      "asin": "B08N5WRWNW",
      "identifiers": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "identifiers": [
            {
              "identifierType": "UPC",
              "identifier": "725272730706"
            },
            {
              "identifierType": "EAN",
              "identifier": "0725272730706"
            }
          ]
        }
      ],
      "productTypes": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "productType": "SPORTING_GOODS"
        }
      ],
      "summaries": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "brand": "Wilson",
          "itemName": "Wilson NFL Super Grip Football - Official Size",
          "manufacturer": "Wilson Sporting Goods",
          "packageQuantity": 1,
          "websiteDisplayGroup": "sporting_goods_display_on_website",
          "websiteDisplayGroupName": "Sporting Goods",
          "itemClassification": "BASE_PRODUCT"
        }
      ]
    }
  ]
}
```

### Empty Results

```json
{
  "numberOfResults": 0,
  "items": []
}
```

### Error Response

```json
{
  "error": "AmazonCatalogSearchError",
  "message": "Failed to search catalog for UPC 123456789012",
  "details": "Error: Request failed with status code 404\n    at ...",
  "timestamp": "2026-04-15T14:23:45.678Z"
}
```

---

## Performance Metrics

### Expected Response Times

- **Health Check**: < 5ms
- **Catalog Search** (cached token): 200-500ms
- **Catalog Search** (token refresh): 1-2 seconds

### Optimization Strategies

1. **Token Caching**: Reduces auth overhead from 500ms to 0ms
2. **Connection Pooling**: Axios reuses HTTP connections
3. **Timeout Configuration**: 30-second default prevents hanging requests
4. **Early Validation**: Reject invalid input before API call

---

## Deployment Checklist

- [ ] Update `SP_API_ENDPOINT` to production URL
- [ ] Configure CORS for production domain
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring (logs, metrics)
- [ ] Configure rate limiting
- [ ] Set up health check monitoring
- [ ] Review AWS credential rotation policy
- [ ] Enable request logging
- [ ] Set up error tracking (Sentry, etc.)

---

## Contact & Support

**Project**: AlgoMart  
**Version**: 1.0.0  
**Last Updated**: April 2026  
**Documentation Version**: 1.0

For issues or questions, refer to the main project README or contact the development team.
