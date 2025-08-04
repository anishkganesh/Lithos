import axios from 'axios'
import { Document } from '../document-processor'

export class EDGARScraper {
  private baseUrl = 'https://www.sec.gov/edgar'
  
  async fetchLatestDocuments(): Promise<Document[]> {
    try {
      // For demo purposes, return sample documents
      // In production, this would query the EDGAR API for EX-96.1 exhibits
      const sampleDocuments: Document[] = [
        {
          url: 'https://www.sec.gov/Archives/edgar/data/1234567/000123456721000001/ex961_techreport.htm',
          title: 'Nevada Copper Corp - Technical Report Summary',
          type: 'SK-1300',
          date: new Date().toISOString(),
          source: 'EDGAR'
        }
      ]
      
      return sampleDocuments
    } catch (error) {
      console.error('EDGAR scraping error:', error)
      return []
    }
  }
} 