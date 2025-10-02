// Comprehensive extraction patterns for mining news
import { extractCompanyWithConfidence, extractProjectsWithConfidence } from './mining-entities';

// Mining company symbols mapping
export const COMPANY_SYMBOLS: Record<string, string> = {
  // Major Mining Companies
  'bhp': 'BHP', 'bhp group': 'BHP', 'bhp billiton': 'BHP',
  'rio tinto': 'RIO', 'rio': 'RIO',
  'vale': 'VALE', 'vale sa': 'VALE',
  'glencore': 'GLEN', 'glen': 'GLEN',
  'anglo american': 'AAL', 'anglo': 'AAL',
  'freeport': 'FCX', 'freeport-mcmoran': 'FCX',
  'newmont': 'NEM', 'newmont corporation': 'NEM',
  'barrick': 'GOLD', 'barrick gold': 'GOLD',
  'newcrest': 'NCM', 'newcrest mining': 'NCM',
  'fortescue': 'FMG', 'fortescue metals': 'FMG',
  
  // Lithium Companies
  'albemarle': 'ALB', 'alb': 'ALB',
  'sqm': 'SQM', 'sociedad quimica': 'SQM',
  'lithium americas': 'LAC', 'lac': 'LAC',
  'piedmont lithium': 'PLL', 'pll': 'PLL',
  'sigma lithium': 'SGML', 'sgml': 'SGML',
  'pilbara': 'PLS', 'pilbara minerals': 'PLS',
  'allkem': 'AKE', 'ake': 'AKE',
  'liontown': 'LTR', 'liontown resources': 'LTR',
  
  // Gold Companies
  'kinross': 'KGC', 'kinross gold': 'KGC',
  'agnico eagle': 'AEM', 'aem': 'AEM',
  'gold fields': 'GFI', 'gfi': 'GFI',
  'harmony': 'HMY', 'harmony gold': 'HMY',
  'iamgold': 'IAG', 'iag': 'IAG',
  'yamana': 'AUY', 'yamana gold': 'AUY',
  'eldorado': 'EGO', 'eldorado gold': 'EGO',
  
  // Copper Companies
  'southern copper': 'SCCO', 'scco': 'SCCO',
  'first quantum': 'FM', 'first quantum minerals': 'FM',
  'antofagasta': 'ANTO', 'anto': 'ANTO',
  'hudbay': 'HBM', 'hudbay minerals': 'HBM',
  'ero copper': 'ERO', 'ero': 'ERO',
  'taseko': 'TGB', 'taseko mines': 'TGB',
  
  // Silver Companies
  'pan american': 'PAAS', 'pan american silver': 'PAAS',
  'first majestic': 'AG', 'first majestic silver': 'AG',
  'hecla': 'HL', 'hecla mining': 'HL',
  'coeur': 'CDE', 'coeur mining': 'CDE',
  
  // Rare Earth & Specialty
  'mp materials': 'MP', 'mp': 'MP',
  'lynas': 'LYC', 'lynas rare earths': 'LYC',
  'energy fuels': 'UUUU', 'uuuu': 'UUUU',
  'cameco': 'CCJ', 'ccj': 'CCJ',
  'denison': 'DNN', 'denison mines': 'DNN',
  'nexgen': 'NXE', 'nexgen energy': 'NXE',
  
  // Other Major Players
  'teck': 'TECK', 'teck resources': 'TECK',
  'alcoa': 'AA', 'aa': 'AA',
  'norsk hydro': 'NHY', 'nhy': 'NHY',
  'south32': 'S32', 's32': 'S32',
  'boliden': 'BOL', 'bol': 'BOL',
  'lundin': 'LUN', 'lundin mining': 'LUN',
  
  // Investment Banks & Analysts
  'goldman': 'GS', 'goldman sachs': 'GS',
  'jpmorgan': 'JPM', 'jp morgan': 'JPM',
  'morgan stanley': 'MS', 'ms': 'MS',
  'bank of america': 'BAC', 'bofa': 'BAC', 'bac': 'BAC',
  'citi': 'C', 'citigroup': 'C',
  'ubs': 'UBS',
  'credit suisse': 'CS', 'cs': 'CS',
  'deutsche bank': 'DB', 'db': 'DB'
};

