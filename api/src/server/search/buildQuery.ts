import { VisionAttributes } from '../../shared/types';

// Brand-specific search optimizations
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

// Category-specific search terms
const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  shirt: ['shirt', 't-shirt', 'tshirt', 'polo', 'button-down'],
  top: ['top', 'sweater', 'hoodie', 'sweatshirt', 'cardigan'],
  outerwear: ['jacket', 'coat', 'blazer', 'outerwear'],
  dress: ['dress', 'gown', 'cocktail dress'],
  bottoms: ['pants', 'jeans', 'trousers', 'shorts', 'skirt'],
  footwear: ['shoes', 'sneakers', 'boots', 'footwear'],
  accessories: ['bag', 'handbag', 'purse', 'wallet', 'accessories']
};

// Color search variations
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

// Material search variations
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
  
  // Add brand hints (highest priority)
  if (brandHints.length > 0) {
    const primaryBrand = brandHints[0];
    queryParts.push(primaryBrand);
    
    // Add brand variations
    const brandOpts = BRAND_SEARCH_OPTIMIZATIONS[primaryBrand.toLowerCase()];
    if (brandOpts) {
      variations.push(...brandOpts);
    }
    
    filters.brand = [primaryBrand];
  }
  
  // Add category
  queryParts.push(category);
  
  // Add category variations
  const categoryOpts = CATEGORY_SEARCH_TERMS[category];
  if (categoryOpts) {
    variations.push(...categoryOpts);
  }
  
  filters.category = [category];
  
  // Add primary color
  if (colors.length > 0) {
    const primaryColor = colors[0];
    queryParts.push(primaryColor);
    
    // Add color variations
    const colorOpts = COLOR_SEARCH_VARIATIONS[primaryColor];
    if (colorOpts) {
      variations.push(...colorOpts);
    }
    
    filters.color = colors;
  }
  
  // Add material
  if (material) {
    queryParts.push(material);
    
    // Add material variations
    const materialOpts = MATERIAL_SEARCH_VARIATIONS[material];
    if (materialOpts) {
      variations.push(...materialOpts);
    }
    
    filters.material = [material];
  }
  
  // Add gender
  if (gender) {
    queryParts.push(gender);
    filters.gender = [gender];
  }
  
  // Add pattern
  if (pattern) {
    queryParts.push(pattern);
    filters.pattern = [pattern];
  }
  
  // Build primary query
  const primary = queryParts.join(' ').toLowerCase();
  
  // Add additional variations for better search coverage
  if (brandHints.length > 0) {
    // Add brand + category combinations
    variations.push(`${brandHints[0]} ${category}`);
    
    // Add brand + color combinations
    if (colors.length > 0) {
      variations.push(`${brandHints[0]} ${colors[0]}`);
    }
  }
  
  // Add category + color combinations
  if (colors.length > 0) {
    variations.push(`${category} ${colors[0]}`);
  }
  
  // Add material + category combinations
  if (material) {
    variations.push(`${material} ${category}`);
  }
  
  return {
    primary,
    variations: [...new Set(variations)], // Remove duplicates
    filters
  };
}

// Build query for specific source (e.g., eBay, Google Shopping)
export function buildSourceSpecificQuery(
  attributes: VisionAttributes, 
  source: string
): string {
  const baseQuery = buildSearchQuery(attributes);
  
  // Source-specific optimizations
  switch (source.toLowerCase()) {
    case 'ebay':
      // eBay works well with brand + category + color
      return baseQuery.primary;
      
    case 'google':
      // Google Shopping likes more descriptive queries
      if (attributes.material) {
        return `${baseQuery.primary} ${attributes.material}`;
      }
      return baseQuery.primary;
      
    case 'serpapi':
      // SerpAPI works well with brand + category
      if (attributes.brandHints.length > 0) {
        return `${attributes.brandHints[0]} ${attributes.category}`;
      }
      return baseQuery.primary;
      
    default:
      return baseQuery.primary;
  }
}
