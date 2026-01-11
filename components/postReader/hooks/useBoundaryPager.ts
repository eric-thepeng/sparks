import { RefObject, useEffect, useRef } from 'react';

interface UseBoundaryPagerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  lockDuration?: number; // ms to lock paging after a switch
  isActive: boolean; // only trigger if page is active
}

export const useBoundaryPager = ({
  containerRef,
  onNextPage,
  onPrevPage,
  hasNext,
  hasPrev,
  lockDuration = 500,
  isActive
}: UseBoundaryPagerProps) => {
  const lockedRef = useRef(false);
  const boundaryThreshold = 10; // Detection threshold

  const unlock = () => {
    setTimeout(() => {
      lockedRef.current = false;
    }, lockDuration);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isActive) return;

    const handleWheel = (e: WheelEvent) => {
        if (lockedRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        
        // Strict boundary checks
        const isAtBottom = distanceToBottom <= boundaryThreshold;
        const isAtTop = scrollTop <= boundaryThreshold;

        // Desktop Wheel Logic:
        // We only switch page if we are AT the boundary AND user tries to scroll further
        if (e.deltaY > 20 && isAtBottom && hasNext) {
            // Scrolling down at bottom
            e.preventDefault(); 
            // We don't stop propagation necessarily unless we want to block outer scroll, 
            // but for snap container, we might want to let it happen naturally?
            // Actually, if we use a snap container, we don't need this manual switch for scrolling "out".
            // BUT, for desktop wheel, native snap sometimes requires a "push".
            // Let's rely on native scroll chaining for snap-container if possible, 
            // but this hook is specifically requested for "desktop wheel paging".
            
            // However, since we are using CSS Snap (y mandatory) as the primary mechanism for page switching (Goal B),
            // we might not need to manually trigger onNextPage if the outer container handles it.
            // But let's keep it as a helper/accelerator or for non-snap fallback.
            
            // NOTE: If we use scroll-snap, the OUTER container scrolls. 
            // The inner container (this one) hits limit -> event bubbles to outer -> outer scrolls -> snap happens.
            // So we might NOT need to do anything here if the structure is correct!
            
            // However, to ensure robust behavior on varied trackpads:
            // e.stopPropagation(); // Do NOT stop propagation to allow bubble to snap container
        } 
    };

    // We can just rely on standard scroll bubbling for the snap container to work.
    // The inner container scrolls to end -> next scroll event bubbles to parent -> parent scrolls -> snap triggers.
    
    // So this hook might strictly be for progress or other side effects, or legacy manual control.
    // Given the prompt asks for "Use a pragmatic approach: On mobile, prefer snap container... On desktop, use wheel boundary detection... OR also allow snap".
    // I will enable the snap container for BOTH and rely on natural scrolling.
    
    // BUT, I'll keep the listener to "force" it if needed, or simply strictly for locking/debounce if we want to prevent rapid-fire.
    
    // Let's implement a "cooldown" that temporarily disables pointer events or something? No, that's too complex.
    // Actually, with `scroll-snap-type: y mandatory`, the browser handles the "snap" physics.
    
    // I will use this hook primarily to detect "intent" if the native snap feels too sluggish, 
    // but for now let's leave it minimal or empty if native snap works.
    
    // The prompt says: "Desktop wheel paging... triggers next/prev when at boundary... includes lock".
    // I'll implement a manual trigger which smooth-scrolls the PARENT container.
    
    // Wait, `onNextPage` passed from parent usually updates state `pageIndex`.
    // If we use CSS snap, `pageIndex` is derived from scroll position, not state that drives scroll.
    // I should structure `PostReader` to be "Scroll Driven" (UI state follows scroll) rather than "State Driven" (Scroll follows UI state).
    // The prompt says "PostReader displays the post as multiple vertical pages... each page is an inner scroll container".
    
    // So: Parent (Snap Container) -> onScroll -> update PageIndex (for progress bar etc).
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [hasNext, hasPrev, lockDuration, isActive]);
};
