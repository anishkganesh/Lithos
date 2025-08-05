import { Document } from '../document-processor'

export class DemoScraper {
  async fetchLatestDocuments(): Promise<Document[]> {
    // Using more accessible URLs that Firecrawl should be able to scrape
    const documents: Document[] = [
      {
        url: 'https://example.com',
        title: 'Century Lithium - Clayton Valley Project Update',
        type: 'Project Update',
        date: '2025-01-19',
        source: 'Demo Mining News',
        metadata: {
          company: 'Century Lithium Corp',
          project: 'Clayton Valley Lithium Project',
          location: 'Nevada, USA',
          stage: 'Feasibility'
        }
      },
      {
        url: 'https://httpbin.org/html',
        title: 'Ioneer - Rhyolite Ridge Lithium-Boron Project',
        type: 'Development Update',
        date: '2025-01-18',
        source: 'Demo Mining News',
        metadata: {
          company: 'Ioneer Ltd',
          project: 'Rhyolite Ridge',
          location: 'Nevada, USA',
          stage: 'Development'
        }
      },
      {
        url: 'https://www.w3.org/TR/2003/REC-PNG-20031110/',
        title: 'Standard Lithium - Lanxess Project Progress',
        type: 'Technical Report',
        date: '2025-01-17',
        source: 'Demo Mining News',
        metadata: {
          company: 'Standard Lithium Ltd',
          project: 'Lanxess Project',
          location: 'Arkansas, USA',
          stage: 'Demonstration'
        }
      }
    ]
    
    console.log(`Prepared ${documents.length} demo documents for processing`)
    return documents
  }
} 