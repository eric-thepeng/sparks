
import React from 'react';
import { Post } from '../types';
import { PostCard } from './PostCard';

interface MasonryFeedProps {
  posts: Post[];
  onLikeToggle: (id: string) => void;
  onPostClick: (post: Post) => void;
}

export const MasonryFeed: React.FC<MasonryFeedProps> = ({ posts, onLikeToggle, onPostClick }) => {
  // Split posts into two columns
  const leftColumnPosts = posts.filter((_, i) => i % 2 === 0);
  const rightColumnPosts = posts.filter((_, i) => i % 2 !== 0);

  return (
    <div className="px-2 pb-20"> {/* pb-20 for bottom nav clearance */}
      <div className="flex gap-2 items-start">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-2">
          {leftColumnPosts.map((post) => (
            <PostCard key={post.id} post={post} onLikeToggle={onLikeToggle} onClick={onPostClick} />
          ))}
        </div>
        
        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-2">
          {rightColumnPosts.map((post) => (
            <PostCard key={post.id} post={post} onLikeToggle={onLikeToggle} onClick={onPostClick} />
          ))}
        </div>
      </div>
      
      {/* Loading Indicator */}
      <div className="py-6 flex justify-center text-gray-400 text-xs font-medium">
        <span>- THE END -</span>
      </div>
    </div>
  );
};
