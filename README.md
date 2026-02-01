# Sparks

Expo + React Native Mobile App - Xiaohongshu-style Feed Reading App

## ✨ Features

- **Feed** - Masonry-style post feed with beautiful cards
- **Post Reader** - Paginated reading experience with smooth scrolling
- **Save** - Bookmark posts for later, persisted locally with backend sync support
- **Notes** - Take notes while reading, linked to specific posts

## 📁 Project Structure

```
sparks/
├── App.tsx                  ← Main app (UI + state)
├── index.ts                 ← Entry point
├── assets/
│   └── posts/               ← Post images (55 files)
├── src/
│   ├── api/                 ← API layer
│   │   ├── index.ts         ← API client (fetch wrapper)
│   │   └── types.ts         ← API type definitions
│   ├── context/             ← React Context (state management)
│   │   ├── index.ts         ← Context entry
│   │   ├── SavedContext.tsx ← Saved posts state + AsyncStorage
│   │   └── NotesContext.tsx ← Notes state + AsyncStorage
│   ├── data/                ← Data layer
│   │   ├── index.ts         ← Data management + transformers
│   │   ├── imageMap.ts      ← Local image mapping
│   │   ├── posts.ts         ← Post type definitions
│   │   └── postsData.json   ← Local post data (offline fallback)
│   └── hooks/               ← React Hooks
│       ├── index.ts         ← Hooks entry
│       ├── usePosts.ts      ← Data fetching hooks
│       ├── useSavedPosts.ts ← Save functionality hook
│       └── useNotes.ts      ← Notes functionality hook
└── scripts/
    ├── generate-image-map.js  ← Image mapping generator
    └── convert-posts.js       ← JSONL to TypeScript converter
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx (UI Layer)                                         │
│  └── useFeedItems() / usePost()                             │
│  └── useSavedPosts() / useNotesHook()                       │
├─────────────────────────────────────────────────────────────┤
│  src/context/ (State Management)                            │
│  └── SavedContext - Saved posts with AsyncStorage           │
│  └── NotesContext - Notes with AsyncStorage                 │
│  └── Reserved backend sync interfaces                       │
├─────────────────────────────────────────────────────────────┤
│  src/hooks/ (Custom Hooks)                                  │
│  └── usePosts.ts - Loading/error/success states             │
│  └── useSavedPosts.ts - Save operations                     │
│  └── useNotes.ts - Notes operations                         │
├─────────────────────────────────────────────────────────────┤
│  src/api/index.ts (Network Layer)                           │
│  └── Fetch backend API                                      │
│  └── Unified error handling and timeout                     │
├─────────────────────────────────────────────────────────────┤
│  src/data/index.ts (Data Layer)                             │
│  └── Transform: ApiPost → FeedItem / Post                   │
│  └── Parse Markdown pages to ContentBlocks                  │
│  └── Local data fallback                                    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm start

# Start with cache clear
npm run start:clear
```

## 📱 Native Development Build

For features requiring native configuration (like **Google Sign-In**), you must use a **Development Build** instead of Expo Go.

### 1. Prerequisites
Install EAS CLI globally:
```bash
npm install -g eas-cli
```

### 2. Build for iOS Simulator
This builds a custom client that includes your native config (URL schemes, etc.):
```bash
npx eas build --profile development-simulator --platform ios
```

### 3. Install & Run
1. Download the `.tar.gz` from the build link.
2. Unzip and drag `mobile.app` into your iOS Simulator.
3. Start the development server for the custom client:
```bash
npx expo start --dev-client
```

## 🔌 Backend API

### API Base URL
```
https://spark-api-nvy6vvhfoa-ue.a.run.app
```

### Available Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/posts` | Get post list |
| GET | `/posts/{id}` | Get single post (id = platform_post_id) |
| GET | `/api/db/posts?limit=20&offset=0` | Paginated posts |
| POST | `/generate` | Generate new posts |

### Data Structures

**API Post Format (ApiPost):**
```typescript
{
  platform_post_id: string;  // Unique ID
  title: string;             // Title
  cover_image?: string;      // Cover image URL (direct string, or "prompt:xxx" format)
  pages: string[];           // Array of Markdown strings, one per page
  tags?: string[];           // Tags array
  bucket_key?: string;       // Category identifier
  author?: string;           // Author name
  like_count?: number;       // Like count
  collect_count?: number;    // Collect count
  created_at?: string;       // ISO8601 timestamp
}
```

**Example:**
```json
{
  "platform_post_id": "spark_123",
  "title": "Article Title",
  "cover_image": "https://storage.googleapis.com/.../cover.png",
  "pages": [
    "First page content in **Markdown** format...\n\n![img_1](https://...)",
    "Second page content...",
    "Third page content..."
  ],
  "bucket_key": "philosophy",
  "tags": ["Philosophy", "Life"],
  "like_count": 42,
  "collect_count": 10
}
```

Each page is a Markdown string that may contain:
- Headers (`#`, `##`, `###`)
- Paragraphs
- Images (`![alt](url)`)
- Lists (`- item` or `1. item`)
- Blockquotes (`> quote`)

