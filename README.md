# Spark

A premium, intellectual feed-reading application built with Expo and React Native. Features a highly curated, warm aesthetic and a personalized recommendation engine.

## ✨ Features

- **Personalized Feed** - Masonry-style discovery feed with a smart recommendation system based on user interests.
- **Topic Buckets & Tag Navigation** - Context-aware topic exploration. Click any tag to open a focused "Bucket" overlay without leaving your current post or tab.
- **Deep Reading Experience** - A focused, vertical-paging reader with a **decoupled gesture system**. Vertical scrolling always takes priority, with horizontal paging enabled only after the page is fully read.
- **Minimalist Progress Tracking** - A refined, non-intrusive vertical progress bar that visualizes reading position with precision.
- **Dynamic Collections** - A library view that surfaces random interesting tags on every visit to encourage serendipitous discovery.
- **Cloud-Synced History & Likes** - View history and liked posts are persisted to the backend for a consistent multi-device experience.
- **On-the-Spot Profile Management** - Quick, inline editing of display names and profile photos.

## 📁 Project Structure

```
scrollden/
├── App.tsx                  ← Main app entry point & UI Router
├── app.json                 ← Expo configuration (Name, Bundle ID, Schemes)
├── src/
│   ├── api/                 ← Network Layer
│   │   ├── index.ts         ← Unified API client (fetch wrapper)
│   │   └── types.ts         ← Backend-synchronized TypeScript interfaces
│   ├── context/             ← State Management
│   │   ├── AuthContext.tsx  ← Identity, JWT, and Profile state
│   │   ├── HistoryContext.tsx ← View history persistence logic
│   │   ├── PostCacheContext.tsx ← Smart feed caching & infinite scroll
│   │   ├── SavedContext.tsx   ← Bookmarks management
│   │   └── RecommendationContext.tsx ← Signal tracking & rebalancing
│   ├── data/                ← Data Definitions
│   │   └── buckets.ts       ← Bucket and Tag definitions & sync logic
│   ├── screens/             ← Main View Components
│   │   ├── AuthScreen.tsx   ← Login / Signup / Google OAuth
│   │   ├── ProfileScreen.tsx ← User Profile & Preferences
│   │   └── OnboardingScreen.tsx ← Interest selection & new user setup
│   └── hooks/               ← Reusable Logic
└── assets/                  ← Branding, icons, and static images
```

## 🚀 Development

### 1. Local Setup
```bash
# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

### 2. Running on Native Platforms
To test native features like Google Login, use a local native build:
```bash
# Run on iOS Simulator (Mac only)
npx expo run:ios

# Run on physical device
npx expo run:ios --device
```

## 🔌 API & Integration

### Production Base URL
`https://spark-api-346549054402.us-east1.run.app`

### Core Endpoints

| Category | Method | Path | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | POST | `/auth/login` | Email/Password login |
| | POST | `/auth/google` | Google OAuth token exchange |
| **Feed** | GET | `/posts` | Get personalized recommended feed |
| | GET | `/posts/{id}` | Fetch full content for a single post |
| **Profile** | GET | `/me` | Retrieve current user profile (includes interests) |
| | PATCH | `/me` | Update name, bio, or interest tags |
| **Social** | POST | `/me/likes` | Like a post/item |
| | GET | `/me/history` | Fetch paginated view history |
| **Recs** | POST | `/api/signals` | Send interaction signal (click, read, etc.) |
| | POST | `/api/onboarding` | Submit interests & reset recommendations |
| | GET | `/api/buckets` | Sync available content categories |

## 📦 Deployment (EAS)

This project uses **Expo Application Services (EAS)** for TestFlight and Production builds.

### 1. Environment Variables
Local `.env` files are not used in cloud builds. You must configure **EAS Secrets** on the Expo dashboard for:
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`
- `EXPO_PUBLIC_IOS_OAUTH_CLIENT_ID`

### 2. Build for TestFlight
```bash
npx eas build --platform ios --auto-submit
```

### 3. Build & Versioning
- **App Name:** `spark`
- **Bundle ID:** `com.gc.spark`
- **Current Version:** Check `app.json` for the latest `version` and `buildNumber`.

## 🎨 Design System

- **Primary:** `#FFD166` (Sunglow Yellow)
- **Background:** `#F4F1E6` (Sand)
- **Card:** `#FFFEF9` (Creamy White)
- **Text:** `#451a03` (Dark Amber / Brown)
- **Outline:** `#B45309` (Deep Amber)

The app uses a 1.5px border weight and 4px shadows to create a tactile, "button-like" aesthetic.
