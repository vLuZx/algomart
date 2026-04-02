# Amazon Selling Partner API Backend

A TypeScript Express backend that integrates with Amazon Selling Partner API (SP-API) for product lookup and pricing analysis.

## Features

- 🔍 Product lookup by UPC, EAN, or barcode (auto-detect)
- 💰 Pricing data retrieval
- 📊 Competitive offers summary
- 📈 Sales rank tracking
- 🎯 Comprehensive product analysis endpoint
- 🔐 AWS SigV4 request signing
- 🎫 LWA (Login with Amazon) OAuth token management
- ✅ Strong TypeScript typing
- 🛡️ Error handling middleware
- 📱 Mobile app ready API

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express
- **HTTP Client**: Axios
- **Auth**: AWS4 (SigV4), LWA OAuth
- **Environment**: dotenv

## Project Structure

```
server/
├── src/
│   ├── app.ts                          # Express app configuration
│   ├── server.ts                       # Server entry point
│   ├── controllers/
│   │   ├── amazonCatalog.controller.ts # Catalog endpoints
│   │   ├── amazonPricing.controller.ts # Pricing endpoints
│   │   ├── amazonOffers.controller.ts  # Offers endpoints
│   │   └── amazonAnalysis.controller.ts # Analysis endpoint
│   ├── services/
│   │   ├── amazonAuth.service.ts       # LWA authentication
│   │   ├── amazonClient.service.ts     # SP-API HTTP client
│   │   ├── amazonCatalog.service.ts    # Catalog API service
│   │   ├── amazonPricing.service.ts    # Pricing API service
│   │   ├── amazonOffers.service.ts     # Offers API service
│   │   └── amazonAnalysis.service.ts   # Aggregation service
│   ├── middleware/
│   │   └── errorHandler.middleware.ts  # Error handling
│   ├── routes/
│   │   └── amazonApi.routes.ts         # API routes
│   ├── types/
│   │   └── amazon.types.ts             # TypeScript types
│   └── utils/
│       ├── barcode.utils.ts            # Barcode validation
│       └── response.utils.ts           # Response normalization
├── .env.example                        # Environment variables template
└── package.json
```

## Setup

### 1. Install Dependencies

```bash
cd server
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your Amazon SP-API credentials:

```env
# Server Configuration
SERVER_PORT=3000
NODE_ENV=development

# Amazon Selling Partner API Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# Amazon SP-API App Credentials
SP_API_CLIENT_ID=your_lwa_client_id
SP_API_CLIENT_SECRET=your_lwa_client_secret
SP_API_REFRESH_TOKEN=your_refresh_token

# Amazon Marketplace Configuration
SP_API_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace
SP_API_ENDPOINT=https://sellingpartnerapi-na.amazon.com
```

### 3. Getting SP-API Credentials

1. Go to [Amazon Seller Central](https://sellercentral.amazon.com)
2. Navigate to Apps & Services → Develop Apps
3. Create a new app or use an existing one
4. Note your LWA Client ID and Client Secret
5. Generate IAM credentials (AWS Access Key ID and Secret Access Key)
6. Authorize the app and get a refresh token

**Marketplace IDs:**
- US: `ATVPDKIKX0DER`
- Canada: `A2EUQ1WTGCTBG2`
- Mexico: `A1AM78C64UM0Y8`
- UK: `A1F83G8C2ARO7P`
- Germany: `A1PA6795UKMFR9`
- France: `A13V1IB3VIYZZH`
- Italy: `APJ6JRA9NG5V4`
- Spain: `A1RKKUPIHCS9HS`
- Japan: `A1VC38T7YXB528`

**Endpoints:**
- North America: `https://sellingpartnerapi-na.amazon.com`
- Europe: `https://sellingpartnerapi-eu.amazon.com`
- Far East: `https://sellingpartnerapi-fe.amazon.com`

### 4. Run the Server

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## API Endpoints

Base URL: `http://localhost:3000`

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

---

### 1. Search by Barcode (Auto-Detect)

```
GET /api/amazon/catalog/barcode/:code
```

Automatically detects UPC (12 digits) or EAN (13 digits).

**Example:**
```bash
curl http://localhost:3000/api/amazon/catalog/barcode/885909950805
```

