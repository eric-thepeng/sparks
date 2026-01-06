
export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Post {
  id: string;
  title: string;
  description: string;
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
}

export type NavTab = 'home' | 'shop' | 'create' | 'messages' | 'me';
export type FeedTab = 'follow' | 'explore' | 'nearby';
