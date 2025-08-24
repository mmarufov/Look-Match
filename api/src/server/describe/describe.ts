import { VisionAttributes, ProductDescription } from '../../shared/types';

// Style notes for different categories
const STYLE_NOTES: Record<string, string> = {
  shirt: 'Perfect for both casual and formal occasions. Versatile styling options.',
  top: 'Comfortable and stylish for everyday wear. Easy to layer and accessorize.',
  outerwear: 'Essential piece for transitional weather. Adds sophistication to any outfit.',
  dress: 'Elegant and versatile. Can be dressed up or down depending on the occasion.',
  bottoms: 'Foundation piece that pairs well with various tops. Timeless and practical.',
  footwear: 'Comfortable and stylish. Suitable for both casual and dressy occasions.',
  accessories: 'Adds the perfect finishing touch to any outfit. Versatile and timeless.'
};

// Brand-specific style notes
const BRAND_STYLE_NOTES: Record<string, string> = {
  burberry: 'Heritage check pattern and timeless British elegance.',
  gucci: 'Luxury Italian craftsmanship with contemporary sophistication.',
  prada: 'Minimalist luxury with innovative design and premium materials.',
  'louis vuitton': 'Iconic monogram and exceptional French luxury.',
  chanel: 'Timeless elegance and sophisticated French style.',
  hermes: 'Exceptional craftsmanship and understated luxury.',
  fendi: 'Italian luxury with bold design and premium quality.',
  balenciaga: 'Avant-garde fashion with innovative silhouettes.',
  nike: 'Innovative athletic performance with iconic swoosh design.',
  adidas: 'Sporty style with the classic three-stripe design.',
  'ralph lauren': 'American classic style with polo pony elegance.',
  'tommy hilfiger': 'Preppy American style with nautical influences.',
  'calvin klein': 'Minimalist American design with clean lines.',
  'levi\'s': 'Iconic denim heritage with timeless style.'
};


// Human-readable color lists
function humanColorList(colors: string[]): string {
  if (colors.length === 0) return 'a classic color';
  if (colors.length === 1) return colors[0];
  if (colors.length === 2) return `${colors[0]} and ${colors[1]}`;
  if (colors.length === 3) return `${colors[0]}, ${colors[1]}, and ${colors[2]}`;
  return `${colors.slice(0, -1).join(', ')}, and ${colors[colors.length - 1]}`;
}

// Title case helper
function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// Get style note for category
function getStyleNote(category: string): string {
  return STYLE_NOTES[category] || STYLE_NOTES.top;
}

// Get brand style note
function getBrandStyleNote(brandHints: string[]): string | undefined {
  if (brandHints.length === 0) return undefined;
  
  const primaryBrand = brandHints[0].toLowerCase();
  return BRAND_STYLE_NOTES[primaryBrand];
}

export function generateProductDescription(attributes: VisionAttributes): ProductDescription {
  const { category, colors, material, brandHints, pattern, gender } = attributes;
  
  // Build the main description
  let description = `${titleCase(category)}`;
  
  // Add color information
  if (colors.length > 0) {
    description += ` in ${humanColorList(colors)}`;
  }
  
  // Add material information
  if (material) {
    description += `, ${material}`;
  }
  
  // Add pattern information
  if (pattern) {
    description += `, ${pattern}`;
  }
  
  // Add brand inspiration
  if (brandHints.length > 0) {
    const brandStyleNote = getBrandStyleNote(brandHints);
    if (brandStyleNote) {
      description += ` — ${brandStyleNote}`;
    } else {
      description += ` — inspired by ${titleCase(brandHints[0])}`;
    }
  }
  
  // Add gender context
  if (gender) {
    description += `. ${titleCase(gender)}'s style.`;
  } else {
    description += '.';
  }
  
  // Add style notes
  description += ` ${getStyleNote(category)}`;
  
  // Build search query
  const queryParts: string[] = [];
  
  // Add brand if available
  if (brandHints.length > 0) {
    queryParts.push(brandHints[0]);
  }
  
  // Add category
  queryParts.push(category);
  
  // Add primary color
  if (colors.length > 0) {
    queryParts.push(colors[0]);
  }
  
  // Add material if available
  if (material) {
    queryParts.push(material);
  }
  
  // Add gender if available
  if (gender) {
    queryParts.push(gender);
  }
  
  const query = queryParts.join(' ').toLowerCase();
  
  return {
    description,
    query
  };
}
