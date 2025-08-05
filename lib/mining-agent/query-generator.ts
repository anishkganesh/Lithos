export interface MiningQuery {
  query: string
  category: string
  commodity?: string
}

export class MiningQueryGenerator {
  private commodities = [
    'lithium', 'copper', 'gold', 'silver', 'nickel', 
    'cobalt', 'graphite', 'rare earth', 'uranium', 
    'zinc', 'lead', 'tin', 'tungsten', 'molybdenum'
  ]

  private documentTypes = [
    'NI 43-101', 'JORC', 'feasibility study', 'PEA',
    'resource estimate', 'technical report', 'DFS'
  ]

  private stages = [
    'exploration', 'pre-feasibility', 'feasibility',
    'construction', 'production', 'expansion'
  ]

  generateQueries(): MiningQuery[] {
    const queries: MiningQuery[] = []
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().toLocaleString('default', { month: 'long' })

    // Time-based queries for recent updates
    const timeContexts = [
      `${currentMonth} ${currentYear}`,
      `Q4 ${currentYear}`,
      `${currentYear} latest`,
      'recent update',
      'new discovery'
    ]

    // Generate diverse commodity-specific queries
    this.commodities.forEach(commodity => {
      // Recent project updates
      queries.push({
        query: `"${commodity} project" ${timeContexts[0]} technical report mining`,
        category: 'recent-updates',
        commodity
      })

      // New discoveries
      queries.push({
        query: `new ${commodity} discovery ${currentYear} resource estimate`,
        category: 'discoveries',
        commodity
      })
    })

    // Document-type specific searches
    this.documentTypes.forEach(docType => {
      queries.push({
        query: `"${docType}" mining project ${currentYear} site:sedar.com`,
        category: 'technical-reports'
      })
    })

    // Stage-specific searches
    this.stages.forEach(stage => {
      queries.push({
        query: `"${stage} stage" mining project announcement ${timeContexts[0]}`,
        category: 'project-stages'
      })
    })

    // Regional searches for major mining jurisdictions
    const regions = [
      'Canada mining', 'Australia ASX', 'Nevada USA',
      'Chile copper', 'Peru mining', 'Brazil lithium',
      'Africa mining', 'Indonesia nickel'
    ]

    regions.forEach(region => {
      queries.push({
        query: `${region} project update ${currentYear} feasibility`,
        category: 'regional'
      })
    })

    // Major mining company updates
    const companies = [
      'BHP', 'Rio Tinto', 'Glencore', 'Vale', 'Barrick',
      'Newmont', 'Freeport', 'Anglo American'
    ]

    companies.forEach(company => {
      queries.push({
        query: `"${company}" new project announcement ${currentYear}`,
        category: 'major-companies'
      })
    })

    // Shuffle and limit to ensure variety
    return this.shuffleArray(queries).slice(0, 30)
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
} 