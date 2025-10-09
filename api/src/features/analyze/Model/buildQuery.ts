import { VisionAttributes } from '../../../shared/types';

const BRAND_SEARCH_OPTIMIZATIONS: Record<string, string[]> = {
  burberry: ['burberry', 'london', 'heritage', 'check'],
  gucci: ['gucci', 'italy', 'luxury'],
  prada: ['prada', 'milano', 'luxury'],
  'louis vuitton': ['louis vuitton', 'lv', 'paris', 'luxury'],
  chanel: ['chanel', 'paris', 'luxury'],
  hermes: ['hermes', 'paris', 'luxury'],
  fendi: ['fendi', 'roma', 'luxury'],
  balenciaga: ['balenciaga', 'paris', 'luxury'],
  nike: ['nike', 'swoosh', 'athletic'],
  adidas: ['adidas', 'three stripes', 'athletic'],
  'ralph lauren': ['ralph lauren', 'polo', 'american'],
  'tommy hilfiger': ['tommy hilfiger', 'preppy', 'american'],
  'calvin klein': ['calvin klein', 'ck', 'minimalist'],
  'levi\'s': ['levi\'s', 'levis', 'denim', 'jeans']
};

const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  shirt: ['shirt', 't-shirt', 'tshirt', 'polo', 'button-down'],
  top: ['top', 'sweater', 'hoodie', 'sweatshirt', 'cardigan'],
  outerwear: ['jacket', 'coat', 'blazer', 'outerwear'],
  dress: ['dress', 'gown', 'cocktail dress'],
  bottoms: ['pants', 'jeans', 'trousers', 'shorts', 'skirt'],
  footwear: ['shoes', 'sneakers', 'boots', 'footwear'],
  accessories: ['bag', 'handbag', 'purse', 'wallet', 'accessories']
};

const COLOR_SEARCH_VARIATIONS: Record<string, string[]> = {
  white: ['white', 'ivory', 'cream', 'off-white'],
  black: ['black', 'charcoal', 'onyx'],
  gray: ['gray', 'grey', 'silver', 'charcoal'],
  navy: ['navy', 'dark blue', 'marine'],
  blue: ['blue', 'azure', 'cobalt'],
  red: ['red', 'burgundy', 'maroon', 'crimson'],
  green: ['green', 'emerald', 'forest', 'olive'],
  yellow: ['yellow', 'gold', 'amber'],
  pink: ['pink', 'rose', 'blush'],
  purple: ['purple', 'violet', 'plum'],
  orange: ['orange', 'coral', 'peach'],
  brown: ['brown', 'chocolate', 'camel', 'tan'],
  beige: ['beige', 'tan', 'khaki', 'cream']
};

const MATERIAL_SEARCH_VARIATIONS: Record<string, string[]> = {
  cotton: ['cotton', 'cotton blend'],
  wool: ['wool', 'wool blend', 'merino'],
  leather: ['leather', 'genuine leather', 'faux leather'],
  denim: ['denim', 'jeans material'],
  silk: ['silk', 'silk blend'],
  polyester: ['polyester', 'poly blend'],
  linen: ['linen', 'linen blend'],
  cashmere: ['cashmere', 'cashmere blend'],
  suede: ['suede', 'suede leather'],
  velvet: ['velvet', 'velvet fabric'],
  satin: ['satin', 'satin fabric'],
  chiffon: ['chiffon', 'chiffon fabric']
};

export interface SearchQuery {
  primary: string;
  variations: string[];
  filters: Record<string, string[]>;
}

export function buildSearchQuery(attributes: VisionAttributes): SearchQuery {
  const { category, colors, material, brandHints, gender, pattern } = attributes;
  const queryParts: string[] = [];
  const variations: string[] = [];
  const filters: Record<string, string[]> = {};
  if (brandHints.length > 0) {
    const primaryBrand = brandHints[0];
    queryParts.push(primaryBrand);
    const brandOpts = BRAND_SEARCH_OPTIMIZATIONS[primaryBrand.toLowerCase()];
    if (brandOpts) variations.push(...brandOpts);
    filters.brand = [primaryBrand];
  }
  queryParts.push(category);
  const categoryOpts = CATEGORY_SEARCH_TERMS[category];
  if (categoryOpts) variations.push(...categoryOpts);
  filters.category = [category];
  if (colors.length > 0) {
    const primaryColor = colors[0];
    queryParts.push(primaryColor);
    const colorOpts = COLOR_SEARCH_VARIATIONS[primaryColor];
    if (colorOpts) variations.push(...colorOpts);
    filters.color = colors;
  }
  if (material) {
    queryParts.push(material);
    const materialOpts = MATERIAL_SEARCH_VARIATIONS[material];
    if (materialOpts) variations.push(...materialOpts);
    filters.material = [material];
  }
  if (gender) {
    queryParts.push(gender);
    filters.gender = [gender];
  }
  if (pattern) {
    queryParts.push(pattern);
    filters.pattern = [pattern];
  }
  const primary = queryParts.join(' ').toLowerCase();
  if (brandHints.length > 0) {
    variations.push(`${brandHints[0]} ${category}`);
    if (colors.length > 0) variations.push(`${brandHints[0]} ${colors[0]}`);
  }
  if (colors.length > 0) variations.push(`${category} ${colors[0]}`);
  if (material) variations.push(`${material} ${category}`);
  return { primary, variations: [...new Set(variations)], filters };
}

export function buildSourceSpecificQuery(attributes: VisionAttributes, source: string): string {
  const baseQuery = buildSearchQuery(attributes);
  switch (source.toLowerCase()) {
    case 'ebay':
      return baseQuery.primary;
    case 'google':
      if (attributes.material) return `${baseQuery.primary} ${attributes.material}`;
      return baseQuery.primary;
    case 'serpapi':
      if (attributes.brandHints.length > 0) return `${attributes.brandHints[0]} ${attributes.category}`;
      return baseQuery.primary;
    default:
      return baseQuery.primary;
  }
}


