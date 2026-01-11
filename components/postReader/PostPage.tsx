import React, { useRef, useEffect } from 'react';
import { Page, Post } from '../../types';
import { BlockRenderer } from './blocks';
import { ChevronDown } from 'lucide-react';

interface PostPageProps {
  page: Page;
  pageIndex: number;
  post: Post;
  isActive: boolean;
  onScrollTop: (top: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  isLastPage: boolean;
  isFirstPage: boolean;
  initialScrollPosition?: 'top' | 'bottom';
}

export const PostPage: React.FC<PostPageProps> = ({
  page,
  post,
  isActive,
  onScrollTop,
  onNextPage,
  onPrevPage,
  isLastPage,
  isFirstPage,
  initialScrollPosition = 'top'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const isLocked = useRef(false);

  // Restore Scroll Position
  useEffect(() => {
    // Only set scroll position on mount (or when page index changes)
    requestAnimationFrame(() => {
        if (containerRef.current) {
            if (initialScrollPosition === 'bottom') {
                // Scroll to bottom but keep the footer off-screen
                const scrollTarget = containerRef.current.scrollHeight - containerRef.current.clientHeight - 160;
                containerRef.current.scrollTop = scrollTarget > 0 ? scrollTarget : 0;
            } else {
                containerRef.current.scrollTop = 0;
            }
        }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.index]); // Use page index as stable identifier

  // Fallback Button Handlers
  const handleNextClick = () => {
      onNextPage();
  };

  // Logic-based Snap Handler (Pull-to-Flip + Wheel Boundary)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (isActive) onScrollTop(el.scrollTop);
    };

    // --- PC / Wheel Logic ---
    const handleWheel = (e: WheelEvent) => {
        if (isLocked.current) return;

        const { scrollTop, scrollHeight, clientHeight } = el;
        // Check for boundary proximity or OVERSCROLL (important for elastic scroll)
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; 
        const isAtTop = scrollTop <= 5;

        // Threshold for wheel "intent" to prevent overly sensitive snaps
        const WHEEL_THRESHOLD = 20;

        // Scroll Down at Bottom -> Next Page
        if (isAtBottom && e.deltaY > WHEEL_THRESHOLD && !isLastPage) {
            e.preventDefault(); 
            isLocked.current = true;
            onNextPage();
            setTimeout(() => { isLocked.current = false; }, 600); 
        } 
        // Scroll Up at Top -> Prev Page
        else if (isAtTop && e.deltaY < -WHEEL_THRESHOLD && !isFirstPage) {
            e.preventDefault();
            isLocked.current = true;
            onPrevPage();
            setTimeout(() => { isLocked.current = false; }, 600);
        }
    };

    // --- Mobile / Touch Logic ---
    const handleTouchStart = (e: TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        isDragging.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging.current || touchStartY.current === null || isLocked.current) return;
        
        const currentY = e.touches[0].clientY;
        const deltaY = touchStartY.current - currentY; // + = pull up (scroll down)
        
        const { scrollTop, scrollHeight, clientHeight } = el;
        
        // Revised Boundary Check: Handle Overscroll
        // On iOS, overscroll means scrollTop can be > (scrollHeight - clientHeight)
        // So we check if we are AT or BEYOND the boundary
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        const isAtTop = scrollTop <= 10;

        // Reduced Drag Threshold for easier triggering
        const DRAG_THRESHOLD = 40;

        // Logic: If at boundary AND pulling beyond -> Trigger Page Switch
        if (isAtBottom && deltaY > DRAG_THRESHOLD && !isLastPage) {
            isDragging.current = false; // consume event
            touchStartY.current = null;
            isLocked.current = true;
            onNextPage();
            setTimeout(() => { isLocked.current = false; }, 600);
        } else if (isAtTop && deltaY < -DRAG_THRESHOLD && !isFirstPage) {
            isDragging.current = false; // consume event
            touchStartY.current = null;
            isLocked.current = true;
            onPrevPage();
            setTimeout(() => { isLocked.current = false; }, 600);
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        touchStartY.current = null;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    el.addEventListener('wheel', handleWheel, { passive: false }); 
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true }); 
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isActive, onScrollTop, onNextPage, onPrevPage, isLastPage, isFirstPage]);

  // Handle Title Image Injection for Page 1
  // In the new schema, "Page 1" doesn't automatically contain the cover image block.
  // We need to decide if we inject it manually or rely on the JSONL data.
  // Since the prompt implied cover image is separate, let's inject it at the top of Page 1.
  const shouldShowCoverImage = page.index === 1;

  return (
    <div className="relative w-full h-full flex flex-col pt-[72px]">
       {/* Scrollable Content */}
       <div 
         ref={containerRef}
         className="flex-1 overflow-y-auto no-scrollbar w-full relative touch-pan-y min-h-0"
       >
          <div className="px-4 py-6 pb-20 max-w-2xl mx-auto flex flex-col min-h-full">
             
             {/* Inject Cover Image on Page 1 */}
             {shouldShowCoverImage && (
                 <div className="min-h-[300px] w-full mb-8 flex flex-col items-center">
                    <img 
                        src={post.imageUrl} // Use the main cover image
                        alt={post.title}
                        className="max-h-[60vh] w-auto max-w-full rounded-lg shadow-md object-contain"
                    />
                 </div>
             )}
             
             {/* Render blocks */}
             {page.blocks.map((block, idx) => (
               <BlockRenderer key={idx} block={block} post={post} />
             ))}
             
             {/* Empty State */}
             {page.blocks.length === 0 && !shouldShowCoverImage && (
                 <div className="p-4 bg-gray-50 text-gray-400 text-center text-sm">Empty page</div>
             )}
             
             {/* Spacer to push content up */}
             <div className="flex-1" />

             {/* Footer Area with Fallback Button */}
             <div className="h-24 flex flex-col items-center justify-center text-gray-300 gap-2 mt-8 pb-4 opacity-80">
                 {!isLastPage ? (
                     <button 
                        onClick={handleNextClick}
                        className="flex flex-col items-center gap-1 p-4 active:scale-95 transition-transform text-gray-400 hover:text-brand"
                     >
                        <span className="text-[10px] font-medium uppercase tracking-wider">Next Page</span>
                        <ChevronDown size={18} className="animate-bounce" />
                     </button>
                 ) : (
                     <div className="flex flex-col items-center gap-1 text-gray-300">
                        <div className="w-12 h-px bg-gray-200 mb-2"/>
                        <span className="text-[10px] uppercase tracking-widest">End</span>
                     </div>
                 )}
             </div>
          </div>
       </div>
    </div>
  );
};
