import { VisionAttributes } from '../../shared/types';

// Controlled vocabulary for categories
const CATEGORY_MAP: Record<string, string> = {
  // Shirts
  't-shirt': 'shirt',
  'tshirt': 'shirt',
  't shirt': 'shirt',
  'polo': 'shirt',
  'polo shirt': 'shirt',
  'button-down': 'shirt',
  'button down': 'shirt',
  'oxford': 'shirt',
  'dress shirt': 'shirt',
  
  // Tops
  'sweater': 'top',
  'sweatshirt': 'top',
  'hoodie': 'top',
  'cardigan': 'top',
  'blouse': 'top',
  
  // Outerwear
  'jacket': 'outerwear',
  'coat': 'outerwear',
  'blazer': 'outerwear',
  'parka': 'outerwear',
  'bomber': 'outerwear',
  'leather jacket': 'outerwear',
  
  // Dresses
  'dress': 'dress',
  'gown': 'dress',
  'cocktail dress': 'dress',
  'evening dress': 'dress',
  
  // Bottoms
  'pants': 'bottoms',
  'jeans': 'bottoms',
  'trousers': 'bottoms',
  'shorts': 'bottoms',
  'skirt': 'bottoms',
  'leggings': 'bottoms',
  
  // Footwear
  'sneakers': 'footwear',
  'shoes': 'footwear',
  'boots': 'footwear',
  'heels': 'footwear',
  'flats': 'footwear',
  'sandals': 'footwear',
  
  // Accessories
  'handbag': 'accessories',
  'purse': 'accessories',
  'wallet': 'accessories',
  'belt': 'accessories',
  'scarf': 'accessories',
  'hat': 'accessories',
  'sunglasses': 'accessories',
  
  // Fallback
  'clothing': 'top',
  'apparel': 'top',
  'garment': 'top'
};

// Base color mapping
const COLOR_MAP: Record<string, string> = {
  'white': 'white',
  'off-white': 'white',
  'cream': 'white',
  'ivory': 'white',
  'beige': 'beige',
  'tan': 'beige',
  'khaki': 'beige',
  'black': 'black',
  'charcoal': 'black',
  'gray': 'gray',
  'grey': 'gray',
  'silver': 'gray',
  'navy': 'navy',
  'dark blue': 'navy',
  'blue': 'blue',
  'light blue': 'blue',
  'red': 'red',
  'burgundy': 'red',
  'maroon': 'red',
  'green': 'green',
  'olive': 'green',
  'forest': 'green',
  'yellow': 'yellow',
  'gold': 'yellow',
  'pink': 'pink',
  'rose': 'pink',
  'purple': 'purple',
  'violet': 'purple',
  'orange': 'orange',
  'coral': 'orange',
  'brown': 'brown',
  'chocolate': 'brown',
  'camel': 'brown'
};

// Material mapping
const MATERIAL_MAP: Record<string, string> = {
  'cotton': 'cotton',
  'wool': 'wool',
  'leather': 'leather',
  'denim': 'denim',
  'silk': 'silk',
  'polyester': 'polyester',
  'linen': 'linen',
  'cashmere': 'cashmere',
  'suede': 'suede',
  'velvet': 'velvet',
  'satin': 'satin',
  'chiffon': 'chiffon',
  'tweed': 'tweed',
  'flannel': 'flannel',
  'jersey': 'jersey',
  'mesh': 'mesh',
  'nylon': 'nylon',
  'spandex': 'spandex',
  'elastane': 'spandex'
};

// Brand detection patterns
const BRAND_PATTERNS = [
  /burberry/i,
  /gucci/i,
  /prada/i,
  /louis\s+vuitton/i,
  /chanel/i,
  /hermes/i,
  /fendi/i,
  /balenciaga/i,
  /nike/i,
  /adidas/i,
  /puma/i,
  /reebok/i,
  /under\s+armour/i,
  /ralph\s+lauren/i,
  /tommy\s+hilfiger/i,
  /calvin\s+klein/i,
  /levi\s*'?s?/i,
  /gap/i,
  /h&m/i,
  /zara/i,
  /uniqlo/i,
  /asos/i
];

