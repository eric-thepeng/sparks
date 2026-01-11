import { AnyBlock, Page, ParagraphBlock, QuoteBlock, ListBlock } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface SplitOptions {
  heightLimit: number; // e.g., 800px or similar unit
  titleImageSrc?: string;
}

// Visual constants for estimation (approximating pixels)
const EST_CHAR_PER_LINE = 22; // Mobile average chars per line (CJK)
const LINE_HEIGHT = 24; 
const CHAR_WEIGHT_CJK = 1;
const CHAR_WEIGHT_LATIN = 0.5;

const EST_IMAGE_HEIGHT = 300; 
const EST_HEADING_HEIGHT = 50; 
const EST_SPACER_HEIGHT = 30;

export const splitBlocksToPages = (blocks: AnyBlock[], opts: SplitOptions): Page[] => {
  const pages: Page[] = [];
  let currentBlocks: AnyBlock[] = [];
  let currentHeight = 0;

  // 1. Inject Title Image if present (Page 1 only)
  if (opts.titleImageSrc) {
    currentBlocks.push({
      type: 'image',
      id: generateId(),
      src: opts.titleImageSrc,
      alt: 'Title Image'
    });
    currentBlocks.push({
      type: 'spacer',
      id: generateId(),
      size: 'md'
    });
    currentHeight += EST_IMAGE_HEIGHT + EST_SPACER_HEIGHT;
  }

  // Helper to estimate visual height of a block
  const estimateHeight = (block: AnyBlock): number => {
      switch(block.type) {
          case 'image': return EST_IMAGE_HEIGHT;
          case 'spacer': return EST_SPACER_HEIGHT;
          case 'heading': return EST_HEADING_HEIGHT;
          case 'paragraph': 
          case 'quote': {
              const text = (block as any).text || '';
              return estimateTextHeight(text);
          }
          case 'list': {
              const items = (block as any).items || [];
              return items.reduce((acc: number, item: string) => acc + estimateTextHeight(item), 0);
          }
          default: return 20;
      }
  };

  const estimateTextHeight = (text: string) => {
    if (!text) return 0;
    // Calculate "visual length" based on character weights
    let visualLen = 0;
    for (const char of text) {
        visualLen += char.match(/[\u4e00-\u9fa5]/) ? CHAR_WEIGHT_CJK : CHAR_WEIGHT_LATIN;
    }
    const lines = Math.ceil(visualLen / EST_CHAR_PER_LINE) || 1;
    return lines * LINE_HEIGHT + 16; // +16 margin
  };

  // Helper to create a new page
  const flushPage = () => {
    if (currentBlocks.length > 0) {
      pages.push({
        id: generateId(),
        blocks: [...currentBlocks]
      });
      currentBlocks = [];
      currentHeight = 0;
    }
  };

  for (const block of blocks) {
    const blockHeight = estimateHeight(block);

    // Check if adding this block exceeds height limit
    if (currentHeight + blockHeight > opts.heightLimit && currentBlocks.length > 0) {
      
      // If the block is massive (larger than a single page), we split it
      if (blockHeight > opts.heightLimit) {
         flushPage(); // Start fresh
         
         if (block.type === 'paragraph' || block.type === 'quote') {
             // Split text block by height chunks
             const text = (block as any).text;
             // Split by sentence to avoid mid-sentence break
             const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|\s+/g) || [text];
             
             let tempText = '';
             let tempH = 0;
             
             sentences.forEach((sentence: string) => {
                 const sH = estimateTextHeight(sentence);
                 if (tempH + sH > opts.heightLimit) {
                     if (tempText) {
                         currentBlocks.push({ ...block, id: generateId(), text: tempText.trim() } as AnyBlock);
                         flushPage();
                         tempText = '';
                         tempH = 0;
                     }
                 }
                 tempText += sentence;
                 tempH += sH;
             });
             
             if (tempText) {
                 currentBlocks.push({ ...block, id: generateId(), text: tempText.trim() } as AnyBlock);
                 currentHeight += tempH;
             }
         } else {
             // For list/others, just push to next page for now (simplification)
             currentBlocks.push(block);
             currentHeight += blockHeight;
         }
      } else {
         // Standard overflow: move to next page
         flushPage();
         currentBlocks.push(block);
         currentHeight += blockHeight;
      }
    } else {
      // Fits
      currentBlocks.push(block);
      currentHeight += blockHeight;
    }
  }

  flushPage();

  if (pages.length === 0) {
      pages.push({ id: generateId(), blocks: [] });
  }

  return pages;
};
