export interface StyleResult {
  category: string;
  sleeveLength: 'short' | 'long' | 'unknown';
  hasCollar: boolean;
  pattern: 'solid' | 'striped' | 'checked' | 'printed' | 'unknown';
  confidences: { category: number; sleeveLength: number; hasCollar: number; pattern: number };
}

export function inferStyleFallback(labels: Array<{ description: string; score: number }>, mask: Uint8Array): StyleResult {
  const text = labels.map(l => l.description.toLowerCase()).join(' ');
  let category = 'shirt';
  if (text.includes('t-shirt') || text.includes('tshirt') || text.includes('tee')) category = 't-shirt';
  if (text.includes('hoodie') || text.includes('sweatshirt')) category = 'hoodie';
  const sleeveLength: 'short' | 'long' | 'unknown' = text.includes('long sleeve') ? 'long' : (text.includes('short sleeve') ? 'short' : 'unknown');
  const hasCollar = /collar|button-down|polo/.test(text);
  const pattern: 'solid' | 'striped' | 'checked' | 'printed' | 'unknown' =
    text.includes('striped') ? 'striped' : text.includes('check') ? 'checked' : text.includes('print') ? 'printed' : 'solid';
  return { category, sleeveLength, hasCollar, pattern, confidences: { category: 0.7, sleeveLength: 0.5, hasCollar: hasCollar ? 0.7 : 0.4, pattern: 0.6 } };
}