// Comprehensive commodity list
export const COMMODITIES = [
  // Base Metals
  'copper', 'aluminum', 'aluminium', 'zinc', 'lead', 'nickel', 'tin', 'brass', 'bronze',
  
  // Precious Metals
  'gold', 'silver', 'platinum', 'palladium', 'rhodium', 'iridium', 'osmium', 'ruthenium',
  
  // Battery Metals & Materials
  'lithium', 'cobalt', 'graphite', 'manganese', 'vanadium', 'silicon', 'lithium carbonate',
  'lithium hydroxide', 'spodumene', 'petalite', 'lepidolite',
  
  // Steel & Iron
  'iron ore', 'iron', 'steel', 'stainless steel', 'pig iron', 'magnetite', 'hematite',
  'taconite', 'pellets', 'sinter', 'direct reduced iron', 'dri',
  
  // Coal & Carbon
  'coal', 'coking coal', 'thermal coal', 'met coal', 'metallurgical coal', 'anthracite',
  'bituminous', 'lignite', 'coke', 'carbon', 'activated carbon',
  
  // Rare Earth Elements
  'rare earth', 'rare earths', 'ree', 'neodymium', 'dysprosium', 'praseodymium',
  'terbium', 'europium', 'yttrium', 'lanthanum', 'cerium', 'samarium', 'gadolinium',
  'holmium', 'erbium', 'thulium', 'ytterbium', 'lutetium', 'scandium',
  
  // Energy Minerals
  'uranium', 'thorium', 'helium', 'hydrogen', 'natural gas', 'lng', 'oil', 'petroleum',
  'crude oil', 'oil sands', 'tar sands', 'shale oil', 'shale gas',
  
  // Industrial Minerals
  'potash', 'phosphate', 'bauxite', 'titanium', 'tungsten', 'molybdenum', 'chromium',
  'antimony', 'bismuth', 'cadmium', 'indium', 'magnesium', 'mercury', 'selenium',
  'tellurium', 'gallium', 'germanium', 'hafnium', 'rhenium', 'zirconium', 'arsenic',
  
  // Construction & Industrial
  'limestone', 'gypsum', 'cement', 'sand', 'gravel', 'aggregate', 'crushed stone',
  'dimension stone', 'marble', 'granite', 'slate', 'quartzite', 'sandstone',
  
  // Fertilizer Minerals
  'nitrogen', 'ammonia', 'urea', 'phosphorus', 'potassium', 'sulfur', 'sulphur',
  
  // Specialty Metals
  'tantalum', 'niobium', 'beryllium', 'cesium', 'rubidium', 'strontium', 'barium',
  
  // Gemstones
  'diamonds', 'emerald', 'ruby', 'sapphire', 'opal', 'jade', 'turquoise', 'amethyst',
  
  // Other Industrial
  'salt', 'soda ash', 'boron', 'borate', 'fluorite', 'fluorspar', 'mica', 'talc',
  'kaolin', 'clay', 'bentonite', 'diatomite', 'perlite', 'vermiculite', 'zeolite',
  'feldspar', 'silica', 'quartz', 'asbestos', 'baryte', 'barite',
  
  // Alloys & Compounds
  'ferroalloys', 'ferrochrome', 'ferromanganese', 'ferrosilicon', 'silicomanganese',
  'ferrovanadium', 'ferrotitanium', 'ferronickel', 'ferromolybdenum'
];

// Mining-related tags/topics
export const MINING_TAGS = [
  // Operations
  'mining', 'exploration', 'drilling', 'production', 'processing',
  'extraction', 'development', 'construction', 'commissioning', 'expansion',
  
  // Technical
  'feasibility study', 'pea', 'preliminary economic assessment', 'dfs',
  'definitive feasibility study', 'resource estimate', 'reserve estimate',
  'ni 43-101', 'jorc', 'technical report', 'metallurgy', 'recovery rate',
  
  // Financial
  'acquisition', 'merger', 'takeover', 'investment', 'financing',
  'ipo', 'earnings', 'revenue', 'profit', 'loss', 'capex', 'opex',
  'cash flow', 'dividend', 'royalty', 'streaming', 'offtake',
  
  // Environmental & Regulatory
  'environmental', 'permit', 'license', 'approval', 'regulatory',
  'sustainability', 'esg', 'carbon', 'emissions', 'water', 'tailings',
  'reclamation', 'closure', 'rehabilitation',
  
  // Market
  'price', 'forecast', 'demand', 'supply', 'shortage', 'surplus',
  'commodity', 'market', 'trading', 'futures', 'spot', 'premium',
  
  // Geographic
  'africa', 'americas', 'asia', 'australia', 'europe', 'canada',
  'usa', 'united states', 'china', 'chile', 'peru', 'brazil',
  'mexico', 'argentina', 'congo', 'drc', 'south africa', 'russia',
  'kazakhstan', 'mongolia', 'indonesia', 'philippines', 'png',
  
  // Project Types
  'greenfield', 'brownfield', 'underground', 'open pit', 'heap leach',
  'in-situ', 'placer', 'alluvial', 'hard rock', 'brine', 'sedimentary',
  
  // Industry Terms
  'grade', 'ore', 'concentrate', 'smelter', 'refinery', 'beneficiation',
  'flotation', 'leaching', 'solvent extraction', 'electrowinning',
  'ball mill', 'sag mill', 'crusher', 'conveyor', 'stockpile'
];

/**
 * Extract symbol from text using company name matching
 */
