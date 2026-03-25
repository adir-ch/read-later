export type WindowMode = 'tray' | 'desktop';

export type ArticleStatus = 'pending' | 'done' | 'error';

export interface Article {
  id: number;
  url: string;
  title: string | null;
  summary: string | null;
  favicon: string | null;
  /** First hero/story image URL from the page HTML (og:image or first <img>), if any */
  cover_image: string | null;
  created_at: string;
  status: ArticleStatus;
  tags: string[];
}

export interface SaveUrlResult {
  id: number;
  status: 'pending';
}

export interface ApiError {
  error: string;
}

export type SaveUrlResponse = SaveUrlResult | ApiError;

// Tag boolean search AST
export type TagExpr =
  | { type: 'tag';  value: string }
  | { type: 'and';  left: TagExpr; right: TagExpr }
  | { type: 'or';   left: TagExpr; right: TagExpr }
  | { type: 'not';  operand: TagExpr };