**Response:**
```json
{
  "success": true,
  "barcode": "885909950805",
  "barcodeType": "UPC",
  "data": {
    "asin": "B075FLBJV7",
    "title": "Nintendo Switch with Neon Blue and Neon Red Joy‑Con",
    "brand": "Nintendo",
    "manufacturer": "Nintendo",
    "image": "https://m.media-amazon.com/images/I/61-PblYntsL.jpg",
    "productGroup": "Video Games",
    "productType": "VIDEO_GAME_CONSOLE",
    "identifiers": [
      { "type": "UPC", "value": "885909950805" },
      { "type": "EAN", "value": "0885909950805" }
    ],
    "salesRanks": [
      { "category": "Video Games", "rank": 42 }
    ]
  },
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

---

### 2. Search by UPC

```
GET /api/amazon/catalog/upc/:upc
```

**Example:**
```bash
curl http://localhost:3000/api/amazon/catalog/upc/885909950805
```

---

### 3. Search by EAN

```
GET /api/amazon/catalog/ean/:ean
```

**Example:**
```bash
curl http://localhost:3000/api/amazon/catalog/ean/0885909950805
```

---

### 4. Get Product Pricing

```
GET /api/amazon/pricing/:asin
```

**Example:**
```bash
curl http://localhost:3000/api/amazon/pricing/B075FLBJV7
```

**Response:**
```json
{
  "success": true,
  "asin": "B075FLBJV7",
  "data": {
    "asin": "B075FLBJV7",
    "listingPrice": {
      "amount": 299.99,
      "currency": "USD"
    },
    "landedPrice": {
      "amount": 299.99,
      "currency": "USD"
    },
    "lowestPrice": {
      "amount": 289.99,
      "currency": "USD"
    },
    "currency": "USD",
    "buyBoxPrice": {
      "amount": 299.99,
      "currency": "USD"
    }
  },
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

---

### 5. Get Offers Summary

```
GET /api/amazon/offers/:asin
```

Returns offer counts by condition and fulfillment channel.

**Note:** Amazon SP-API does not provide a direct "number of sellers" count. This endpoint returns the available competitive offer data.

**Example:**
```bash
curl http://localhost:3000/api/amazon/offers/B075FLBJV7
```

**Response:**
```json
{
  "success": true,
  "asin": "B075FLBJV7",
  "data": {
    "asin": "B075FLBJV7",
    "offerCounts": [
      {
        "condition": "New",
        "fulfillmentChannel": "Amazon",
        "count": 15
      },
      {
        "condition": "New",
        "fulfillmentChannel": "Merchant",
        "count": 8
      }
    ],
    "competitivePrices": [
      {
        "condition": "New",
        "amount": 289.99,
        "currency": "USD",
        "fulfillmentChannel": "Amazon"
      }
    ],
    "totalOffers": 23
  },
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

---

### 6. Get Sales Rank

```
GET /api/amazon/rank/:asin
```

**Example:**
```bash
curl http://localhost:3000/api/amazon/rank/B075FLBJV7
```

**Response:**
```json
{
  "success": true,
  "asin": "B075FLBJV7",
  "data": {
    "asin": "B075FLBJV7",
    "salesRanks": [
      {
        "category": "Video Games",
        "rank": 42
      },
      {
        "category": "Nintendo Switch Consoles",
        "rank": 5
      }
    ],
    "primaryCategory": "Video Games",
    "primaryRank": 42
  },
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

---

### 7. Comprehensive Product Analysis

```
GET /api/amazon/product-analysis/:code
```

**This is the main endpoint for mobile apps.** It aggregates data from multiple endpoints:
- Catalog item lookup
- Pricing data
- Offers summary
- Sales rank

**Example:**
```bash
curl http://localhost:3000/api/amazon/product-analysis/885909950805
```

**Response:**
```json
{
  "success": true,
  "data": {
    "barcode": "885909950805",
    "barcodeType": "UPC",
    "catalogItem": {
      "asin": "B075FLBJV7",
      "title": "Nintendo Switch with Neon Blue and Neon Red Joy‑Con",
      "brand": "Nintendo",
      "manufacturer": "Nintendo",
      "image": "https://m.media-amazon.com/images/I/61-PblYntsL.jpg",
      "productGroup": "Video Games",
      "productType": "VIDEO_GAME_CONSOLE",
      "identifiers": [
        { "type": "UPC", "value": "885909950805" }
      ],
      "salesRanks": [
        { "category": "Video Games", "rank": 42 }
      ]
    },
    "pricing": {
      "asin": "B075FLBJV7",
      "listingPrice": { "amount": 299.99, "currency": "USD" },
      "landedPrice": { "amount": 299.99, "currency": "USD" },
      "lowestPrice": { "amount": 289.99, "currency": "USD" },
      "currency": "USD",
      "buyBoxPrice": { "amount": 299.99, "currency": "USD" }
    },
    "offers": {
      "asin": "B075FLBJV7",
      "offerCounts": [
        { "condition": "New", "fulfillmentChannel": "Amazon", "count": 15 }
      ],
      "competitivePrices": [
        { "condition": "New", "amount": 289.99, "currency": "USD" }
      ],
      "totalOffers": 23
    },
    "salesRank": {
      "asin": "B075FLBJV7",
      "salesRanks": [
        { "category": "Video Games", "rank": 42 }
      ],
      "primaryCategory": "Video Games",
      "primaryRank": 42
    },
    "timestamp": "2026-04-01T12:00:00.000Z",
    "errors": []
  },
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

If some data sources fail, they'll be null and the `errors` array will contain details.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

**Common Error Codes:**

- `400` - Bad Request (invalid barcode/ASIN format)
- `404` - Not Found (product not found)
- `500` - Internal Server Error (API failure)

**Example Error:**
```json
{
  "error": "Invalid barcode",
  "message": "Barcode must be 12 digits (UPC) or 13 digits (EAN)",
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

---

## Architecture

### Services Layer

- **amazonAuth.service**: Manages LWA OAuth tokens with automatic refresh
- **amazonClient.service**: HTTP client with AWS SigV4 signing
- **amazonCatalog.service**: Catalog Items API wrapper
- **amazonPricing.service**: Product Pricing API wrapper
- **amazonOffers.service**: Competitive pricing/offers wrapper
- **amazonAnalysis.service**: Aggregates data from multiple services

### Controllers Layer

Controllers handle request validation, call services, and format responses:
- `amazonCatalog.controller`: Catalog endpoints
- `amazonPricing.controller`: Pricing endpoints
- `amazonOffers.controller`: Offers endpoints
- `amazonAnalysis.controller`: Analysis endpoint

### Utilities

- **barcode.utils**: Barcode type inference and validation
- **response.utils**: Response normalization

---

## TypeScript Types

All request/response types are defined in `src/types/amazon.types.ts`:

- `BarcodeType`: UPC | EAN | UNKNOWN
- `CatalogItem`: Amazon catalog item structure
- `NormalizedCatalogItem`: Simplified catalog response
- `ProductPricingItem`: Amazon pricing structure
- `NormalizedPricing`: Simplified pricing response
- `CompetitivePricingResponse`: Competitive pricing structure
- `NormalizedOffersSummary`: Simplified offers response
- `ProductAnalysis`: Complete analysis response

---

## Development

### Adding New Endpoints

1. Create service method in appropriate service file
2. Create controller function
3. Add route in `amazonApi.routes.ts`
4. Add types in `amazon.types.ts` if needed

### Testing

Test with curl or Postman:

```bash
# Test health check
curl http://localhost:3000/health

# Test barcode lookup
curl http://localhost:3000/api/amazon/catalog/barcode/885909950805

# Test product analysis
curl http://localhost:3000/api/amazon/product-analysis/885909950805
```

---

## Important Notes

### SP-API Limitations

1. **Seller Count**: Amazon SP-API does not provide a direct "number of sellers" endpoint. The `/offers` endpoint returns offer counts by condition and fulfillment channel, which is the closest approximation.

2. **Rate Limits**: Amazon SP-API has rate limits. Implement caching in production.

3. **Sandbox Mode**: Amazon provides a sandbox environment for testing. Update the endpoint URL to use sandbox.

4. **Marketplace Selection**: Different marketplaces require different credentials and have different data availability.

### Production Considerations

- [ ] Add rate limiting middleware
- [ ] Implement caching (Redis recommended)
- [ ] Add request logging
- [ ] Set up monitoring/alerts
- [ ] Use environment-specific configurations
- [ ] Add API key authentication for your mobile app
- [ ] Implement retry logic for failed requests

---

## Resources

- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [Catalog Items API Reference](https://developer-docs.amazon.com/sp-api/docs/catalog-items-api-v2022-04-01-reference)
- [Product Pricing API Reference](https://developer-docs.amazon.com/sp-api/docs/product-pricing-api-v0-reference)
- [SP-API Developer Guide](https://developer-docs.amazon.com/sp-api/docs/what-is-the-selling-partner-api)

---

## License

ISC

---

## Support

For issues related to Amazon SP-API, consult the [official documentation](https://developer-docs.amazon.com/sp-api/) or Amazon Seller Support.