export function extractSymbol(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [key, symbol] of Object.entries(COMPANY_SYMBOLS)) {
    if (lowerText.includes(key)) {
      return symbol;
    }
  }
  
  // Try to find ticker symbols in parentheses or after colons
  const tickerPatterns = [
    /\(([A-Z]{1,5})\)/,  // (SYMBOL)
    /\(NYSE:\s*([A-Z]{1,5})\)/i,  // (NYSE: SYMBOL)
    /\(NASDAQ:\s*([A-Z]{1,5})\)/i,  // (NASDAQ: SYMBOL)
    /\(TSX:\s*([A-Z]{1,5})\)/i,  // (TSX: SYMBOL)
    /\(ASX:\s*([A-Z]{1,5})\)/i,  // (ASX: SYMBOL)
    /\(LSE:\s*([A-Z]{1,5})\)/i,  // (LSE: SYMBOL)
    /:\s*([A-Z]{2,5})\b/  // : SYMBOL
  ];
  
  for (const pattern of tickerPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract commodities from text
 */
export function extractCommodities(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  for (const commodity of COMMODITIES) {
    if (lowerText.includes(commodity)) {
      // Normalize commodity name
      const normalized = commodity
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      found.push(normalized);
    }
  }
  
  return [...new Set(found)]; // Remove duplicates
}

/**
 * Extract primary commodity (most mentioned or first found)
 */
export function extractPrimaryCommodity(text: string): string | null {
  const commodities = extractCommodities(text);
  
  if (commodities.length === 0) return null;
  
  // Count occurrences
  const lowerText = text.toLowerCase();
  let maxCount = 0;
  let primary = commodities[0];
  
  for (const commodity of commodities) {
    const regex = new RegExp(commodity.toLowerCase(), 'gi');
    const matches = lowerText.match(regex);
    const count = matches ? matches.length : 0;
    
    if (count > maxCount) {
      maxCount = count;
      primary = commodity;
    }
  }
  
  return primary;
}

/**
 * Extract tags/topics from text
 */
export function extractTags(text: string): string[] {
  const lowerText = text.toLowerCase();
  const tags: string[] = [];
  
  for (const tag of MINING_TAGS) {
    if (lowerText.includes(tag.toLowerCase())) {
      tags.push(tag);
    }
  }
  
  // Add commodities as tags too
  const commodities = extractCommodities(text);
  tags.push(...commodities.map(c => c.toLowerCase()));
  
  // Extract company names as tags
  const symbol = extractSymbol(text);
  if (symbol) {
    tags.push(symbol.toLowerCase());
  }
  
  return [...new Set(tags)].slice(0, 10); // Limit to 10 unique tags
}

/**
 * Extract company name from text
 */
export function extractCompanyName(text: string): string | null {
  // Use the high-confidence extraction from mining-entities
  return extractCompanyWithConfidence(text);
}

/**
 * Detect if content is mining-related
 */
export function isMiningRelated(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const miningKeywords = [
    'mining', 'mine', 'mineral', 'ore', 'exploration', 'drilling',
    'resource', 'reserve', 'production', 'processing', 'extraction'
  ];
  
  return miningKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Detect if content mentions projects
 */
export function isProjectRelated(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const projectKeywords = [
    'project', 'mine', 'deposit', 'property', 'asset', 'operation',
    'development', 'construction', 'expansion', 'plant', 'facility'
  ];
  
  return projectKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Detect if content mentions financials
 */
export function mentionsFinancials(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const financialKeywords = [
    'revenue', 'earnings', 'profit', 'loss', 'ebitda', 'cash flow',
    'capex', 'opex', 'investment', 'financing', 'dividend', 'debt',
    'million', 'billion', '$', 'usd', 'cad', 'aud', 'forecast',
    'guidance', 'quarter', 'q1', 'q2', 'q3', 'q4', 'annual', 'fiscal'
  ];
  
  return financialKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Detect if content mentions technical reports
 */
export function mentionsTechnicalReport(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const technicalKeywords = [
    'technical report', 'ni 43-101', 'jorc', 'feasibility', 'pea',
    'resource estimate', 'reserve', 'mineral resource', 'mineral reserve',
    'indicated', 'inferred', 'measured', 'proven', 'probable'
  ];
  
  return technicalKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Calculate simple sentiment score
 */
export function calculateSentiment(text: string): number {
  const lowerText = text.toLowerCase();
  
  const positiveWords = [
    'increase', 'growth', 'positive', 'strong', 'record', 'high',
    'profit', 'gain', 'improve', 'advance', 'breakthrough', 'success',
    'expand', 'upgrade', 'exceed', 'outperform', 'optimistic', 'boost'
  ];
  
  const negativeWords = [
    'decrease', 'decline', 'negative', 'weak', 'low', 'loss',
    'drop', 'fall', 'worsen', 'delay', 'problem', 'issue',
    'concern', 'risk', 'challenge', 'difficult', 'suspend', 'halt'
  ];
  
  let score = 0;
  for (const word of positiveWords) {
    if (lowerText.includes(word)) score += 0.1;
  }
  for (const word of negativeWords) {
    if (lowerText.includes(word)) score -= 0.1;
  }
  
  return Math.max(-1, Math.min(1, score));
}
