/**
 * Validator to check if documents contain required financial metrics
 * Checks for CAPEX, NPV, IRR, mine life, production rates, etc.
 */

// Required financial metrics for a complete project entry
export const REQUIRED_FINANCIAL_METRICS = {
  capex: {
    keywords: [
      'capital cost', 'capex', 'initial capital', 'capital expenditure',
      'development cost', 'construction cost', 'upfront capital',
      'pre-production capital', 'initial investment'
    ],
    patterns: [
      /\$[\d,]+\s*(?:million|M)/i,
      /US\$[\d,]+(?:,\d{3})*(?:\.\d+)?\s*(?:million|M)/i,
      /capital\s+(?:cost|expenditure).*?[\d,]+\s*(?:million|M)/i
    ],
    unit: 'USD millions'
  },

  sustaining_capex: {
    keywords: [
      'sustaining capital', 'sustaining capex', 'replacement capital',
      'ongoing capital', 'maintenance capital', 'life of mine capital'
    ],
    patterns: [
      /sustaining\s+capital.*?\$[\d,]+\s*(?:million|M)/i,
      /LOM\s+sustaining.*?[\d,]+\s*(?:million|M)/i
    ],
    unit: 'USD millions'
  },

  npv: {
    keywords: [
      'npv', 'net present value', 'project value', 'discounted cash flow',
      'dcf', 'present value'
    ],
    patterns: [
      /NPV.*?[@at\s]+(\d+)%.*?\$[\d,]+\s*(?:million|M)/i,
      /net\s+present\s+value.*?\$[\d,]+\s*(?:million|M)/i,
      /NPV\d+.*?\$[\d,]+/i
    ],
    unit: 'USD millions'
  },

  irr: {
    keywords: [
      'irr', 'internal rate of return', 'rate of return', 'project return',
      'return rate'
    ],
    patterns: [
      /IRR.*?[\d.]+\s*%/i,
      /internal\s+rate\s+of\s+return.*?[\d.]+\s*%/i,
      /(?:pre|post)[\s-]*tax\s+IRR.*?[\d.]+\s*%/i
    ],
    unit: 'percent'
  },

  payback: {
    keywords: [
      'payback', 'payback period', 'capital recovery', 'pay back',
      'recovery period'
    ],
    patterns: [
      /payback.*?[\d.]+\s*years?/i,
      /capital\s+recovery.*?[\d.]+\s*years?/i,
      /[\d.]+\s*year\s+payback/i
    ],
    unit: 'years'
  },

  mine_life: {
    keywords: [
      'mine life', 'life of mine', 'lom', 'project life', 'operating life',
      'production years', 'years of production'
    ],
    patterns: [
      /mine\s+life.*?[\d.]+\s*years?/i,
      /life\s+of\s+mine.*?[\d.]+\s*years?/i,
      /LOM.*?[\d.]+\s*years?/i,
      /[\d.]+[\s-]*year\s+(?:mine\s+)?life/i
    ],
    unit: 'years'
  },

  production: {
    keywords: [
      'annual production', 'production rate', 'throughput', 'processing rate',
      'tonnes per day', 'tpd', 'tpa', 'mtpa', 'tonnes per annum'
    ],
    patterns: [
      /[\d,]+\s*(?:tonnes?|t)\/(?:day|d|year|y|annum|a)/i,
      /[\d,]+\s*(?:tpd|tpa|mtpa)/i,
      /annual\s+production.*?[\d,]+\s*(?:tonnes?|ounces?|oz|lbs?|pounds?)/i,
      /throughput.*?[\d,]+\s*(?:tonnes?|t)/i
    ],
    unit: 'tonnes/year'
  },

  resource_tonnage: {
    keywords: [
      'resource', 'measured resource', 'indicated resource', 'inferred resource',
      'total resource', 'mineral resource', 'ore resource', 'tonnage'
    ],
    patterns: [
      /(?:measured|indicated|inferred|total)\s+resource.*?[\d,]+\s*(?:M|million)?\s*(?:tonnes?|t)/i,
      /mineral\s+resource.*?[\d,]+\s*(?:M|million)?\s*(?:tonnes?|t)/i,
      /[\d,]+\s*(?:Mt|million\s+tonnes?)\s+(?:of\s+)?resource/i
    ],
    unit: 'million tonnes'
  },

  grade: {
    keywords: [
      'grade', 'ore grade', 'average grade', 'head grade', 'resource grade',
      'g/t', 'ppm', 'percent', '%'
    ],
    patterns: [
      /[\d.]+\s*(?:g\/t|grams?\s+per\s+tonne)/i,
      /[\d.]+\s*%\s*(?:Cu|Ni|Zn|Pb|Li|U3O8)/i,
      /grade.*?[\d.]+\s*(?:g\/t|%|ppm)/i,
      /average\s+grade.*?[\d.]+/i
    ],
    unit: 'varies'
  },

  opex: {
    keywords: [
      'operating cost', 'opex', 'cash cost', 'site cost', 'mining cost',
      'processing cost', 'unit cost', 'cost per tonne'
    ],
    patterns: [
      /operating\s+cost.*?\$[\d,]+\s*(?:\/|per)\s*(?:tonne?|t|ounce|oz)/i,
      /opex.*?\$[\d,]+/i,
      /cash\s+cost.*?\$[\d,]+/i,
      /\$[\d,]+\s*(?:\/|per)\s*(?:tonne?|t)\s+(?:mined|processed)/i
    ],
    unit: 'USD/tonne'
  },

  aisc: {
    keywords: [
      'aisc', 'all-in sustaining cost', 'all in sustaining', 'total cost',
      'sustaining cost'
    ],
    patterns: [
      /AISC.*?\$[\d,]+\s*(?:\/|per)\s*(?:ounce|oz|pound|lb|tonne|t)/i,
      /all[\s-]in\s+sustaining.*?\$[\d,]+/i,
      /total\s+cost.*?\$[\d,]+\s*(?:\/|per)/i
    ],
    unit: 'USD/unit'
  }
};

