# Algomart Architecture Documentation

> **Project Overview**: Full-stack Amazon Selling Partner API (SP-API) application for analyzing products via barcode scanning with comprehensive pricing, catalog, and competitive intelligence features.

---

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Naming Conventions](#naming-conventions)
5. [API Endpoints](#api-endpoints)
6. [Testing Strategy](#testing-strategy)

---

## 🏗 Project Structure

```
algomart/
├── server/                      # Backend Express API
│   ├── src/
│   │   ├── controllers/         # Request handlers & validation
│   │   ├── services/            # Business logic & external API integration
│   │   ├── routes/              # API route definitions
│   │   ├── middleware/          # Error handling & request processing
│   │   ├── utils/               # Helper functions & utilities
│   │   ├── types/               # TypeScript type definitions
│   │   ├── app.ts              # Express app configuration
│   │   └── server.ts           # HTTP server entry point
│   ├── tests/                   # Jest test suite
│   └── dist/                    # Compiled JavaScript output
│
├── mobile-app/                  # Frontend Expo/React Native app
│   ├── src/
│   │   ├── app/                # Expo Router file-based routing
│   │   ├── components/         # Reusable React components
│   │   ├── features/           # Feature-specific modules
│   │   ├── services/           # API client & data fetching
│   │   ├── store/              # State management
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Helper functions
│   │   └── constants/          # App-wide constants
│   └── assets/                 # Images, fonts, etc.
│
└── .github/                     # CI/CD workflows
```

---

## 🔧 Backend Architecture

### **Tech Stack**
- **Runtime**: Node.js (v25+) with ES Modules
- **Framework**: Express.js v5.2.1
- **Language**: TypeScript v6.0.2 (Strict Mode)
- **Package Manager**: pnpm v10.15.0
- **Testing**: Jest v30.3.0 + ts-jest + Supertest
- **HTTP Client**: Axios v1.14.0
- **AWS Signing**: aws4 v1.13.2
- **Dev Tools**: tsx (TypeScript executor), dotenv

### **Architecture Pattern**: Layered Architecture

The backend follows a **3-layer architecture** with clear separation of concerns:

```
Request → Route → Controller → Service → External API
          ↓          ↓           ↓
       Routing   Validation   Business Logic
```

### **Layer Breakdown**

#### **1. Routes Layer** (`src/routes/`)
- **Responsibility**: HTTP route definitions and endpoint mapping
- **Files**: 
  - `amazon.routes.ts` - All Amazon SP-API endpoints
- **Pattern**: Express Router with namespace grouping
- **Imports**: Controllers as wildcard imports (`import * as controller`)

#### **2. Controllers Layer** (`src/controllers/`)
- **Responsibility**: Request validation, response formatting, error handling
- **Files**:
  - `amazon-catalog.controller.ts` - Product catalog endpoints
  - `amazon-pricing.controller.ts` - Pricing data endpoints
  - `amazon-offers.controller.ts` - Competitive offers endpoints
  - `amazon-analysis.controller.ts` - Aggregated product analysis
- **Pattern**: Named exports of async functions
- **Key Features**:
  - Input validation (barcode format, ASIN format)
  - HTTP status code handling (400, 404, 500)
  - Consistent response format with timestamps
  - Service layer delegation

#### **3. Services Layer** (`src/services/`)
- **Responsibility**: Business logic, external API integration, data transformation
- **Files**:
  - `amazon-client.service.ts` - HTTP client with AWS SigV4 signing
  - `amazon-auth.service.ts` - OAuth token management & caching
  - `amazon-catalog.service.ts` - Catalog API integration
  - `amazon-pricing.service.ts` - Pricing API integration
  - `amazon-offers.service.ts` - Competitive pricing integration
  - `amazon-analysis.service.ts` - Multi-endpoint aggregation service
- **Pattern**: Class-based singleton instances exported as defaults
- **Example**:
  ```typescript
  class AmazonCatalogService {
    async searchByBarcode(code: string): Promise<CatalogItem | null> { ... }
  }
  export default new AmazonCatalogService();
  ```

#### **4. Middleware Layer** (`src/middleware/`)
- **Responsibility**: Cross-cutting concerns
- **Files**:
  - `error-handler.middleware.ts` - Global error handling & 404 handler
- **Functions**:
  - `errorHandler()` - Catches all errors, formats error responses
  - `notFoundHandler()` - Handles undefined routes

#### **5. Utilities Layer** (`src/utils/`)
- **Responsibility**: Pure helper functions
- **Files**:
  - `barcode.utils.ts` - Barcode/ASIN validation & type inference
  - `response.utils.ts` - Amazon API response normalization
- **Functions**:
  - `isValidBarcode()` - Validates 12/13 digit barcodes
  - `isValidAsin()` - Validates 10-character ASINs
  - `inferBarcodeType()` - Detects UPC vs EAN
  - `normalizeCatalogItem()` - Transforms Amazon response to clean format
  - `normalizePriceResponse()` - Extracts pricing data
  - `normalizeOfferSummary()` - Formats competitive data
  - `normalizeSalesRank()` - Extracts sales rank info

#### **6. Types Layer** (`src/types/`)
- **Responsibility**: TypeScript type definitions & interfaces
- **Files**:
  - `amazon.types.ts` - All Amazon SP-API types (297 lines)
- **Key Types**:
  - `CatalogItem` - Raw Amazon catalog response
  - `NormalizedCatalogItem` - Clean, frontend-ready format
  - `ProductPricingItem` - Pricing data structure
  - `CompetitivePricingResponse` - Offer listings
  - `ProductAnalysis` - Aggregated analysis result
  - `BarcodeType` - 'UPC' | 'EAN' | 'UNKNOWN'
  - `ApiErrorResponse` - Error response format

### **Amazon SP-API Integration**

#### **Authentication Flow**
1. **LWA OAuth** (`amazon-auth.service.ts`):
   - Requests access token via refresh token
   - Caches token with expiration timestamp
   - Auto-refreshes when token expires

2. **AWS SigV4 Signing** (`amazon-client.service.ts`):
   - Signs all requests with AWS credentials
   - Includes `x-amz-access-token` header
   - Uses `aws4` library for signature generation

#### **Environment Variables**
```env
# Amazon SP-API Credentials
SP_API_CLIENT_ID=your_client_id
SP_API_CLIENT_SECRET=your_client_secret
SP_API_REFRESH_TOKEN=your_refresh_token
SP_API_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace
SP_API_ENDPOINT=https://sellingpartnerapi-na.amazon.com

# AWS Credentials (for SigV4 signing)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Server Config
SERVER_PORT=3000
NODE_ENV=development
```

### **Data Flow Example**: Product Analysis

```
1. Client → GET /api/amazon/product-analysis/885909950805

2. Route (amazon.routes.ts)
   └─→ analysisController.analyzeProduct()

3. Controller (amazon-analysis.controller.ts)
   ├─ Validates barcode format
   ├─ Calls amazonAnalysisService.analyzeProduct()
   └─ Returns formatted JSON response

4. Service (amazon-analysis.service.ts)
   ├─ Step 1: Find product by barcode
   │   └─→ amazonCatalogService.searchByBarcode()
   │       └─→ amazonClientService.get() [SP-API Call]
   │
   ├─ Step 2: Get pricing (parallel)
   │   └─→ amazonPricingService.getPricing(asin)
   │       └─→ amazonClientService.get() [SP-API Call]
   │
   ├─ Step 3: Get offers (parallel)
   │   └─→ amazonOffersService.getOffersSummary(asin)
   │       └─→ amazonPricingService.getCompetitivePricing()
   │
   ├─ Step 4: Extract sales rank (from catalog data)
   │   └─→ normalizeSalesRank()
   │
   └─ Returns aggregated ProductAnalysis object

5. Response: {
     barcode: "885909950805",
     barcodeType: "UPC",
     catalogItem: { ... },
     pricing: { ... },
     offers: { ... },
     salesRank: { ... },
     timestamp: "2026-04-02T..."
   }
```

---

## 📱 Frontend Architecture

### **Tech Stack**
- **Framework**: Expo SDK ~54.0.33
- **UI Library**: React Native 0.81.5
- **Language**: TypeScript ~5.9.2
- **Navigation**: Expo Router v6.0.23 (file-based routing)
- **React Version**: React 19.1.0
- **State Management**: (To be implemented - likely Redux Toolkit or Zustand)
- **Gestures**: react-native-gesture-handler ~2.28.0
- **Animations**: react-native-reanimated ~4.1.1

### **Architecture Pattern**: Feature-Based Architecture

```
mobile-app/src/
├── app/                    # File-based routing (Expo Router)
├── features/              # Feature modules (e.g., Scanner, ProductDetails)
├── components/            # Shared UI components
├── services/              # API client & data fetching
├── store/                 # Global state management
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
├── utils/                 # Helper functions
└── constants/             # App-wide constants (colors, config)
```

### **Routing Strategy**
- **Expo Router**: File-based routing system
- **Navigation Stack**: React Navigation 7.1.8
- **Tab Navigation**: Bottom tabs (@react-navigation/bottom-tabs)
- **Deep Linking**: expo-linking for barcode → product flow

### **Platform Support**
- **iOS**: Full support with tab navigation
- **Android**: Edge-to-edge UI enabled
- **Web**: Static export capability (output: "static")

### **Current Status**
✅ **Implementation In Progress**: Core architecture and foundation complete (40+ files, ~3,500 lines)

**Completed** (April 2, 2026):
- ✅ Complete folder structure (feature-based architecture)
- ✅ State management (Zustand + TanStack Query)
- ✅ API service layer (product-api.service.ts)
- ✅ Product scoring algorithm (core business logic)
- ✅ Session management store
- ✅ Base UI components (Button, Card, Loading, Empty, Error, ConfirmDialog)
- ✅ Design tokens & styling system
- ✅ Type definitions for all features
- ✅ Utility functions (format, validation, scoring, ranking)

**In Progress**:
- 🚧 Scanner screen (camera + barcode detection)
- 🚧 Product detail screen
- 🚧 Session product list screen

**See**: `/mobile-app/IMPLEMENTATION_GUIDE.md` for complete status

### **Key Features Implemented**
1. **Session Management** → Start Single/Rapid scan sessions
2. **Product Scoring Algorithm** → Ranks products by profitability, competition, popularity
3. **API Integration** → Consumes backend `/api/amazon/product-analysis/:code`
4. **State Management** → Zustand (local) + TanStack Query (server state)
5. **Pagination** → 25 products per page with global row numbering

### **Planned Features**
1. **Barcode Scanner** → React Native Vision Camera integration (next priority)
2. **Product Details Screen** → Shows score, metrics, warnings
3. **Session History** → (Future feature)
4. **Price Tracking** → (Future feature)
5. **Favorites/Watchlist** → (Future feature)

---

## 📐 Naming Conventions

### **Backend Conventions**

#### **File Naming**
- **Pattern**: `kebab-case` with descriptive suffixes
- **Controllers**: `{entity}-{domain}.controller.ts`
  - ✅ `amazon-catalog.controller.ts`
  - ✅ `amazon-pricing.controller.ts`
- **Services**: `{entity}-{domain}.service.ts`
  - ✅ `amazon-auth.service.ts`
  - ✅ `amazon-client.service.ts`
- **Routes**: `{domain}.routes.ts`
  - ✅ `amazon.routes.ts`
- **Middleware**: `{purpose}.middleware.ts`
  - ✅ `error-handler.middleware.ts`
- **Utils**: `{purpose}.utils.ts`
  - ✅ `barcode.utils.ts`
  - ✅ `response.utils.ts`
- **Types**: `{domain}.types.ts`
  - ✅ `amazon.types.ts`

#### **Code Conventions**
- **Variables/Functions**: `camelCase`
  - `getAccessToken()`, `isValidBarcode()`
- **Classes**: `PascalCase`
  - `AmazonCatalogService`, `AmazonClientService`
- **Constants**: `UPPER_SNAKE_CASE`
  - `LWA_ENDPOINT`, `API_VERSION`
- **Interfaces/Types**: `PascalCase`
  - `CatalogItem`, `ProductAnalysis`, `BarcodeType`
- **Enum Values**: `UPPER_SNAKE_CASE` or `PascalCase`
  - `'UPC' | 'EAN' | 'UNKNOWN'`

#### **Import Patterns**
- **Controllers**: Wildcard import
  ```typescript
  import * as catalogController from '../controllers/amazon-catalog.controller.js';
  ```
- **Services**: Default import (singleton instance)
  ```typescript
  import amazonCatalogService from '../services/amazon-catalog.service.js';
  ```
- **Types**: Named import
  ```typescript
  import type { CatalogItem, BarcodeType } from '../types/amazon.types.js';
  ```
- **Utils**: Named import
  ```typescript
  import { isValidBarcode, inferBarcodeType } from '../utils/barcode.utils.js';
  ```

#### **Module System**
- **Type**: ES Modules (`"type": "module"` in package.json)
- **Extensions**: All imports must include `.js` extension (even for `.ts` files)
  ```typescript
  import app from './app.js';  // NOT './app.ts'
  ```
- **Reason**: TypeScript compiles to `.js`, so runtime expects `.js` extensions

### **Frontend Conventions**
- **Components**: `PascalCase.tsx`
- **Screens**: `PascalCase.tsx` (in `app/` directory)
- **Hooks**: `use{Name}.ts` (camelCase function)
- **Utils**: `{purpose}.utils.ts`
- **Constants**: `{purpose}.constants.ts`

---

## 🌐 API Endpoints

### **Base URL**: `http://localhost:3000`

### **Health Check**
```http
GET /health
```
**Response**: `{ status: 'ok', timestamp: '2026-04-02T...' }`

---

### **Catalog Endpoints**

#### 1. Search by Barcode (Auto-detect UPC/EAN)
```http
GET /api/amazon/catalog/barcode/:code
```
**Parameters**:
- `code` (path) - 12-digit UPC or 13-digit EAN

**Example**:
```bash
GET /api/amazon/catalog/barcode/885909950805
```

**Response**:
```json
{
  "success": true,
  "barcode": "885909950805",
  "barcodeType": "UPC",
  "data": {
    "asin": "B075CYMYK6",
    "title": "Neewer NW-700 Professional Studio Broadcasting Recording...",
    "brand": "Neewer",
    "image": "https://...",
    "productGroup": "Electronics",
    ...
  },
  "timestamp": "2026-04-02T12:34:56.789Z"
}
```

**Controller**: `amazon-catalog.controller.ts → searchByBarcode()`  
**Service**: `amazon-catalog.service.ts → searchByBarcode()`  
**Validation**: Checks 12/13 digit format

---

#### 2. Search by UPC (Explicit)
```http
GET /api/amazon/catalog/upc/:upc
```
**Parameters**:
- `upc` (path) - 12-digit UPC code

**Controller**: `amazon-catalog.controller.ts → searchByUpc()`  
**Validation**: Strict 12-digit validation

---

#### 3. Search by EAN (Explicit)
```http
GET /api/amazon/catalog/ean/:ean
```
**Parameters**:
- `ean` (path) - 13-digit EAN code

**Controller**: `amazon-catalog.controller.ts → searchByEan()`  
**Validation**: Strict 13-digit validation

---

#### 4. Get Product by ASIN
```http
GET /api/amazon/catalog/:asin
```
**Parameters**:
- `asin` (path) - 10-character Amazon ASIN

**Example**:
```bash
GET /api/amazon/catalog/B075CYMYK6
```

**Controller**: `amazon-catalog.controller.ts → getByAsin()`  
**Validation**: 10 alphanumeric characters

---

### **Pricing Endpoints**

#### 5. Get Pricing Data
```http
GET /api/amazon/pricing/:asin
```
**Parameters**:
- `asin` (path) - 10-character ASIN

**Example**:
```bash
GET /api/amazon/pricing/B075CYMYK6
```

**Response**:
```json
{
  "success": true,
  "asin": "B075CYMYK6",
  "data": {
    "listPrice": {
      "amount": 19.99,
      "currencyCode": "USD"
    },
    "landedPrice": {
      "amount": 16.99,
      "currencyCode": "USD"
    },
    "shipping": null,
    "condition": "New",
    "fulfillmentChannel": "AMAZON"
  },
  "timestamp": "2026-04-02T..."
}
```

**Controller**: `amazon-pricing.controller.ts → getPricing()`  
**Service**: `amazon-pricing.service.ts → getPricing()`

---

### **Offers Endpoints**

#### 6. Get Competitive Offers Summary
```http
GET /api/amazon/offers/:asin
```
**Parameters**:
- `asin` (path) - 10-character ASIN

**Example**:
```bash
GET /api/amazon/offers/B075CYMYK6
```

**Response**:
```json
{
  "success": true,
  "asin": "B075CYMYK6",
  "data": {
    "asin": "B075CYMYK6",
    "newOffers": {
      "amazon": 15,
      "fba": 8,
      "fbm": 5
    },
    "usedOffers": {
      "amazon": 0,
      "fba": 2,
      "fbm": 1
    },
    "buyBoxPrice": {
      "amount": 16.99,
      "currencyCode": "USD"
    },
    "totalOfferCount": 31
  },
  "timestamp": "2026-04-02T..."
}
```

**Controller**: `amazon-offers.controller.ts → getOffersSummary()`  
**Service**: `amazon-offers.service.ts → getOffersSummary()`

**Note**: Amazon SP-API doesn't provide direct "seller count". This returns offer listings by condition/channel.

---

### **Sales Rank Endpoint**

#### 7. Get Sales Rank
```http
GET /api/amazon/rank/:asin
```
**Parameters**:
- `asin` (path) - 10-character ASIN

**Example**:
```bash
GET /api/amazon/rank/B075CYMYK6
```

**Response**:
```json
{
  "success": true,
  "asin": "B075CYMYK6",
  "data": {
    "primaryRank": {
      "category": "Musical Instruments",
      "rank": 1234,
      "link": "https://www.amazon.com/gp/bestsellers/musical-instruments"
    },
    "additionalRanks": [
      {
        "category": "Live Sound & Stage > Microphones",
        "rank": 42
      }
    ]
  },
  "timestamp": "2026-04-02T..."
}
```

**Controller**: `amazon-catalog.controller.ts → getSalesRank()`  
**Service**: `amazon-catalog.service.ts → getSalesRank()` (returns catalog item with sales rank)

---

### **Aggregated Analysis Endpoint**

#### 8. Comprehensive Product Analysis
```http
GET /api/amazon/product-analysis/:code
```
**Parameters**:
- `code` (path) - 12-digit UPC or 13-digit EAN

**Example**:
```bash
GET /api/amazon/product-analysis/885909950805
```

**Response**: Combines catalog + pricing + offers + sales rank in one call
```json
{
  "barcode": "885909950805",
  "barcodeType": "UPC",
  "catalogItem": { /* full catalog data */ },
  "pricing": { /* pricing data */ },
  "offers": { /* competitive offers */ },
  "salesRank": { /* sales rank data */ },
  "timestamp": "2026-04-02T12:34:56.789Z",
  "errors": []  // Partial failures don't stop the entire response
}
```

**Controller**: `amazon-analysis.controller.ts → analyzeProduct()`  
**Service**: `amazon-analysis.service.ts → analyzeProduct()`

**Key Feature**: Makes 3 parallel API calls to Amazon SP-API and aggregates results. If one fails, others still return (graceful degradation).

---

### **Error Responses**

All endpoints return consistent error format:

#### 400 Bad Request
```json
{
  "error": "Invalid barcode",
  "message": "Barcode must be 12 digits (UPC) or 13 digits (EAN)",
  "timestamp": "2026-04-02T..."
}
```

#### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Product not found in Amazon catalog",
  "barcode": "123456789012",
  "barcodeType": "UPC",
  "timestamp": "2026-04-02T..."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Failed to get catalog item: ...",
  "details": "Stack trace (only in development)",
  "timestamp": "2026-04-02T..."
}
```

**Handler**: `error-handler.middleware.ts → errorHandler()`

---

## 🧪 Testing Strategy

### **Backend Testing**

#### **Framework**: Jest v30.3.0 + ts-jest + Supertest

#### **Test Structure**
```
tests/
├── setup.ts                          # Test environment configuration
├── globals.d.ts                      # Jest type definitions
├── mocks/                            # Mock services
│   ├── amazonAuth.mock.ts           # Mocked OAuth tokens
│   ├── amazonCatalog.mock.ts        # Mocked product data
│   ├── amazonPricing.mock.ts        # Mocked pricing responses
│   └── amazonOffers.mock.ts         # Mocked offer data
├── utils/                            # Unit tests
│   ├── barcode.utils.test.ts        # 13 tests - validation logic
│   └── response.utils.test.ts       # 23 tests - normalization logic
├── controllers/                      # Controller tests
│   ├── amazonCatalog.controller.test.ts
│   ├── amazonPricing.controller.test.ts
│   ├── amazonOffers.controller.test.ts
│   └── amazonAnalysis.controller.test.ts
└── integration/                      # Integration tests
    └── api.test.ts                   # Full API endpoint tests
```

#### **Test Coverage**
- **Total Tests**: 42 passing tests across 7 suites
- **Execution Time**: ~0.4-0.9 seconds
- **Coverage**:
  - `barcode.utils.ts`: 94.79% (13 tests)
  - `response.utils.ts`: 98.71% (23 tests)
  - Controllers: Full validation logic covered

#### **Mock Strategy**
- Mock services return realistic Amazon SP-API data
- Example product: Neewer NW-700 Professional Microphone
- No real API calls in tests (all mocked)
- Mock data includes edge cases (missing fields, null values)

#### **Run Commands**
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Generate coverage report
```

#### **Test Configuration**
- **Module System**: ES Modules with `--experimental-vm-modules`
- **Transform**: ts-jest with `useESM: true`
- **Environment**: Node.js test environment
- **TypeScript**: Strict mode with `noUncheckedIndexedAccess: true`

---

## 🎨 Design Patterns & Abstractions

### **Backend Patterns**

#### 1. **Singleton Pattern** (Services)
Each service is instantiated once and exported as a default:
```typescript
class AmazonCatalogService { ... }
export default new AmazonCatalogService();
```

#### 2. **Repository Pattern** (Services as Data Access Layer)
Services abstract Amazon SP-API complexity from controllers.

#### 3. **Facade Pattern** (Analysis Service)
`amazon-analysis.service.ts` provides a single interface to multiple underlying services.

#### 4. **Strategy Pattern** (Barcode Type Inference)
`inferBarcodeType()` determines handling strategy based on code length.

#### 5. **Adapter Pattern** (Response Normalization)
`response.utils.ts` adapts Amazon's complex responses to clean, frontend-friendly formats.

#### 6. **Middleware Chain** (Express Middleware)
Standard Express middleware pattern for error handling and request processing.

### **Key Abstractions**

#### **AWS SigV4 Signing**
Abstracted into `amazon-client.service.ts` - controllers never deal with AWS signing.

#### **Token Management**
`amazon-auth.service.ts` handles OAuth token caching/refresh automatically.

#### **Response Normalization**
All Amazon API responses are normalized through utility functions before reaching controllers.

#### **Error Handling**
Centralized in `error-handler.middleware.ts` - consistent format across all endpoints.

---

## 🚀 Development Workflow

### **Backend**
```bash
# Development (hot reload)
cd server
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Testing
pnpm test
pnpm test:coverage
```

### **Frontend**
```bash
# Development
cd mobile-app
npm start

# Platform-specific
npm run ios
npm run android
npm run web
```

---

## 🔒 Security Considerations

1. **Environment Variables**: All secrets stored in `.env` (not committed)
2. **AWS Credentials**: Never exposed to frontend
3. **Error Messages**: Stack traces only in development mode
4. **Input Validation**: All user inputs validated at controller level
5. **CORS**: Enabled for cross-origin requests
6. **Rate Limiting**: (TODO) Not yet implemented

---

## 📚 External Dependencies

### **Backend Core**
- `express` - Web framework
- `axios` - HTTP client
- `aws4` - AWS request signing
- `dotenv` - Environment variables
- `cors` - Cross-origin resource sharing

### **Frontend Core**
- `expo` - React Native framework
- `react-navigation` - Navigation library
- `expo-router` - File-based routing

---

## 🎯 Future Enhancements

### **Backend**
- [ ] Rate limiting middleware
- [ ] Request caching (Redis)
- [ ] WebSocket support for real-time price updates
- [ ] Database integration for historical data
- [ ] Bulk product analysis endpoint

### **Frontend**
- [ ] Implement barcode scanner (expo-camera)
- [ ] Product details screen
- [ ] Price history charts
- [ ] Favorites/watchlist
- [ ] Push notifications for price changes

---

## 📝 Notes

- **Module System**: Backend uses ES Modules (`.js` extensions required in imports)
- **TypeScript**: Strict mode enabled on both frontend and backend
- **Testing**: Comprehensive Jest suite with mocks (no real API calls in tests)
- **Deployment**: (Not yet configured) - likely AWS Lambda + API Gateway for backend, Expo EAS for mobile

---

**Last Updated**: April 2, 2026  
**Maintained By**: Project Team  
**Version**: 1.0.0
