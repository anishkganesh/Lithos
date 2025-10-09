export type ProjectStage =
  | 'Exploration'
  | 'Pre-Feasibility'
  | 'Feasibility'
  | 'Development'
  | 'Construction'
  | 'Production'
  | 'On Hold';

export type Commodity = string; // Allow any commodity as string

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export type ESGGrade = 'A' | 'B' | 'C' | 'D' | 'F';

// Database schema (actual columns from Supabase)
export interface MiningProject {
  id: string;
  company_id: string | null;
  name: string;
  location: string | null;
  stage: string | null;
  commodities: string[] | null;
  resource_estimate: string | null;
  reserve_estimate: string | null;
  ownership_percentage: number | null;
  status: string | null;
  description: string | null;
  urls: string[] | null;
  watchlist: boolean;
  created_at: string;
  updated_at: string;

  // Computed/display fields (for backward compatibility)
  project?: string; // Alias for name
  company?: string; // Company name (joined)
  primaryCommodity?: string; // First commodity in array
  jurisdiction?: string; // Alias for location
  riskLevel?: RiskLevel;

  // Optional legacy fields
  project_id?: string;
  watchlisted_at?: string;
  generated_image_url?: string;
  technicalReportUrl?: string;
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