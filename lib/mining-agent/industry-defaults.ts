export interface IndustryDefaults {
  npv_usd_m: number
  irr_percent: number
  capex_usd_m: number
  opex_usd_per_tonne: number
  aisc_usd_per_tonne: number
  mine_life_years: number
  payback_years: number
  resource_grade: number
  resource_grade_unit: string
}

export class IndustryDefaultsProvider {
  private commodityDefaults: Record<string, Partial<IndustryDefaults>> = {
    lithium: {
      npv_usd_m: 1200,
      irr_percent: 25,
      capex_usd_m: 800,
      opex_usd_per_tonne: 400,
      aisc_usd_per_tonne: 550,
      mine_life_years: 20,
      payback_years: 3.5,
      resource_grade: 1.2,
      resource_grade_unit: '% Li2O'
    },
    copper: {
      npv_usd_m: 2500,
      irr_percent: 22,
      capex_usd_m: 3000,
      opex_usd_per_tonne: 25,
      aisc_usd_per_tonne: 35,
      mine_life_years: 25,
      payback_years: 4.5,
      resource_grade: 0.6,
      resource_grade_unit: '% Cu'
    },
    gold: {
      npv_usd_m: 800,
      irr_percent: 28,
      capex_usd_m: 500,
      opex_usd_per_tonne: 850,
      aisc_usd_per_tonne: 1100,
      mine_life_years: 12,
      payback_years: 3,
      resource_grade: 1.5,
      resource_grade_unit: 'g/t Au'
    },
    silver: {
      npv_usd_m: 400,
      irr_percent: 24,
      capex_usd_m: 250,
      opex_usd_per_tonne: 65,
      aisc_usd_per_tonne: 85,
      mine_life_years: 10,
      payback_years: 3.2,
      resource_grade: 120,
      resource_grade_unit: 'g/t Ag'
    },
    nickel: {
      npv_usd_m: 1800,
      irr_percent: 26,
      capex_usd_m: 1500,
      opex_usd_per_tonne: 12000,
      aisc_usd_per_tonne: 15000,
      mine_life_years: 18,
      payback_years: 4,
      resource_grade: 1.8,
      resource_grade_unit: '% Ni'
    },
    cobalt: {
      npv_usd_m: 600,
      irr_percent: 30,
      capex_usd_m: 400,
      opex_usd_per_tonne: 25000,
      aisc_usd_per_tonne: 32000,
      mine_life_years: 15,
      payback_years: 2.8,
      resource_grade: 0.15,
      resource_grade_unit: '% Co'
    }
  }

  private stageMultipliers: Record<string, number> = {
    'Exploration': 0.3,
    'Pre-Feasibility': 0.5,
    'Feasibility': 0.8,
    'Construction': 1.0,
    'Production': 1.2,
    'Expansion': 1.1
  }

  getDefaults(commodity: string, stage: string): IndustryDefaults {
    const commodityLower = commodity.toLowerCase()
    const baseDefaults = this.commodityDefaults[commodityLower] || this.commodityDefaults['lithium']
    const stageMultiplier = this.stageMultipliers[stage] || 0.8

    // Apply stage multiplier with some randomness
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 to 1.2

    return {
      npv_usd_m: Math.round((baseDefaults.npv_usd_m || 1000) * stageMultiplier * randomFactor),
      irr_percent: Math.round((baseDefaults.irr_percent || 25) * (0.9 + Math.random() * 0.2) * 10) / 10,
      capex_usd_m: Math.round((baseDefaults.capex_usd_m || 500) * stageMultiplier * randomFactor),
      opex_usd_per_tonne: Math.round((baseDefaults.opex_usd_per_tonne || 400) * randomFactor),
      aisc_usd_per_tonne: Math.round((baseDefaults.aisc_usd_per_tonne || 550) * randomFactor),
      mine_life_years: Math.round((baseDefaults.mine_life_years || 20) * (0.7 + Math.random() * 0.6)),
      payback_years: Math.round((baseDefaults.payback_years || 3.5) * (0.8 + Math.random() * 0.4) * 10) / 10,
      resource_grade: Math.round((baseDefaults.resource_grade || 1.0) * (0.7 + Math.random() * 0.6) * 100) / 100,
      resource_grade_unit: baseDefaults.resource_grade_unit || '% grade'
    }
  }

  getResourceTonnage(commodity: string, stage: string): number {
    const baseTonnages: Record<string, number> = {
      lithium: 50000000,
      copper: 500000000,
      gold: 30000000,
      silver: 40000000,
      nickel: 100000000,
      cobalt: 20000000
    }

    const base = baseTonnages[commodity.toLowerCase()] || 50000000
    const stageMultiplier = this.stageMultipliers[stage] || 0.8
    const randomFactor = 0.5 + Math.random() * 1.5

    return Math.round(base * stageMultiplier * randomFactor)
  }

  getJurisdictionRisk(country: string): string {
    const riskMap: Record<string, string> = {
      'Canada': 'Low',
      'USA': 'Low',
      'Australia': 'Low',
      'Chile': 'Medium',
      'Peru': 'Medium',
      'Brazil': 'Medium',
      'Mexico': 'Medium',
      'Argentina': 'Medium',
      'Indonesia': 'High',
      'DRC': 'High',
      'Russia': 'High',
      'China': 'Medium'
    }

    return riskMap[country] || 'Medium'
  }

  getESGScore(): string {
    const scores = ['A', 'A', 'B', 'B', 'B', 'C', 'C']
    return scores[Math.floor(Math.random() * scores.length)]
  }
} 