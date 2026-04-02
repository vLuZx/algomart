# Algomart Mobile App

> **Amazon Product Analysis Scanner** - Built with Expo + React Native + TypeScript

A professional mobile app for analyzing Amazon products via barcode scanning. Features intelligent product scoring, session management, and real-time analysis.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

**See**: [`QUICKSTART.md`](./QUICKSTART.md) for detailed setup instructions.

---

## 📊 Project Status

**Foundation**: ✅ 100% Complete (46 files, 2,353 lines)
**Screens**: 🚧 40% Complete
**Next Priority**: Scanner implementation

### **✅ What Works**
- Complete state management (Zustand + TanStack Query)
- Product scoring algorithm (production-ready)
- API integration with backend
- Base UI components (Button, Card, Loading, etc.)
- Session management with persistence
- Design system (tokens-based styling)

### **🚧 In Progress**
- Scanner screen (camera integration)
- Product detail screen
- Session product list screen

**See**: [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) for complete status.

---

## 📁 Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # ✅ Root with providers
│   ├── (tabs)/
│   │   └── index.tsx      # ✅ Home screen
│   └── session/           # 🚧 Scanner, product list, detail
│
├── components/            # ✅ Reusable UI
│   └── ui/               # Button, Card, Loading, etc.
│
├── features/             # ✅ Feature modules
│   ├── session/          # Session management
│   ├── scanner/          # Scanner utilities
│   └── product/          # Scoring algorithm
│
├── services/             # ✅ API layer
├── constants/            # ✅ Design tokens & config
└── utils/                # ✅ Helpers
```

---

## 🎯 Key Features

### **Product Scoring Algorithm**
Intelligent ranking based on:
- **Profit Margin** (35%)
- **Competition** (25%)
- **Popularity** (20%)
- **Logistics** (10%)
- **Approval Status** (10%)

Grades: A-F | Recommendations: Excellent/Good/Fair/Poor

### **Session Management**
- **Single Scan Mode** → Scan one product, view details immediately
- **Rapid Scan Mode** → Scan multiple products, review list later
- Duplicate detection
- Persistent sessions (survives app restart)

### **Smart Pagination**
- 25 products per page
- Global row numbering (1-n)
- Ranked by score (best first)

---

## 🛠 Tech Stack

- **Framework**: Expo SDK ~54.0.33
- **UI**: React Native 0.81.5
- **Language**: TypeScript ~5.9.2
- **Navigation**: Expo Router v6.0.23 (file-based)
- **State Management**: Zustand + TanStack Query
- **Camera**: React Native Vision Camera (planned)
- **Barcode Scanning**: Vision Camera Code Scanner (planned)

---

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** → Get started in 5 minutes
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** → Complete implementation status
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** → What was built & why
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** → Full system architecture (frontend + backend)

---

## 🎨 Design System

### **Tokens-Based Styling**
```typescript
import { tokens } from '@/constants/tokens';

// Colors
tokens.colors.primary        // #007AFF
tokens.colors.success        // #34C759

// Spacing
tokens.spacing.md            // 16px
tokens.spacing.lg            // 24px

// Typography
tokens.typography.heading1   // 28px bold
tokens.typography.body       // 16px regular
```

### **Style Co-Location**
Styles live at bottom of component files for fast iteration.

---

## 🧪 Testing (Planned)

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Priority Test Areas**:
- Product scoring algorithm
- Profit calculations
- Barcode validation
- Product ranking
- Session management

---

## 🔧 Configuration

### **Backend API**
Edit `src/constants/config.ts`:
```typescript
export const API_BASE_URL = 'http://localhost:3000';
```

### **Scoring Weights**
Edit `src/constants/scoring.ts`:
```typescript
export const SCORING_WEIGHTS = {
  PROFIT_MARGIN: 0.35,
  COMPETITIVENESS: 0.25,
  // ...
};
```

---

## 📱 Backend Integration

This app consumes the Express + TypeScript backend at `../server/`.

**Primary Endpoint**:
```
GET /api/amazon/product-analysis/:barcode
```

Returns comprehensive analysis:
- Catalog item (title, image, brand)
- Pricing data
- Competitive offers
- Sales rank
- Partial failure support

**See**: [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for full API documentation.

---

## 🏗 Architecture Highlights

### **Feature-Based Structure**
Each feature is self-contained with its own:
- Types
- Hooks
- Utils
- Store (if needed)

### **State Management Split**
- **Zustand** → Local UI state (sessions, scanner)
- **TanStack Query** → Server state (product data, API calls)

### **Small, Focused Files**
- 61% of files < 100 lines
- 30% of files 100-200 lines
- 9% of files 200+ lines (justified complexity)

---

## 🚧 Next Steps

1. **Scanner Screen** → Camera + barcode detection (Priority: CRITICAL)
2. **Product Components** → Score display, metrics, warnings (Priority: HIGH)
3. **Product Detail Screen** → Comprehensive analysis view (Priority: HIGH)
4. **Session List Screen** → Ranked products with pagination (Priority: MEDIUM)
5. **Tests** → Unit tests for scoring algorithm (Priority: MEDIUM)

**See**: [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) for detailed roadmap.

---

## 💡 Key Concepts

### **Enriched Product**
Backend response + calculated score + app-derived factors
```typescript
{
  barcode: "885909950805",
  analysis: { /* backend response */ },
  score: { total: 85.3, grade: 'A', recommendation: 'excellent' },
  factors: { profitMargin: 90, competitiveness: 85, ... },
  rank: 1
}
```

### **Session Modes**
- **Single Scan** → Immediate analysis, navigate to detail
- **Rapid Scan** → Build list, review later, ignore duplicates

### **Scoring Logic**
```
High Score = High profit + Low competition + High popularity + No approval
Low Score = Low profit + High competition + Low popularity + Approval required
```

---

## 🤝 Contributing

### **Code Style**
- Files: `kebab-case.tsx` (screens), `PascalCase.tsx` (components)
- Variables: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Use design tokens (never hardcode colors/spacing)

### **File Size Guidelines**
- Keep files < 100 lines when possible
- Extract business logic to utils
- Keep screens focused on orchestration

---

## 📖 Learn More

- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [React Native Vision Camera](https://react-native-vision-camera.com/)

---

## ✨ Features Summary

- ✅ **Session Management** → Single/Rapid scan modes
- ✅ **Product Scoring** → Intelligent ranking algorithm
- ✅ **API Integration** → Backend consumption
- ✅ **State Management** → Zustand + TanStack Query
- ✅ **Design System** → Tokens-based styling
- 🚧 **Barcode Scanner** → Camera integration (next)
- 🚧 **Product Analysis** → Comprehensive display (next)
- 🚧 **Pagination** → Ranked product list (next)

---

**Built with**: TypeScript, React Native, Expo

**Status**: Foundation Complete ✅ | Screens In Progress 🚧

**Last Updated**: April 2, 2026
