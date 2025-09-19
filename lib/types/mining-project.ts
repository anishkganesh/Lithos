export type ProjectStage = 
  | 'Exploration' 
  | 'PEA' 
  | 'PFS' 
  | 'DFS' 
  | 'Development' 
  | 'Production' 
  | 'Care & Maintenance';

export type Commodity = 
  | 'Lithium' 
  | 'Copper' 
  | 'Nickel' 
  | 'Cobalt' 
  | 'Graphite' 
  | 'Rare Earths' 
  | 'Uranium' 
  | 'Vanadium'
  | 'Manganese'
  | 'Tin'
  | 'Tungsten'
  | 'Molybdenum'
  | 'Neodymium'
  | 'Cerium';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export type ESGGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface MiningProject {
  id: string;
  project: string;
  stage: ProjectStage;
  mineLife: number; // years
  postTaxNPV: number; // USD millions
  irr: number; // percentage
  paybackYears: number;
  capex: number; // USD millions
  aisc: number; // USD per tonne
  primaryCommodity: Commodity;
  secondaryCommodities?: Commodity[];
  jurisdiction: string;
  riskLevel: RiskLevel;
  investorsOwnership: string;
  
  // Hidden columns
  resourceGrade?: number; // percentage or g/t depending on commodity
  gradeUnit?: string; // %, g/t, ppm, etc
  containedMetal?: number; // tonnes
  esgScore?: ESGGrade;
  redFlags?: string[];
  permitStatus?: 'Granted' | 'Pending' | 'In Process' | 'Not Applied';
  offtakeAgreements?: string[];
  
  // Additional metadata
  lastUpdated: string;
  dataQuality: 'High' | 'Medium' | 'Low';

  // Watchlist
  watchlist?: boolean;
  watchlisted_at?: string;
  generated_image_url?: string;
  company?: string;
}

export interface ProjectFilter {
  stages?: ProjectStage[];
  commodities?: Commodity[];
  jurisdictions?: string[];
  riskLevels?: RiskLevel[];
  npvRange?: { min: number; max: number };
  irrRange?: { min: number; max: number };
  capexRange?: { min: number; max: number };
  searchQuery?: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: ProjectFilter;
  visibleColumns: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} 