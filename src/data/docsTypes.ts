export type DocCategoryId =
  | 'getting-started'
  | 'rpg-rules'
  | 'characters'
  | 'base-economy'
  | 'world-atlas'
  | 'organization-ai';

export type DocBadgeKind = 'essential' | 'mechanics' | 'reference' | 'pro-tip';

export type DocIconName =
  | 'rocket'
  | 'dices'
  | 'users'
  | 'shield'
  | 'globe'
  | 'crown';

export type DocBlock =
  | {
      type: 'heading';
      id: string;
      level: 2 | 3;
      text: string;
    }
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'callout';
      tone: 'tip' | 'info' | 'warning' | 'example';
      title: string;
      body: string;
    }
  | {
      type: 'table';
      caption?: string;
      headers: string[];
      rows: string[][];
    }
  | {
      type: 'steps';
      items: Array<{
        title: string;
        detail: string;
      }>;
    }
  | {
      type: 'promptExample';
      mode: 'act' | 'say' | 'direct';
      label: string;
      prompt: string;
      explanation: string;
    }
  | {
      type: 'cardGrid';
      columns?: 2 | 3;
      cards: Array<{
        title: string;
        subtitle?: string;
        body: string;
        accent?: string;
      }>;
    }
  | {
      type: 'bulletList';
      items: Array<{
        lead?: string;
        text: string;
      }>;
    };

export interface DocCategory {
  id: DocCategoryId;
  title: string;
  description: string;
  icon: DocIconName;
}

export interface DocArticle {
  id: string;
  categoryId: DocCategoryId;
  title: string;
  shortTitle: string;
  summary: string;
  readMinutes: number;
  badge: DocBadgeKind;
  updatedVersion: string;
  keywords: string[];
  futureTourId?: string;
  blocks: DocBlock[];
}

export interface DocSearchHit {
  article: DocArticle;
  category: DocCategory;
  snippet: string;
  score: number;
}
