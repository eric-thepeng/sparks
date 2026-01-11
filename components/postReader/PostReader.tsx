import React, { useState, useEffect, useMemo } from 'react';
import { Post, Page } from '../../types';
import { PostPage } from './PostPage';
import { ChevronLeft, Share2 } from 'lucide-react';
import { parseDescriptionToBlocks } from './utils/parseDescriptionToBlocks'; // Legacy fallback
import { splitBlocksToPages } from './utils/splitBlocksToPages'; // Legacy fallback

interface PostReaderProps {
  post: Post;
  onClose: () => void;
}

export const PostReader: React.FC<PostReaderProps> = ({
  post,
  onClose
}) => {
  const [headerCompact, setHeaderCompact] = useState(false);
  
  // Resolve Pages: Use new `pages` field if available, otherwise fallback to legacy parsing
  const pages: Page[] = useMemo(() => {
    if (post.pages && post.pages.length > 0) {
        return post.pages;
    }
    // Fallback for old data format
    // Note: We removed the files but let's assume we handle it or return empty
    // To be safe, if no pages, return a single dummy page or try to parse description if logic existed
    // Since we deleted the files, we must rely on post.pages or minimal fallback.
    return [{ index: 1, blocks: [{ type: 'paragraph', text: post.description }] }];
  }, [post]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [prevPageIndex, setPrevPageIndex] = useState<number | null>(null);
  const [animDirection, setAnimDirection] = useState<'next' | 'prev' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Switch Page Logic
  const goToNextPage = () => {
      if (activeIndex < pages.length - 1 && !isAnimating) {
          setPrevPageIndex(activeIndex);
          setAnimDirection('next');
          setActiveIndex(prev => prev + 1);
          setIsAnimating(true);
      }
  };

  const goToPrevPage = () => {
      if (activeIndex > 0 && !isAnimating) {
          setPrevPageIndex(activeIndex);
          setAnimDirection('prev');
          setActiveIndex(prev => prev - 1);
          setIsAnimating(true);
      }
  };

  const handlePageScrollTop = (top: number) => {
    if (activeIndex === 0) {
      setHeaderCompact(top > 24); 
    } else {
      setHeaderCompact(true);
    }
  };

  // Clear animation state after transition
  useEffect(() => {
    if (isAnimating) {
        const timer = setTimeout(() => {
            setIsAnimating(false);
            setPrevPageIndex(null);
            setAnimDirection(null);
        }, 400); // Match CSS duration
        return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  // Animation Styles (Standard Push)
  const animationStyles = `
    @keyframes slideOutToTop {
      to { transform: translateY(-100%); }
    }
    @keyframes slideInFromBottom {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes slideOutToBottom {
      to { transform: translateY(100%); }
    }
    @keyframes slideInFromTop {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
    
    .anim-next-enter { animation: slideInFromBottom 0.4s ease-in-out forwards; }
    .anim-next-exit { animation: slideOutToTop 0.4s ease-in-out forwards; }
    
    .anim-prev-enter { animation: slideInFromTop 0.4s ease-in-out forwards; }
    .anim-prev-exit { animation: slideOutToBottom 0.4s ease-in-out forwards; }
  `;

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <style>{animationStyles}</style>
      
      {/* Sticky Header */}
      <div 
        className={`shrink-0 bg-white/95 backdrop-blur-sm z-30 transition-all duration-300 border-b border-gray-50 absolute top-0 left-0 right-0 pointer-events-none
          ${headerCompact ? 'py-2' : 'py-4'}
        `}
      >
        <div className="flex items-center justify-between px-3">
            <button onClick={onClose} className="p-2 -ml-2 text-gray-800 hover:bg-gray-50 rounded-full z-40 pointer-events-auto">
                <ChevronLeft size={26} />
            </button>
            
            {/* Centered Title/User Info */}
            <div className={`flex-1 mx-4 transition-all duration-300 flex flex-col items-center overflow-hidden pointer-events-auto
                 ${headerCompact ? 'opacity-100 scale-100' : 'opacity-100'} 
            `}>
                 <div className={`font-bold text-gray-900 text-center transition-all duration-300 truncate w-full leading-tight
                    ${headerCompact ? 'text-[15px]' : 'text-[18px]'}
                 `}>
                    {post.title} 
                 </div>
                 
                 {/* User info line - fades out when compact */}
                 <div className={`text-xs text-gray-500 mt-1 flex items-center gap-1 transition-all duration-300
                    ${headerCompact ? 'h-0 opacity-0 overflow-hidden mt-0' : 'h-auto opacity-100'}
                 `}>
                    <img src={post.user.avatar} className="w-3 h-3 rounded-full" alt="" />
                    <span>{post.user.name}</span>
                 </div>
            </div>

            <button className="p-2 text-gray-800 hover:bg-gray-50 rounded-full z-40 pointer-events-auto">
                <Share2 size={22} />
            </button>
        </div>
        
        {/* Global Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
            <div 
                className="h-full bg-brand transition-all duration-300 ease-out"
                style={{ width: `${((activeIndex + 1) / pages.length) * 100}%` }}
            />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-white">
          
          {/* Exiting Page (only visible during animation) */}
          {isAnimating && prevPageIndex !== null && (
             <div 
                key={`prev-${prevPageIndex}`}
                className={`absolute inset-0 w-full h-full z-0 ${
                    animDirection === 'next' ? 'anim-next-exit' : 'anim-prev-exit'
                }`}
             >
                <PostPage 
                    page={pages[prevPageIndex]}
                    pageIndex={prevPageIndex}
                    post={post}
                    isActive={false}
                    onScrollTop={() => {}} 
                    onNextPage={() => {}}
                    onPrevPage={() => {}}
                    isLastPage={prevPageIndex === pages.length - 1}
                    isFirstPage={prevPageIndex === 0}
                    initialScrollPosition={animDirection === 'prev' ? 'top' : 'bottom'} 
                />
             </div>
          )}

          {/* Active Page */}
          <div 
            key={`active-${activeIndex}`}
            className={`absolute inset-0 w-full h-full z-10 ${
                isAnimating ? (animDirection === 'next' ? 'anim-next-enter' : 'anim-prev-enter') : ''
            }`}
          >
            <PostPage 
                page={pages[activeIndex]}
                pageIndex={activeIndex}
                post={post}
                isActive={!isAnimating} // Only active after animation
                onScrollTop={handlePageScrollTop}
                onNextPage={goToNextPage}
                onPrevPage={goToPrevPage}
                isLastPage={activeIndex === pages.length - 1}
                isFirstPage={activeIndex === 0}
                initialScrollPosition={animDirection === 'prev' ? 'bottom' : 'top'}
            />
          </div>

          {/* Page Indicator */}
          {pages.length > 1 && (
              <div className="fixed bottom-20 right-4 bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full pointer-events-none z-50 font-medium">
                  {activeIndex + 1} / {pages.length}
              </div>
          )}
      </div>
    </div>
  );
};
