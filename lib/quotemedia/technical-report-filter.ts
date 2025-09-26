/**
 * Advanced filter for identifying technical reports with project financial data
 * Uses SIC codes and commodity-specific searches
 */

// Comprehensive commodity list with variations
export const COMMODITY_SEARCH_TERMS = {
  // PRECIOUS METALS
  gold: {
    keywords: ['gold', 'au', 'aurum', 'gold mine', 'gold project', 'gold deposit'],
    sic_codes: ['1040', '1041'],
    units: ['oz', 'ounces', 'grams', 'g/t', 'oz/t'],
    typical_grades: { min: 0.5, max: 15, unit: 'g/t' }
  },
  silver: {
    keywords: ['silver', 'ag', 'argentum', 'silver mine', 'silver project'],
    sic_codes: ['1040', '1044'],
    units: ['oz', 'ounces', 'g/t', 'oz/t'],
    typical_grades: { min: 30, max: 500, unit: 'g/t' }
  },
  platinum: {
    keywords: ['platinum', 'pt', 'pgm', 'platinum group', 'pge'],
    sic_codes: ['1099'],
    units: ['oz', 'g/t', 'ppm'],
    typical_grades: { min: 2, max: 10, unit: 'g/t' }
  },
  palladium: {
    keywords: ['palladium', 'pd', 'pgm', 'platinum group'],
    sic_codes: ['1099'],
    units: ['oz', 'g/t', 'ppm'],
    typical_grades: { min: 2, max: 10, unit: 'g/t' }
  },

  // BASE METALS
  copper: {
    keywords: ['copper', 'cu', 'cuprum', 'copper mine', 'copper project', 'porphyry'],
    sic_codes: ['1020', '1021'],
    units: ['%', 'percent', 'lbs', 'tonnes', 'kt'],
    typical_grades: { min: 0.2, max: 2.0, unit: '%' }
  },
  zinc: {
    keywords: ['zinc', 'zn', 'zinc mine', 'zinc-lead', 'vms'],
    sic_codes: ['1030', '1031'],
    units: ['%', 'percent', 'tonnes', 'kt'],
    typical_grades: { min: 2, max: 15, unit: '%' }
  },
  lead: {
    keywords: ['lead', 'pb', 'plumbum', 'lead-zinc', 'galena'],
    sic_codes: ['1030', '1031'],
    units: ['%', 'percent', 'tonnes'],
    typical_grades: { min: 1, max: 10, unit: '%' }
  },
  nickel: {
    keywords: ['nickel', 'ni', 'nickel laterite', 'nickel sulphide', 'nickel sulfide'],
    sic_codes: ['1061'],
    units: ['%', 'percent', 'tonnes', 'kt'],
    typical_grades: { min: 0.2, max: 3.0, unit: '%' }
  },
  tin: {
    keywords: ['tin', 'sn', 'stannum', 'cassiterite'],
    sic_codes: ['1099'],
    units: ['%', 'kg', 'tonnes'],
    typical_grades: { min: 0.1, max: 2.0, unit: '%' }
  },
  aluminum: {
    keywords: ['aluminum', 'aluminium', 'al', 'bauxite', 'alumina'],
    sic_codes: ['1050', '1051'],
    units: ['%', 'tonnes', 'mt'],
    typical_grades: { min: 35, max: 55, unit: '% Al2O3' }
  },

  // BATTERY/CRITICAL METALS
  lithium: {
    keywords: ['lithium', 'li', 'spodumene', 'petalite', 'lepidolite', 'lithium brine', 'li2o'],
    sic_codes: ['1479'],
    units: ['%', 'Li2O', 'ppm', 'mg/L'],
    typical_grades: { min: 0.5, max: 2.0, unit: '% Li2O' }
  },
  cobalt: {
    keywords: ['cobalt', 'co', 'cobalt mine', 'battery metal'],
    sic_codes: ['1061', '1099'],
    units: ['%', 'ppm', 'kg', 'tonnes'],
    typical_grades: { min: 0.05, max: 0.5, unit: '%' }
  },
  graphite: {
    keywords: ['graphite', 'c', 'carbon', 'graphene', 'flake graphite', 'vein graphite'],
    sic_codes: ['1499'],
    units: ['%', 'Cg', '%Cg', 'carbon'],
    typical_grades: { min: 5, max: 30, unit: '%Cg' }
  },
  manganese: {
    keywords: ['manganese', 'mn', 'manganese oxide', 'mno', 'mn ore'],
    sic_codes: ['1061'],
    units: ['%', 'Mn', '%Mn', 'tonnes'],
    typical_grades: { min: 15, max: 50, unit: '%Mn' }
  },
  vanadium: {
    keywords: ['vanadium', 'v', 'v2o5', 'vanadium pentoxide'],
    sic_codes: ['1094', '1061'],
    units: ['%', 'V2O5', 'ppm'],
    typical_grades: { min: 0.5, max: 2.0, unit: '% V2O5' }
  },

  // RARE EARTH ELEMENTS
  rare_earth: {
    keywords: ['rare earth', 'ree', 'treo', 'lanthanides', 'neodymium', 'dysprosium',
               'praseodymium', 'terbium', 'europium', 'yttrium', 'lanthanum', 'cerium'],
    sic_codes: ['1099'],
    units: ['%', 'TREO', 'ppm', 'kg'],
    typical_grades: { min: 0.05, max: 10, unit: '% TREO' }
  },

  // BULK COMMODITIES
  iron_ore: {
    keywords: ['iron ore', 'fe', 'iron', 'magnetite', 'hematite', 'taconite', 'pellets'],
    sic_codes: ['1010', '1011'],
    units: ['%', 'Fe', '%Fe', 'Mt', 'million tonnes'],
    typical_grades: { min: 20, max: 70, unit: '%Fe' }
  },
  coal: {
    keywords: ['coal', 'coking coal', 'thermal coal', 'met coal', 'metallurgical coal', 'anthracite'],
    sic_codes: ['1220', '1221', '1222', '1231'],
    units: ['Mt', 'million tonnes', 'Btu', 'kcal/kg'],
    typical_grades: { min: 4000, max: 7000, unit: 'kcal/kg' }
  },
  potash: {
    keywords: ['potash', 'kcl', 'k2o', 'potassium chloride', 'sylvite'],
    sic_codes: ['1474'],
    units: ['%', 'K2O', '%K2O', 'Mt'],
    typical_grades: { min: 10, max: 35, unit: '%K2O' }
  },
  phosphate: {
    keywords: ['phosphate', 'phosphorus', 'p2o5', 'phosphate rock', 'apatite'],
    sic_codes: ['1475'],
    units: ['%', 'P2O5', '%P2O5', 'Mt'],
    typical_grades: { min: 20, max: 40, unit: '%P2O5' }
  },
  uranium: {
    keywords: ['uranium', 'u', 'u3o8', 'yellowcake', 'nuclear', 'pitchblende'],
    sic_codes: ['1094'],
    units: ['%', 'U3O8', 'ppm', 'lbs'],
    typical_grades: { min: 0.03, max: 2.0, unit: '%U3O8' }
  },

  // OTHER STRATEGIC METALS
  molybdenum: {
    keywords: ['molybdenum', 'mo', 'moly', 'molybdenite'],
    sic_codes: ['1061'],
    units: ['%', 'Mo', 'ppm'],
    typical_grades: { min: 0.01, max: 0.3, unit: '%Mo' }
  },
  tungsten: {
    keywords: ['tungsten', 'w', 'wolfram', 'wolframite', 'scheelite', 'wo3'],
    sic_codes: ['1099'],
    units: ['%', 'WO3', 'MTU'],
    typical_grades: { min: 0.1, max: 2.0, unit: '%WO3' }
  },
  antimony: {
    keywords: ['antimony', 'sb', 'stibium', 'stibnite'],
    sic_codes: ['1099'],
    units: ['%', 'Sb', 'tonnes'],
    typical_grades: { min: 0.5, max: 5.0, unit: '%Sb' }
  },
  bismuth: {
    keywords: ['bismuth', 'bi', 'bismuthinite'],
    sic_codes: ['1099'],
    units: ['%', 'ppm', 'kg'],
    typical_grades: { min: 0.01, max: 0.5, unit: '%' }
  },
  titanium: {
    keywords: ['titanium', 'ti', 'rutile', 'ilmenite', 'tio2'],
    sic_codes: ['1099'],
    units: ['%', 'TiO2', '%TiO2'],
    typical_grades: { min: 5, max: 95, unit: '%TiO2' }
  },
  chromium: {
    keywords: ['chromium', 'chrome', 'cr', 'chromite', 'ferrochrome'],
    sic_codes: ['1061'],
    units: ['%', 'Cr2O3', '%Cr2O3'],
    typical_grades: { min: 20, max: 50, unit: '%Cr2O3' }
  },
  niobium: {
    keywords: ['niobium', 'nb', 'columbium', 'pyrochlore'],
    sic_codes: ['1099'],
    units: ['%', 'Nb2O5', 'ppm'],
    typical_grades: { min: 0.5, max: 3.0, unit: '%Nb2O5' }
  },
  tantalum: {
    keywords: ['tantalum', 'ta', 'tantalite', 'coltan'],
    sic_codes: ['1099'],
    units: ['%', 'Ta2O5', 'ppm'],
    typical_grades: { min: 0.01, max: 0.1, unit: '%Ta2O5' }
  },
  zirconium: {
    keywords: ['zirconium', 'zr', 'zircon', 'zro2'],
    sic_codes: ['1099'],
    units: ['%', 'ZrO2', 'ppm'],
    typical_grades: { min: 0.5, max: 2.0, unit: '%ZrO2' }
  },
  gallium: {
    keywords: ['gallium', 'ga', 'gallium arsenide'],
    sic_codes: ['1099'],
    units: ['ppm', 'kg', 'tonnes'],
    typical_grades: { min: 10, max: 100, unit: 'ppm' }
  },
  germanium: {
    keywords: ['germanium', 'ge'],
    sic_codes: ['1099'],
    units: ['ppm', 'kg'],
    typical_grades: { min: 10, max: 200, unit: 'ppm' }
  },
  indium: {
    keywords: ['indium', 'in', 'ito'],
    sic_codes: ['1099'],
    units: ['ppm', 'g/t', 'kg'],
    typical_grades: { min: 10, max: 500, unit: 'ppm' }
  },
  tellurium: {
    keywords: ['tellurium', 'te'],
    sic_codes: ['1099'],
    units: ['ppm', 'g/t'],
    typical_grades: { min: 1, max: 50, unit: 'ppm' }
  },
  scandium: {
    keywords: ['scandium', 'sc', 'sc2o3'],
    sic_codes: ['1099'],
    units: ['ppm', 'g/t'],
    typical_grades: { min: 10, max: 100, unit: 'ppm' }
  },
  rhenium: {
    keywords: ['rhenium', 're'],
    sic_codes: ['1099'],
    units: ['ppm', 'g/t'],
    typical_grades: { min: 0.1, max: 10, unit: 'ppm' }
  },
  beryllium: {
    keywords: ['beryllium', 'be', 'beryl'],
    sic_codes: ['1099'],
    units: ['%', 'BeO', 'ppm'],
    typical_grades: { min: 0.1, max: 1.0, unit: '%BeO' }
  },

  // INDUSTRIAL MINERALS
  salt: {
    keywords: ['salt', 'nacl', 'halite', 'sodium chloride', 'brine'],
    sic_codes: ['1476'],
    units: ['Mt', 'million tonnes', '%'],
    typical_grades: { min: 90, max: 99, unit: '%NaCl' }
  },
  boron: {
    keywords: ['boron', 'borax', 'boric acid', 'b2o3', 'ulexite', 'colemanite'],
    sic_codes: ['1474'],
    units: ['%', 'B2O3', '%B2O3'],
    typical_grades: { min: 15, max: 40, unit: '%B2O3' }
  },
  fluorspar: {
    keywords: ['fluorspar', 'fluorite', 'caf2', 'calcium fluoride'],
    sic_codes: ['1479'],
    units: ['%', 'CaF2', '%CaF2'],
    typical_grades: { min: 30, max: 98, unit: '%CaF2' }
  }
};

