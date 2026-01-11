import { Page, AnyBlock } from '../types';

// Simple unique ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseDescriptionToPages = (description: string, titleImageUrl?: string): Page[] => {
  if (!description) {
      if (titleImageUrl) {
          return [{
              id: generateId(),
              blocks: [{ type: 'image', id: generateId(), src: titleImageUrl, alt: 'Title Image' }]
          }];
      }
      return [{ id: generateId(), blocks: [{ type: 'paragraph', id: generateId(), text: 'No content available.' }] }];
  }

  // 1. Initial split by explicit delimiters "---"
  const rawSegments = description.split(/(?:\n|^)\s*---\s*(?:\n|$)/);
  
  // 2. Further split long segments into pages by word count
  // Target: approx 400 words (or Chinese characters) per page
  const MAX_CHARS_PER_PAGE = 400;
  
  let finalPages: Page[] = [];

  rawSegments.forEach((segment, segmentIndex) => {
      // Parse the segment into blocks first
      const segmentBlocks = parseSegmentToBlocks(segment);
      
      // If segment is small enough, keep as one page
      // We estimate length by summing text content of blocks
      const segmentLength = segmentBlocks.reduce((acc, block) => {
          if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote') {
              return acc + (block as any).text.length;
          }
          if (block.type === 'list') {
              return acc + (block as any).items.join('').length;
          }
          return acc + 50; // visual weight for images/spacers
      }, 0);

      if (segmentLength <= MAX_CHARS_PER_PAGE * 1.5) { // Allow some buffer before forcing split
          finalPages.push({ id: generateId(), blocks: segmentBlocks });
      } else {
          // Split blocks into multiple pages
          let currentPageBlocks: AnyBlock[] = [];
          let currentLength = 0;

          segmentBlocks.forEach(block => {
              const blockLength = getBlockLength(block);
              
              // If adding this block exceeds limit significantly, push page and start new
              if (currentLength + blockLength > MAX_CHARS_PER_PAGE && currentPageBlocks.length > 0) {
                  finalPages.push({ id: generateId(), blocks: currentPageBlocks });
                  currentPageBlocks = [];
                  currentLength = 0;
              }
              
              currentPageBlocks.push(block);
              currentLength += blockLength;
          });
          
          if (currentPageBlocks.length > 0) {
              finalPages.push({ id: generateId(), blocks: currentPageBlocks });
          }
      }
  });

  // 3. Inject Title Image into the FIRST page of the final set
  if (titleImageUrl && finalPages.length > 0) {
      finalPages[0].blocks.unshift(
          { type: 'spacer', id: generateId(), size: 'md' }, // Spacer after image
      );
      finalPages[0].blocks.unshift(
          { type: 'image', id: generateId(), src: titleImageUrl, alt: 'Title Image', caption: '' }
      );
  } else if (titleImageUrl && finalPages.length === 0) {
       finalPages.push({
          id: generateId(),
          blocks: [{ type: 'image', id: generateId(), src: titleImageUrl, alt: 'Title Image' }]
       });
  }

  return finalPages;
};

// Helper to estimate visual length
const getBlockLength = (block: AnyBlock): number => {
    if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote') {
        return (block as any).text.length;
    }
    if (block.type === 'list') {
        return (block as any).items.join('').length;
    }
    return 100; // Images/Spacers count as ~100 chars of height
};

const parseSegmentToBlocks = (content: string): AnyBlock[] => {
    const lines = content.split('\n');
    const blocks: AnyBlock[] = [];
    
    let currentListItems: string[] = [];
    let isOrderedList = false;

    const flushList = () => {
      if (currentListItems.length > 0) {
        blocks.push({
          type: 'list',
          id: generateId(),
          items: [...currentListItems],
          ordered: isOrderedList
        });
        currentListItems = [];
      }
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushList();
        if (i + 1 < lines.length && !lines[i+1].trim()) {
           blocks.push({ type: 'spacer', id: generateId(), size: 'lg' }); // Use large spacer for gaps
           i++; 
        }
        i++;
        continue;
      }

      if (trimmed.startsWith('# ')) {
        flushList();
        blocks.push({ type: 'heading', id: generateId(), level: 1, text: trimmed.substring(2) });
      } else if (trimmed.startsWith('## ')) {
        flushList();
        blocks.push({ type: 'heading', id: generateId(), level: 2, text: trimmed.substring(3) });
      } else if (trimmed.startsWith('### ')) {
        flushList();
        blocks.push({ type: 'heading', id: generateId(), level: 3, text: trimmed.substring(4) });
      }
      else if (trimmed.startsWith('> ')) {
        flushList();
        let quoteText = trimmed.substring(2);
        while (i + 1 < lines.length && lines[i+1].trim().startsWith('> ')) {
            i++;
            quoteText += '\n' + lines[i].trim().substring(2);
        }
        blocks.push({ type: 'quote', id: generateId(), text: quoteText });
      }
      else if (trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)) {
        flushList();
        const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (match) {
          blocks.push({ type: 'image', id: generateId(), alt: match[1], src: match[2] });
        }
      }
      else if (trimmed.match(/^[-*]\s/)) {
        if (!isOrderedList && currentListItems.length > 0) { } else { flushList(); isOrderedList = false; }
        currentListItems.push(trimmed.substring(2));
      }
      else if (trimmed.match(/^\d+\.\s/)) {
        if (isOrderedList && currentListItems.length > 0) { } else { flushList(); isOrderedList = true; }
        currentListItems.push(trimmed.replace(/^\d+\.\s/, ''));
      }
      else {
        flushList();
        let pText = trimmed;
        while (i + 1 < lines.length) {
            const nextLine = lines[i+1].trim();
            if (!nextLine || nextLine.startsWith('#') || nextLine.startsWith('>') || 
                nextLine.match(/^!\[/) || nextLine.match(/^[-*]\s/) || nextLine.match(/^\d+\.\s/)) {
                break;
            }
            pText += ' ' + nextLine;
            i++;
        }
        blocks.push({ type: 'paragraph', id: generateId(), text: pText });
      }
      i++;
    }
    flushList();
    return blocks;
};