// Gender detection patterns
const GENDER_PATTERNS = {
  men: [/men'?s?/i, /mens/i, /male/i, /guy/i, /boy/i],
  women: [/women'?s?/i, /womens/i, /female/i, /lady/i, /girl/i],
  unisex: [/unisex/i, /gender.?neutral/i, /all.?gender/i]
};

export function normalizeVisionAttributes(
  labels: Array<{ description: string; score: number }>,
  webTags: string[],
  colors: Array<{ name: string; score: number }>
): VisionAttributes {
  const allText = [...webTags, ...labels.map(l => l.description)].join(' ').toLowerCase();
  
  // Category detection
  let category = 'top'; // fallback
  let subcategory: string | undefined;
  
  for (const [pattern, mapped] of Object.entries(CATEGORY_MAP)) {
    if (allText.includes(pattern)) {
      category = mapped;
      subcategory = pattern;
      break;
    }
  }
  
  // Color detection
  const detectedColors: string[] = [];
  const colorScores: Record<string, number> = {};
  
  // From Vision API colors
  colors.forEach(color => {
    const normalized = COLOR_MAP[color.name] || color.name;
    if (normalized && !detectedColors.includes(normalized)) {
      detectedColors.push(normalized);
      colorScores[normalized] = (colorScores[normalized] || 0) + color.score;
    }
  });
  
  // From text labels
  Object.entries(COLOR_MAP).forEach(([text, normalized]) => {
    if (allText.includes(text) && !detectedColors.includes(normalized)) {
      detectedColors.push(normalized);
      colorScores[normalized] = (colorScores[normalized] || 0) + 0.5;
    }
  });
  
  // Sort colors by score
  detectedColors.sort((a, b) => (colorScores[b] || 0) - (colorScores[a] || 0));
  
  // Material detection
  let material: string | undefined;
  for (const [pattern, mapped] of Object.entries(MATERIAL_MAP)) {
    if (allText.includes(pattern)) {
      material = mapped;
      break;
    }
  }
  
  // Pattern detection
  let pattern: string | undefined;
  const patternKeywords = ['solid', 'striped', 'plaid', 'checkered', 'floral', 'geometric', 'polka dot', 'animal print'];
  for (const keyword of patternKeywords) {
    if (allText.includes(keyword)) {
      pattern = keyword;
      break;
    }
  }
  
  // Brand hints
  const brandHints: string[] = [];
  BRAND_PATTERNS.forEach(regex => {
    const match = allText.match(regex);
    if (match) {
      const brand = match[0].toLowerCase().replace(/\s+/g, ' ');
      if (!brandHints.includes(brand)) {
        brandHints.push(brand);
      }
    }
  });
  
  // Gender detection
  let gender: "men" | "women" | "unisex" | null = null;
  for (const [g, patterns] of Object.entries(GENDER_PATTERNS)) {
    if (patterns.some(p => p.test(allText))) {
      gender = g as "men" | "women" | "unisex";
      break;
    }
  }
  
  // Confidence calculation
  let confidence = 0.5; // base confidence
  
  // Boost for clear category
  if (category !== 'top') confidence += 0.2;
  
  // Boost for colors
  if (detectedColors.length > 0) confidence += 0.15;
  
  // Boost for material
  if (material) confidence += 0.1;
  
  // Boost for brand hints
  if (brandHints.length > 0) confidence += 0.15;
  
  // Boost for gender
  if (gender) confidence += 0.1;
  
  // Cap at 1.0
  confidence = Math.min(confidence, 1.0);
  
  return {
    category,
    subcategory,
    colors: detectedColors,
    material,
    pattern,
    brandHints,
    gender,
    confidence
  };
}
