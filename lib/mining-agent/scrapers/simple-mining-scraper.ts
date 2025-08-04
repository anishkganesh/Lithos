import { Document } from '../document-processor'

export class SimpleMininingScraper {
  async fetchLatestDocuments(): Promise<Document[]> {
    // These are simplified project pages that should be easier to scrape
    const miningProjects = [
      {
        url: 'https://en.wikipedia.org/wiki/Thacker_Pass_lithium_mine',
        title: 'Thacker Pass Lithium Mine',
        company: 'Lithium Americas Corp',
        projectName: 'Thacker Pass',
        type: 'Development Project',
        commodity: 'Lithium',
        location: 'Nevada, USA'
      },
      {
        url: 'https://en.wikipedia.org/wiki/Greenbushes_lithium_mine',
        title: 'Greenbushes Lithium Mine',
        company: 'Talison Lithium',
        projectName: 'Greenbushes',
        type: 'Operating Mine',
        commodity: 'Lithium',
        location: 'Western Australia'
      },
      {
        url: 'https://www.mining-technology.com/projects/carolina-lithium-project-north-carolina/',
        title: 'Carolina Lithium Project',
        company: 'Piedmont Lithium',
        projectName: 'Carolina Lithium',
        type: 'Development Project',
        commodity: 'Lithium',
        location: 'North Carolina, USA'
      },
      {
        url: 'https://www.mining-technology.com/projects/kathleen-valley-lithium-project/',
        title: 'Kathleen Valley Lithium Project',
        company: 'Liontown Resources',
        projectName: 'Kathleen Valley',
        type: 'Construction Project',
        commodity: 'Lithium',
        location: 'Western Australia'
      },
      {
        url: 'https://www.mining-technology.com/projects/grota-do-cirilo-lithium-project/',
        title: 'Grota do Cirilo Lithium Project',
        company: 'Sigma Lithium',
        projectName: 'Grota do Cirilo',
        type: 'Production',
        commodity: 'Lithium',
        location: 'Minas Gerais, Brazil'
      },
      {
        url: 'https://en.wikipedia.org/wiki/Salar_de_Atacama',
        title: 'Salar de Atacama Lithium Operations',
        company: 'SQM / Albemarle',
        projectName: 'Salar de Atacama',
        type: 'Production',
        commodity: 'Lithium',
        location: 'Chile'
      }
    ]
    
    // Convert to Document format
    const documents: Document[] = miningProjects.map(project => ({
      url: project.url,
      title: `${project.company} - ${project.title}`,
      type: project.type,
      date: new Date().toISOString(),
      source: 'Mining Projects Database',
      metadata: {
        projectName: project.projectName,
        company: project.company,
        commodity: project.commodity,
        location: project.location
      }
    }))
    
    console.log(`Prepared ${documents.length} mining project documents for processing`)
    return documents
  }
} 