// Project stages based on document content
export const PROJECT_STAGES = {
  exploration: ['exploration', 'drilling', 'discovery', 'early stage'],
  pea: ['preliminary economic assessment', 'pea', 'scoping study'],
  prefeasibility: ['pre-feasibility', 'prefeasibility', 'pfs'],
  feasibility: ['feasibility study', 'definitive feasibility', 'dfs', 'bankable'],
  construction: ['construction', 'development', 'building'],
  production: ['operating', 'producing', 'commercial production'],
  care_maintenance: ['care and maintenance', 'suspended', 'on hold']
};

/**
 * Validate if a document contains required financial metrics
 */
export function validateFinancialMetrics(documentInfo: {
  description: string;
  formType: string;
  pages?: number;
  fileSize?: string;
}): {
  hasRequiredMetrics: boolean;
  confidence: number;
  foundMetrics: string[];
  missingMetrics: string[];
  estimatedStage?: string;
} {
  const desc = documentInfo.description.toLowerCase();
  const foundMetrics: string[] = [];
  const missingMetrics: string[] = [];
  let confidence = 0;

  // Check for each required metric
  for (const [metric, config] of Object.entries(REQUIRED_FINANCIAL_METRICS)) {
    let found = false;

    // Check keywords
    for (const keyword of config.keywords) {
      if (desc.includes(keyword)) {
        found = true;
        foundMetrics.push(metric);
        confidence += 10;
        break;
      }
    }

    if (!found) {
      missingMetrics.push(metric);
    }
  }

  // Boost confidence for specific document types
  if (documentInfo.formType === '10-K' || documentInfo.formType === '40-F') {
    confidence += 20;
  }

  if (documentInfo.pages && documentInfo.pages > 150) {
    confidence += 15;
  }

  // Check for technical report indicators
  const technicalIndicators = [
    'technical report',
    'feasibility',
    'economic assessment',
    'mineral resource',
    'mineral reserve',
    '43-101',
    's-k 1300',
    'qualified person'
  ];

  for (const indicator of technicalIndicators) {
    if (desc.includes(indicator)) {
      confidence += 15;
      break;
    }
  }

  // Estimate project stage
  let estimatedStage: string | undefined;
  for (const [stage, keywords] of Object.entries(PROJECT_STAGES)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        estimatedStage = stage;
        break;
      }
    }
    if (estimatedStage) break;
  }

  // Determine if document has required metrics
  const hasRequiredMetrics = foundMetrics.length >= 6; // At least 6 key metrics

  return {
    hasRequiredMetrics,
    confidence: Math.min(confidence, 100),
    foundMetrics,
    missingMetrics,
    estimatedStage
  };
}

/**
 * Extract project names from document description
 */
export function extractProjectNames(text: string): string[] {
  const projectNames: string[] = [];

  // Common project name patterns
  const patterns = [
    /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Project|Mine|Property|Deposit)/gi,
    /(?:Project|Mine|Property):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Gold|Copper|Silver|Lithium|Uranium)\s+(?:Project|Mine)/gi
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !projectNames.includes(match[1])) {
        projectNames.push(match[1]);
      }
    }
  }

  return projectNames;
}

/**
 * Extract commodities from text
 */
export function extractCommodities(text: string): string[] {
  const commodities: string[] = [];
  const textLower = text.toLowerCase();

  const commodityList = [
    'gold', 'silver', 'copper', 'zinc', 'lead', 'nickel',
    'cobalt', 'lithium', 'uranium', 'platinum', 'palladium',
    'iron ore', 'rare earth', 'molybdenum', 'tungsten',
    'graphite', 'vanadium', 'manganese', 'tin', 'potash'
  ];

  for (const commodity of commodityList) {
    if (textLower.includes(commodity)) {
      commodities.push(commodity);
    }
  }

  return commodities;
}

/**
 * Calculate overall document quality score
 */
export function calculateDocumentQuality(doc: any): number {
  let score = 0;

  // Document size and type
  if (doc.pages > 200) score += 30;
  else if (doc.pages > 100) score += 20;
  else if (doc.pages > 50) score += 10;

  if (doc.fileSize?.includes('MB')) {
    const sizeMB = parseFloat(doc.fileSize.replace(/[^\d.]/g, ''));
    if (sizeMB > 5) score += 20;
    else if (sizeMB > 2) score += 10;
  }

  // Form type quality
  const highQualityForms = ['10-K', '40-F', '20-F'];
  const mediumQualityForms = ['10-Q', '8-K', '6-K'];

  if (highQualityForms.includes(doc.formType)) score += 30;
  else if (mediumQualityForms.includes(doc.formType)) score += 15;

  // Description quality
  const desc = (doc.formDescription || '').toLowerCase();
  const qualityKeywords = [
    'technical report', 'feasibility', 'resource estimate',
    'economic assessment', '43-101', 'mineral'
  ];

  for (const keyword of qualityKeywords) {
    if (desc.includes(keyword)) {
      score += 10;
      break;
    }
  }

  return Math.min(score, 100);
}