**App Internal Format (FeedItem / Post):**
```typescript
// FeedItem - for feed cards
interface FeedItem {
  uid: string;
  title: string;
  topic: string;
  coverImage: ImageSource;
  likes: number;
  isLiked: boolean;
  comments: number;
  user: { id, name, avatar };
}

// Post - for post detail page
interface Post {
  uid: string;
  title: string;
  topic: string;
  pages: PostPage[];           // Paginated content
  coverImageUrl?: string;      // Cover image URL (from backend)
  inlineImages?: Map<string, string>;  // Image mapping: id -> url
  author?: string;
  likeCount?: number;
  collectCount?: number;
}
```

## 🎣 Hooks Usage

### useFeedItems
Get feed list:
```typescript
const { 
  feedItems,  // FeedItem[]
  status,     // 'idle' | 'loading' | 'success' | 'error'
  error,      // string | null
  refetch     // () => void
} = useFeedItems();
```

### usePaginatedFeed
Paginated fetch (infinite scroll):
```typescript
const { 
  feedItems,
  status,
  error,
  hasMore,   // boolean - has more data
  loadMore,  // () => void - load next page
  refetch    // () => void - reload
} = usePaginatedFeed(20);
```

### usePost
Get single post detail:
```typescript
const { 
  post,      // Post | null
  status,
  error,
  refetch
} = usePost(postId);
```

## 💾 Save & Notes

### useSavedPosts
Manage saved posts:
```typescript
const { 
  savedPosts,  // SavedPost[]
  savedCount,  // number
  isLoading,
  isEmpty,
  save,        // (post) => Promise<void>
  unsave,      // (uid) => Promise<void>
  toggle,      // (post) => Promise<boolean>
  isSaved,     // (uid) => boolean
  clearAll,    // () => Promise<void>
} = useSavedPosts();
```

### useNotesHook
Manage notes:
```typescript
const { 
  notes,       // Note[]
  noteCount,   // number
  isLoading,
  isEmpty,
  add,         // (postUid, postTitle, content) => Promise<Note>
  update,      // (noteId, content) => Promise<void>
  remove,      // (noteId) => Promise<void>
  getForPost,  // (postUid) => Note[]
  hasNotes,    // (postUid) => boolean
  clearAll,    // () => Promise<void>
} = useNotesHook();
```

### Data Structures

```typescript
// SavedPost - saved post info
interface SavedPost {
  uid: string;
  title: string;
  topic: string;
  coverImageUri?: string;
  savedAt: string;        // ISO timestamp
  syncedToServer?: boolean;
}

// Note - user note
interface Note {
  id: string;
  postUid: string;        // Associated post
  postTitle: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  syncedToServer?: boolean;
}
```

### Backend Sync (Reserved)
Both Save and Notes support backend synchronization:
```typescript
// Bind user account
const { bindAccount } = useSavedSync();
await bindAccount('user123', 'auth_token');

// Sync to server
const { syncToServer, syncStatus } = useSavedSync();
await syncToServer();  // syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
```

Implementation points in context files:
- `SavedContext.tsx` - `syncToServer()`, `syncSinglePost()`, `deleteSyncedPost()`
- `NotesContext.tsx` - `syncToServer()`, `syncSingleNote()`, `deleteSyncedNote()`

## 📊 Data Generation

### Generate Posts from JSONL

```bash
# Convert JSONL to TypeScript (auto-fix Chinese quotes)
npm run convert:posts -- ~/Downloads/posts.jsonl
```

### Generate Image Mapping

```bash
# After placing images in assets/posts/
npm run gen:images
```

## ⚠️ Notes

1. **Chinese Quotes**: Chinese quotes `""` cause syntax errors in JS/TS. The `convert:posts` script handles this automatically.

2. **Local Images**: React Native doesn't support dynamic `require()`. Use `gen:images` to pre-map all images.

3. **Data Transform**: API `pages` is a Markdown string array, automatically parsed to `pages/blocks` structure in `apiPostToPost()`.

4. **Cover Image**: The `cover_image` field may be a direct URL or `prompt:xxx` format. Prompt format is treated as no image.

5. **Offline Fallback**: If API fails, use `getFeedItems()` / `getPost()` for local data.

6. **Local Storage**: Save and Notes use AsyncStorage for persistence. Data survives app restarts.

## 🔧 Development

### Add New API Endpoint

1. Add types in `src/api/types.ts`
2. Add request function in `src/api/index.ts`
3. Add hook in `src/hooks/`
4. Add transformer in `src/data/index.ts` if needed

### Add New Feature with State

1. Create context in `src/context/YourContext.tsx`
2. Export from `src/context/index.ts`
3. Create hook in `src/hooks/useYour.ts`
4. Wrap app with provider in `App.tsx`

### Change API URL

Edit `src/api/index.ts`:
```typescript
const API_BASE_URL = 'https://your-api-url.com';
```

### Implement Backend Sync

Edit context files to implement TODO functions:
```typescript
// In SavedContext.tsx or NotesContext.tsx
const syncToServer = async () => {
  // Replace TODO with actual API call
  await api.syncData(userId, data, authToken);
};
```
