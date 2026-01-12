import React, { useState, useEffect, useRef } from 'react';
import { Heart, Star, MessageCircle } from 'lucide-react';
import { Post } from '../types';
import { PostReader } from './postReader/PostReader';

interface PostDetailProps {
  post: Post;
  posts?: Post[]; // Optional for backward compatibility but required for nav
  selectedPostId?: string | null;
  onSelectPost?: (id: string) => void;
  onBack: () => void;
  onLikeToggle: (id: string) => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({
  post,
  posts = [],
  selectedPostId,
  onSelectPost,
  onBack,
  onLikeToggle
}) => {
  const [isCollected, setIsCollected] = useState(post.isCollected);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left' | null>(null);
  const prevPostIdRef = useRef(post.id);

  // Sync state when post changes
  useEffect(() => {
    setLocalIsLiked(post.isLiked);
    setLocalLikes(post.likes);
    setIsCollected(post.isCollected);

    // Determine slide direction based on index change
    if (prevPostIdRef.current !== post.id) {
        const oldIndex = posts.findIndex(p => p.id === prevPostIdRef.current);
        const newIndex = posts.findIndex(p => p.id === post.id);
        
        // If index increased -> Next -> Slide In From Right
        // If index decreased -> Prev -> Slide In From Left
        if (newIndex > oldIndex) {
            setSlideDirection('right');
        } else if (newIndex < oldIndex) {
            setSlideDirection('left');
        } else {
            setSlideDirection(null);
        }
        prevPostIdRef.current = post.id;
    }
  }, [post.id, post.isLiked, post.likes, post.isCollected, posts]);

  const handleLike = () => {
    const newLikedState = !localIsLiked;
    setLocalIsLiked(newLikedState);
    setLocalLikes(prev => newLikedState ? prev + 1 : prev - 1);
    onLikeToggle(post.id);
  };

  // Horizontal Navigation Logic
  const navLockRef = useRef(false);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  const switchPost = (direction: 'next' | 'prev') => {
    if (navLockRef.current || !onSelectPost || posts.length === 0) return;

    const currentIndex = posts.findIndex(p => p.id === post.id);
    if (currentIndex === -1) return;

    let targetId = null;
    if (direction === 'next' && currentIndex < posts.length - 1) {
        targetId = posts[currentIndex + 1].id;
    } else if (direction === 'prev' && currentIndex > 0) {
        targetId = posts[currentIndex - 1].id;
    }

    if (targetId) {
        navLockRef.current = true;
        onSelectPost(targetId);
        setTimeout(() => { navLockRef.current = false; }, 400); // Cooldown
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const { deltaX, deltaY } = e;
    
    // Horizontal wheel dominance for post switching
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        if (deltaX > 0) switchPost('next');
        else switchPost('prev');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const dx = endX - touchStartRef.current.x;
      const dy = endY - touchStartRef.current.y;
      
      // Thresholds: horizontal swipe dominance for POST switching
      // Require significant horizontal movement to avoid trigger during vertical scroll
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) switchPost('next'); // Swipe left -> Next Post
          else switchPost('prev'); // Swipe right -> Prev Post
      }
      
      touchStartRef.current = null;
  };

  const animationStyles = `
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes slideInLeft {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    .slide-in-right { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .slide-in-left { animation: slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `;

  return (
    <div 
        className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-200 touch-pan-y"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
      <style>{animationStyles}</style>
      <div className="flex-1 relative overflow-hidden">
         {/* Wrapper with key to trigger animation on post change */}
         <div 
            key={post.id}
            className={`w-full h-full absolute inset-0 bg-white ${
                slideDirection === 'right' ? 'slide-in-right shadow-2xl z-10' : 
                slideDirection === 'left' ? 'slide-in-left shadow-2xl z-10' : ''
            }`}
         >
             <PostReader 
                 post={post} 
                 onClose={onBack}
             />
         </div>
      </div>

      {/* Bottom Action Bar (Shared) */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 h-[58px] px-4 flex items-center gap-4 z-40 pb-1">
          <div className="flex-1 bg-gray-100 h-10 rounded-full flex items-center px-4 text-gray-400 text-[14px]">
             <span className="mr-2">Say something...</span>
          </div>
          
          <div className="flex items-center gap-6 text-gray-600">
             <button onClick={handleLike} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                <Heart size={24} className={`transition-colors duration-300 ${localIsLiked ? "fill-brand text-brand" : "text-gray-600"}`} />
                <span className="text-[11px] font-medium text-gray-500">{localLikes > 0 ? localLikes : 'Like'}</span>
             </button>
             <button onClick={() => setIsCollected(!isCollected)} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                <Star size={24} className={`transition-colors duration-300 ${isCollected ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                <span className="text-[11px] font-medium text-gray-500">{isCollected ? 'Saved' : 'Collect'}</span>
             </button>
             <button className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                <MessageCircle size={24} className="text-gray-600" />
                <span className="text-[11px] font-medium text-gray-500">{post.comments > 0 ? post.comments : 'Comment'}</span>
             </button>
          </div>
      </div>
    </div>
  );
};