// Financial metrics that indicate a proper technical report
export const FINANCIAL_INDICATORS = {
  capex: ['capex', 'capital cost', 'initial capital', 'capital expenditure', 'development cost', 'construction cost'],
  opex: ['opex', 'operating cost', 'operating expense', 'cash cost', 'site cost', 'mining cost'],
  npv: ['npv', 'net present value', 'present value', 'project value', 'nav'],
  irr: ['irr', 'internal rate of return', 'rate of return', 'project return'],
  payback: ['payback', 'payback period', 'capital recovery', 'pay back'],
  mine_life: ['mine life', 'life of mine', 'lom', 'project life', 'production years', 'operating years'],
  production: ['annual production', 'production rate', 'throughput', 'tpd', 'tpa', 'mtpa', 'tonnes per day'],
  resource: ['resource', 'reserve', 'measured', 'indicated', 'inferred', 'm&i', 'proven', 'probable', 'mineral resource', 'mineral reserve'],
  grade: ['grade', 'head grade', 'average grade', 'cut-off grade', 'ore grade', 'g/t', 'ppm', 'percent'],
  aisc: ['aisc', 'all-in sustaining', 'all in sustaining', 'sustaining cost', 'total cost']
};

// Document types that typically contain technical reports
export const TECHNICAL_DOCUMENT_INDICATORS = {
  form_types: {
    US: ['10-K', '20-F', '40-F', '8-K', 'S-1', 'F-1', '424B'],
    Canada: ['43-101', 'NI 43-101', 'AIF', 'Annual Information Form']
  },

  title_keywords: [
    'technical report',
    'feasibility study',
    'preliminary economic assessment',
    'pea',
    'pre-feasibility',
    'definitive feasibility',
    'mineral resource',
    'mineral reserve',
    'resource estimate',
    'reserve estimate',
    'technical report summary',
    'trs',
    'qualified person',
    'competent person',
    'ni 43-101',
    's-k 1300',
    'jorc',
    'mine plan',
    'life of mine plan'
  ],

  size_indicators: {
    min_pages: 100,
    min_file_size_mb: 2,
    typical_pages: { min: 150, max: 500 }
  }
};

