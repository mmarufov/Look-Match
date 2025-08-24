export interface VisionAttributes {
  category: string;
  subcategory?: string;
  colors: string[];
  material?: string;
  pattern?: string;
  brandHints: string[];
  gender?: "men" | "women" | "unisex" | null;
  confidence: number;
}

export interface ProductDescription {
  description: string;
  query: string;
}

export interface SourceResult {
  id: string;
  title: string;
  url: string;
  price?: { amount: number; currency: string };
  merchant: string;
  thumbnail?: string;
  attributes?: Record<string, any>;
  score: number;
  verified: boolean;
}

export interface SearchOptions {
  limit: number;
  timeoutMs: number;
}

export interface Source {
  name: string;
  search(q: string, opts: SearchOptions): Promise<SourceResult[]>;
}

export interface ValidationResult {
  verified: boolean;
  reason?: string;
  finalUrl?: string;
}

export interface SearchResponse {
  results: SourceResult[];
  total: number;
  verifiedCount: number;
}

export interface AnalyzeResponse {
  ok: boolean;
  attributes: VisionAttributes;
  description: string;
  query: string;
  error?: string;
  color?: {
    base: string;
    hex: string;
    label: string;
    confidence: number;
  };
  category?: string;
  sleeveLength?: 'short' | 'long' | 'unknown';
  hasCollar?: boolean;
  pattern?: 'solid' | 'striped' | 'checked' | 'printed' | 'unknown';
  confidences?: {
    category?: number;
    sleeveLength?: number;
    hasCollar?: number;
    pattern?: number;
  };
  debug?: { maskId?: string };
}

export interface MatchesResponse {
  ok: boolean;
  results: SourceResult[];
  total: number;
  verifiedCount: number;
  error?: string;
}
