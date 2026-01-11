export type BlockType = 'heading' | 'paragraph' | 'quote' | 'image' | 'spacer' | 'list';

export interface Block {
  type: BlockType;
  id: string;
}

export interface HeadingBlock extends Block {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock extends Block {
  type: 'paragraph';
  text: string;
}

export interface QuoteBlock extends Block {
  type: 'quote';
  text: string;
}

export interface ImageBlock extends Block {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
}

export interface SpacerBlock extends Block {
  type: 'spacer';
  size: 'sm' | 'md' | 'lg';
}

export interface ListBlock extends Block {
  type: 'list';
  items: string[];
  ordered?: boolean;
}

export type AnyBlock = HeadingBlock | ParagraphBlock | QuoteBlock | ImageBlock | SpacerBlock | ListBlock;

export interface Page {
  id: string;
  blocks: AnyBlock[];
}
