import { Document } from '../document-processor'

export class TestScraper {
  async fetchLatestDocuments(): Promise<Document[]> {
    // Using a publicly accessible mining report for testing
    return [
      {
        url: 'https://www.lithiumamericas.com/thacker-pass/default.aspx',
        title: 'Lithium Americas - Thacker Pass Project',
        type: 'Web Page',
        date: new Date().toISOString(),
        source: 'TEST'
      }
    ]
  }
} 