/**
 * Filter function to identify technical reports with financial data
 */
export function isLikelyTechnicalReport(doc: any): {
  isMatch: boolean;
  confidence: number;
  commodity?: string;
  indicators: string[];
} {
  const indicators: string[] = [];
  let confidence = 0;

  const desc = (doc.formDescription || '').toLowerCase();
  const formType = (doc.formType || '').toUpperCase();

  // Check document type
  if (TECHNICAL_DOCUMENT_INDICATORS.form_types.US.includes(formType) ||
      TECHNICAL_DOCUMENT_INDICATORS.form_types.Canada.some(t => desc.includes(t.toLowerCase()))) {
    confidence += 20;
    indicators.push('form_type_match');
  }

  // Check for technical report keywords in title
  for (const keyword of TECHNICAL_DOCUMENT_INDICATORS.title_keywords) {
    if (desc.includes(keyword)) {
      confidence += 30;
      indicators.push(`title_${keyword.replace(/\s+/g, '_')}`);
      break;
    }
  }

  // Check document size
  const fileSize = doc.fileSize || '';
  const pages = doc.pages || 0;

  if (fileSize.includes('MB')) {
    const sizeMB = parseFloat(fileSize.replace(/[^\d.]/g, ''));
    if (sizeMB >= TECHNICAL_DOCUMENT_INDICATORS.size_indicators.min_file_size_mb) {
      confidence += 20;
      indicators.push('large_file_size');
    }
  }

  if (pages >= TECHNICAL_DOCUMENT_INDICATORS.size_indicators.min_pages) {
    confidence += 25;
    indicators.push('high_page_count');
  }

  // Check for commodity mentions
  let detectedCommodity: string | undefined;
  for (const [commodity, data] of Object.entries(COMMODITY_SEARCH_TERMS)) {
    for (const keyword of data.keywords) {
      if (desc.includes(keyword) || (doc.companyName || '').toLowerCase().includes(keyword)) {
        confidence += 15;
        detectedCommodity = commodity;
        indicators.push(`commodity_${commodity}`);
        break;
      }
    }
    if (detectedCommodity) break;
  }

  // Check for financial metric keywords
  let financialMatches = 0;
  for (const [metric, keywords] of Object.entries(FINANCIAL_INDICATORS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        financialMatches++;
        indicators.push(`financial_${metric}`);
        break;
      }
    }
  }

  if (financialMatches > 0) {
    confidence += financialMatches * 10;
  }

  // Special boost for annual reports of mining companies
  if ((formType === '10-K' || formType === '40-F' || formType === '20-F') &&
      pages > 200 && detectedCommodity) {
    confidence += 20;
    indicators.push('annual_mining_report');
  }

  return {
    isMatch: confidence >= 50,
    confidence: Math.min(confidence, 100),
    commodity: detectedCommodity,
    indicators
  };
}

/**
 * Get all SIC codes for mining companies
 */
export function getAllMiningSicCodes(): string[] {
  const sicCodes = new Set<string>();

  // Add main mining SIC codes
  Object.values(COMMODITY_SEARCH_TERMS).forEach(commodity => {
    commodity.sic_codes.forEach(code => sicCodes.add(code));
  });

  // Add general mining SIC codes
  ['1000', '1010', '1020', '1030', '1040', '1050', '1060', '1070', '1080', '1090',
   '1200', '1220', '1221', '1222', '1231', '1241',
   '1400', '1420', '1440', '1450', '1470', '1474', '1475', '1479',
   '1499'].forEach(code => sicCodes.add(code));

  return Array.from(sicCodes);
}