// Accurate mining company and project lists for extraction

// Major mining companies with their common variations
export const MINING_COMPANIES = [
  // Major Diversified
  { name: 'BHP Group', variations: ['BHP', 'BHP Billiton', 'BHP Group Limited', 'BHP Group Ltd'] },
  { name: 'Rio Tinto', variations: ['Rio Tinto Group', 'Rio Tinto plc', 'Rio Tinto Limited'] },
  { name: 'Vale', variations: ['Vale S.A.', 'Vale SA', 'Companhia Vale do Rio Doce'] },
  { name: 'Glencore', variations: ['Glencore plc', 'Glencore International'] },
  { name: 'Anglo American', variations: ['Anglo American plc', 'Anglo'] },
  { name: 'Freeport-McMoRan', variations: ['Freeport', 'FCX', 'Freeport-McMoRan Inc'] },
  { name: 'Teck Resources', variations: ['Teck', 'Teck Resources Limited'] },
  { name: 'Fortescue Metals', variations: ['Fortescue', 'FMG', 'Fortescue Metals Group'] },
  
  // Gold Majors
  { name: 'Newmont Corporation', variations: ['Newmont', 'Newmont Mining', 'Newmont Goldcorp'] },
  { name: 'Barrick Gold', variations: ['Barrick', 'Barrick Gold Corporation'] },
  { name: 'Agnico Eagle', variations: ['Agnico Eagle Mines', 'AEM'] },
  { name: 'Kinross Gold', variations: ['Kinross', 'Kinross Gold Corporation'] },
  { name: 'Gold Fields', variations: ['Gold Fields Limited'] },
  { name: 'AngloGold Ashanti', variations: ['AngloGold', 'AngloGold Ashanti Limited'] },
  { name: 'Newcrest Mining', variations: ['Newcrest'] },
  { name: 'Kirkland Lake Gold', variations: ['Kirkland Lake', 'KL Gold'] },
  
  // Copper Companies
  { name: 'Codelco', variations: ['Corporación Nacional del Cobre de Chile'] },
  { name: 'Southern Copper', variations: ['Southern Copper Corporation', 'SCCO'] },
  { name: 'First Quantum', variations: ['First Quantum Minerals', 'FM'] },
  { name: 'Antofagasta', variations: ['Antofagasta plc', 'Antofagasta Minerals'] },
  { name: 'KGHM', variations: ['KGHM Polska Miedź'] },
  { name: 'Lundin Mining', variations: ['Lundin Mining Corporation'] },
  
  // Lithium Companies
  { name: 'Albemarle', variations: ['Albemarle Corporation', 'ALB'] },
  { name: 'SQM', variations: ['Sociedad Química y Minera de Chile'] },
  { name: 'Tianqi Lithium', variations: ['Tianqi'] },
  { name: 'Ganfeng Lithium', variations: ['Ganfeng', 'Jiangxi Ganfeng'] },
  { name: 'Pilbara Minerals', variations: ['Pilbara', 'PLS'] },
  { name: 'Allkem', variations: ['Allkem Limited', 'Galaxy Resources', 'Orocobre'] },
  { name: 'Lithium Americas', variations: ['LAC'] },
  { name: 'Sigma Lithium', variations: ['Sigma Lithium Corporation', 'SGML'] },
  { name: 'Liontown Resources', variations: ['Liontown', 'LTR'] },
  
  // Other Notable Companies
  { name: 'Ivanhoe Mines', variations: ['Ivanhoe'] },
  { name: 'Hudbay Minerals', variations: ['Hudbay', 'HBM'] },
  { name: 'Hecla Mining', variations: ['Hecla'] },
  { name: 'Pan American Silver', variations: ['Pan American', 'PAAS'] },
  { name: 'First Majestic Silver', variations: ['First Majestic', 'AG'] },
  { name: 'Wheaton Precious Metals', variations: ['Wheaton', 'WPM'] },
  { name: 'Franco-Nevada', variations: ['Franco-Nevada Corporation', 'FNV'] },
  { name: 'Cameco', variations: ['Cameco Corporation', 'CCJ'] },
  { name: 'Kazatomprom', variations: ['NAC Kazatomprom'] },
  { name: 'Energy Fuels', variations: ['Energy Fuels Inc', 'UUUU'] },
];

