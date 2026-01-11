import { AnyBlock } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseDescriptionToBlocks = (content: string): AnyBlock[] => {
  if (!content) return [];
  
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

    // Empty line -> potential spacer or break
    if (!trimmed) {
      flushList();
      // Only add spacer if there's a significant gap (e.g., double newline)
      if (i + 1 < lines.length && !lines[i+1].trim()) {
         blocks.push({ type: 'spacer', id: generateId(), size: 'lg' });
         i++; 
      }
      i++;
      continue;
    }

    // Headings
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
    // Quotes
    else if (trimmed.startsWith('> ')) {
      flushList();
      let quoteText = trimmed.substring(2);
      while (i + 1 < lines.length && lines[i+1].trim().startsWith('> ')) {
          i++;
          quoteText += '\n' + lines[i].trim().substring(2);
      }
      blocks.push({ type: 'quote', id: generateId(), text: quoteText });
    }
    // Images: ![alt](src)
    else if (trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)) {
      flushList();
      const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        blocks.push({ type: 'image', id: generateId(), alt: match[1], src: match[2] });
      }
    }
    // Lists
    else if (trimmed.match(/^[-*]\s/)) {
      if (!isOrderedList && currentListItems.length > 0) { } else { flushList(); isOrderedList = false; }
      currentListItems.push(trimmed.substring(2));
    }
    else if (trimmed.match(/^\d+\.\s/)) {
      if (isOrderedList && currentListItems.length > 0) { } else { flushList(); isOrderedList = true; }
      currentListItems.push(trimmed.replace(/^\d+\.\s/, ''));
    }
    // Paragraphs (default)
    else {
      flushList();
      let pText = trimmed;
      // Consume subsequent lines as part of the same paragraph until a block starter is found
      while (i + 1 < lines.length) {
          const nextLine = lines[i+1].trim();
          if (!nextLine || 
              nextLine.startsWith('#') || 
              nextLine.startsWith('>') || 
              nextLine.match(/^!\[/) || 
              nextLine.match(/^[-*]\s/) || 
              nextLine.match(/^\d+\.\s/)) {
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
  
  // Fallback if empty
  if (blocks.length === 0) {
      blocks.push({ type: 'paragraph', id: generateId(), text: 'No content.' });
  }
  
  return blocks;
};
