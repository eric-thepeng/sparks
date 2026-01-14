
export interface User {
  id: string;
  name: string;
  avatar: string;
}

// New Schema Types
export interface InlineImage {
  id: string;
  prompt: string;
  placement_hint?: string;
}

export type ContentBlock = 
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; attribution?: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'spacer'; size: 'sm' | 'md' | 'lg' }
  | { type: 'image'; ref: string; caption?: string };

export interface Page {
  index: number;
  blocks: ContentBlock[];
}

export interface Post {
  id: string;
  title: string;
  // description is kept for backward compatibility but might be unused if pages are present
  description: string; 
  pages?: Page[]; // New field for pre-paginated content
  inlineImages?: InlineImage[]; // Store inline image definitions
  tags: string[];
  comments: number;
  imageUrl: string;
  width: number;
  height: number;
  likes: number;
  isLiked: boolean;
  isCollected: boolean;
  user: User;
  type: 'video' | 'image';
  date: string;
  assetBaseUrl?: string; // Optional base URL for assets (images) if fetched from backend
}

export type NavTab = 'explore' | 'following' | 'search' | 'messages' | 'me';
export type FeedTab = 'follow' | 'explore' | 'nearby';