// Major mining projects worldwide
export const MINING_PROJECTS = [
  // Copper Projects
  { name: 'Escondida', location: 'Chile', commodity: 'Copper', operator: 'BHP' },
  { name: 'Grasberg', location: 'Indonesia', commodity: 'Copper/Gold', operator: 'Freeport-McMoRan' },
  { name: 'Collahuasi', location: 'Chile', commodity: 'Copper', operator: 'Anglo American/Glencore' },
  { name: 'El Teniente', location: 'Chile', commodity: 'Copper', operator: 'Codelco' },
  { name: 'Chuquicamata', location: 'Chile', commodity: 'Copper', operator: 'Codelco' },
  { name: 'Los Bronces', location: 'Chile', commodity: 'Copper', operator: 'Anglo American' },
  { name: 'Cerro Verde', location: 'Peru', commodity: 'Copper', operator: 'Freeport-McMoRan' },
  { name: 'Las Bambas', location: 'Peru', commodity: 'Copper', operator: 'MMG' },
  { name: 'Antamina', location: 'Peru', commodity: 'Copper/Zinc', operator: 'BHP/Glencore' },
  { name: 'Oyu Tolgoi', location: 'Mongolia', commodity: 'Copper/Gold', operator: 'Rio Tinto' },
  { name: 'Kamoa-Kakula', location: 'DRC', commodity: 'Copper', operator: 'Ivanhoe Mines' },
  { name: 'Cobre Panama', location: 'Panama', commodity: 'Copper', operator: 'First Quantum' },
  
  // Gold Projects
  { name: 'Muruntau', location: 'Uzbekistan', commodity: 'Gold', operator: 'Navoi' },
  { name: 'Carlin Trend', location: 'USA', commodity: 'Gold', operator: 'Newmont/Barrick' },
  { name: 'Olimpiada', location: 'Russia', commodity: 'Gold', operator: 'Polyus' },
  { name: 'Pueblo Viejo', location: 'Dominican Republic', commodity: 'Gold', operator: 'Barrick' },
  { name: 'Lihir', location: 'Papua New Guinea', commodity: 'Gold', operator: 'Newcrest' },
  { name: 'Kibali', location: 'DRC', commodity: 'Gold', operator: 'Barrick' },
  { name: 'Loulo-Gounkoto', location: 'Mali', commodity: 'Gold', operator: 'Barrick' },
  { name: 'Boddington', location: 'Australia', commodity: 'Gold/Copper', operator: 'Newmont' },
  { name: 'Canadian Malartic', location: 'Canada', commodity: 'Gold', operator: 'Agnico Eagle/Yamana' },
  { name: 'Detour Lake', location: 'Canada', commodity: 'Gold', operator: 'Agnico Eagle' },
  
  // Iron Ore Projects
  { name: 'Carajás', location: 'Brazil', commodity: 'Iron Ore', operator: 'Vale' },
  { name: 'Pilbara operations', location: 'Australia', commodity: 'Iron Ore', operator: 'Rio Tinto' },
  { name: 'Mount Whaleback', location: 'Australia', commodity: 'Iron Ore', operator: 'BHP' },
  { name: 'Solomon Hub', location: 'Australia', commodity: 'Iron Ore', operator: 'Fortescue' },
  { name: 'Roy Hill', location: 'Australia', commodity: 'Iron Ore', operator: 'Hancock Prospecting' },
  
  // Lithium Projects
  { name: 'Greenbushes', location: 'Australia', commodity: 'Lithium', operator: 'Tianqi/Albemarle' },
  { name: 'Atacama Salar', location: 'Chile', commodity: 'Lithium', operator: 'SQM/Albemarle' },
  { name: 'Olaroz', location: 'Argentina', commodity: 'Lithium', operator: 'Allkem' },
  { name: 'Mount Marion', location: 'Australia', commodity: 'Lithium', operator: 'Mineral Resources/Ganfeng' },
  { name: 'Pilgangoora', location: 'Australia', commodity: 'Lithium', operator: 'Pilbara Minerals' },
  { name: 'Kathleen Valley', location: 'Australia', commodity: 'Lithium', operator: 'Liontown Resources' },
  { name: 'Thacker Pass', location: 'USA', commodity: 'Lithium', operator: 'Lithium Americas' },
  { name: 'Grota do Cirilo', location: 'Brazil', commodity: 'Lithium', operator: 'Sigma Lithium' },
  
  // Nickel Projects
  { name: 'Norilsk', location: 'Russia', commodity: 'Nickel/Palladium', operator: 'Norilsk Nickel' },
  { name: 'Sudbury Basin', location: 'Canada', commodity: 'Nickel', operator: 'Vale/Glencore' },
  { name: 'Voisey\'s Bay', location: 'Canada', commodity: 'Nickel', operator: 'Vale' },
  { name: 'Murrin Murrin', location: 'Australia', commodity: 'Nickel/Cobalt', operator: 'Glencore' },
  
  // Other Major Projects
  { name: 'Olympic Dam', location: 'Australia', commodity: 'Copper/Uranium', operator: 'BHP' },
  { name: 'Cigar Lake', location: 'Canada', commodity: 'Uranium', operator: 'Cameco' },
  { name: 'McArthur River', location: 'Canada', commodity: 'Uranium', operator: 'Cameco' },
  { name: 'Diavik', location: 'Canada', commodity: 'Diamonds', operator: 'Rio Tinto' },
  { name: 'Jwaneng', location: 'Botswana', commodity: 'Diamonds', operator: 'De Beers' },
];

/**
 * Extract company names with high confidence
 */
export function extractCompanyWithConfidence(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  for (const company of MINING_COMPANIES) {
    // Check main name
    if (lowerText.includes(company.name.toLowerCase())) {
      return company.name;
    }
    
    // Check variations
    for (const variation of company.variations) {
      // Use word boundaries for more accurate matching
      const regex = new RegExp(`\\b${variation.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText)) {
        return company.name;
      }
    }
  }
  
  return null;
}

/**
 * Extract project names with high confidence
 */
export function extractProjectsWithConfidence(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundProjects: string[] = [];
  
  for (const project of MINING_PROJECTS) {
    // Look for project name with word boundaries
    const regex = new RegExp(`\\b${project.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      // Additional validation: check if mining/project context is present
      const contextWords = ['mine', 'project', 'operation', 'deposit', 'site', 'facility'];
      const hasContext = contextWords.some(word => {
        const contextRegex = new RegExp(`${project.name.toLowerCase()}[^.]{0,30}${word}|${word}[^.]{0,30}${project.name.toLowerCase()}`, 'i');
        return contextRegex.test(lowerText);
      });
      
      // Add if we have context or if it's a well-known project
      if (hasContext || ['Escondida', 'Grasberg', 'Oyu Tolgoi', 'Olympic Dam', 'Pilbara'].includes(project.name)) {
        foundProjects.push(project.name);
      }
    }
  }
  
  return [...new Set(foundProjects)]; // Remove duplicates
}
