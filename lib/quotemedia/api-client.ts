/**
 * QuoteMedia API Client for fetching SEC EDGAR and SEDAR filings
 * Focuses on technical documentation including NI 43-101 reports
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com';
const WMID = '131706'; // Your WebMaster ID

interface EnterpriseTokenResponse {
  token: string;
  expiresAt?: string;
}

interface FilingDocument {
  filingId: string;
  symbol: string;
  companyName: string;
  cik?: string;
  issuerNumber?: string;
  formType: string;
  formDescription: string;
  formGroup: string;
  dateFiled: string;
  period?: string;
  htmlLink?: string;
  pdfLink?: string;
  docLink?: string;
  xlsLink?: string;
  pages?: number;
  fileSize?: string;
  country?: 'US' | 'CA';
  accessionNumber?: string;
}

interface CompanyFilingsResponse {
  copyright: string;
  count: number;
  totalCount: number;
  filings: {
    symbolstring: string;
    key: {
      symbol: string;
      exchange: string;
      cusip?: string;
      isin?: string;
    };
    equityinfo: {
      longname: string;
      shortname: string;
    };
    cik?: string;
    issuerNumber?: string;
    filing: FilingDocument[];
  };
}

export class QuoteMediaClient {
  private token: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private webservicePassword: string;

  constructor(webservicePassword: string) {
    this.webservicePassword = webservicePassword;
  }

  /**
   * Generate or retrieve cached enterprise token
   */
  private async getEnterpriseToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.token && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.token;
    }

    // Generate new token
    const response = await fetch(`${QUOTEMEDIA_BASE_URL}/auth/v0/enterprise/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wmId: parseInt(WMID),
        webservicePassword: this.webservicePassword,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate enterprise token: ${response.statusText}`);
    }

    const data = await response.json();
    // QuoteMedia returns token in a nested structure
    this.token = data.token || data.access_token || data.accessToken;

    // Set expiration to 30 days from now (conservative estimate)
    this.tokenExpiresAt = new Date();
    this.tokenExpiresAt.setDate(this.tokenExpiresAt.getDate() + 30);

    console.log('✅ Enterprise token generated successfully');
    return this.token;
  }

  /**
   * Fetch company filings with focus on technical reports
   */
  async getCompanyFilings(params: {
    symbol?: string;
    symbols?: string[];
    country?: 'US' | 'CA';
    form?: string;
    formGroup?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
    resultsPerPage?: number;
  }): Promise<FilingDocument[]> {
    const token = await this.getEnterpriseToken();

    // Build query parameters
    // Note: Cannot use symbol/symbols with country parameter
    const queryParams = new URLSearchParams({
      webmasterId: WMID,
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.page && { page: params.page.toString() }),
      ...(params.resultsPerPage && { resultsPerPage: params.resultsPerPage.toString() }),
    });

    // Either use symbol(s) OR country, not both
    if (params.symbol || params.symbols) {
      if (params.symbol) queryParams.append('symbol', params.symbol);
      if (params.symbols) queryParams.append('symbols', params.symbols.join(','));
    } else if (params.country) {
      queryParams.append('country', params.country);
    }

    // Add other filters
    if (params.form) queryParams.append('form', params.form);
    if (params.formGroup) queryParams.append('formGroup', params.formGroup);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const url = `${QUOTEMEDIA_BASE_URL}/data/getCompanyFilings.json?${queryParams}`;

    console.log(`📄 Fetching filings: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response: ${errorText}`);
      throw new Error(`Failed to fetch filings: ${response.statusText}`);
    }

    const responseText = await response.text();

    if (!responseText) {
      console.log('⚠️ Empty response from API');
      return [];
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText.substring(0, 200));
      return [];
    }

    const results = data.results;

    // Extract filing documents - handle the actual response structure
    const filings: FilingDocument[] = [];
    if (results?.filings?.filing) {
      const filingArray = Array.isArray(results.filings.filing)
        ? results.filings.filing
        : [results.filings.filing];

      for (const filing of filingArray) {
        // Each filing has its own key and equityinfo
        const symbol = filing.symbolstring || filing.key?.symbol || params.symbol || '';
        const companyName = filing.equityinfo?.longname ||
                           filing.equityinfo?.shortname ||
                           filing.key?.companyName || '';

        filings.push({
          filingId: filing.filingId || `${symbol}-${filing.datefiled}-${filing.formtype}`,
          symbol: symbol,
          companyName: companyName,
          cik: filing.cik,
          issuerNumber: filing.issuerNumber,
          formType: filing.formtype,
          formDescription: filing.formdescription,
          formGroup: filing.formgroup,
          dateFiled: filing.datefiled,
          period: filing.period,
          htmlLink: filing.htmllink,
          pdfLink: filing.pdflink,
          docLink: filing.doclink,
          xlsLink: filing.xlslink,
          pages: filing.pages,
          fileSize: filing.size,
          country: params.country,
          accessionNumber: filing.acc,
        });
      }
    }

    console.log(`✅ Fetched ${filings.length} filings`);
    return filings;
  }

  /**
   * Search for NI 43-101 technical reports (Canadian)
   */
  async getNI43101Reports(params: {
    symbol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<FilingDocument[]> {
    // NI 43-101 reports are typically filed under form group "3" (Continuous Disclosure) in SEDAR
    const filings = await this.getCompanyFilings({
      ...params,
      country: 'CA',
      formGroup: '3', // Continuous Disclosure
    });

    // Filter for NI 43-101 related documents
    const technicalReports = filings.filter(filing => {
      const formDesc = filing.formDescription.toLowerCase();
      const formType = filing.formType.toLowerCase();

      return (
        formDesc.includes('43-101') ||
        formDesc.includes('technical report') ||
        formDesc.includes('mineral') ||
        formDesc.includes('resource') ||
        formDesc.includes('reserve') ||
        formType.includes('43-101') ||
        formType.includes('technical')
      );
    });

    console.log(`🔍 Found ${technicalReports.length} NI 43-101 reports out of ${filings.length} filings`);
    return technicalReports;
  }

  /**
   * Search for US technical reports (10-K with mining focus)
   */
  async getUSTechnicalReports(params: {
    symbol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<FilingDocument[]> {
    // For US companies, technical reports are often in 10-K, 10-Q, 8-K
    const filings = await this.getCompanyFilings({
      ...params,
      country: 'US',
      form: '10-K,10-Q,8-K,20-F', // Annual, quarterly, current reports, foreign filers
    });

    // We'll need additional filtering based on content analysis
    // For now, return all these forms which may contain technical data
    console.log(`🔍 Found ${filings.length} potential US technical reports`);
    return filings;
  }

  /**
   * Download filing document content
   */
  async downloadFiling(link: string, type: 'HTML' | 'PDF' | 'DOC' | 'XLS' = 'PDF'): Promise<Buffer> {
    const token = await this.getEnterpriseToken();

    // Add attachment flag for direct download
    const downloadUrl = type === 'PDF' ? `${link}&attached=true` : link;

    console.log(`📥 Downloading ${type} document: ${downloadUrl}`);

    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download filing: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    console.log(`✅ Downloaded ${type} document (${buffer.byteLength} bytes)`);

    return Buffer.from(buffer);
  }
}

/**
 * Technical document types we're interested in
 */
export const TECHNICAL_FORM_TYPES = {
  CANADA: [
    'NI 43-101',
    'Technical Report',
    'Mineral Resource',
    'Feasibility Study',
    'Preliminary Economic Assessment',
    'Resource Estimate',
    'Reserve Estimate',
  ],
  US: [
    '10-K',
    '10-Q',
    '8-K',
    '20-F',
    'S-1',
    'Technical Report Summary',
  ],
};

/**
 * Helper to determine if a filing is a technical document
 */
export function isTechnicalDocument(filing: FilingDocument): boolean {
  const formDesc = filing.formDescription.toLowerCase();
  const formType = filing.formType.toLowerCase();

  // Check for Canadian technical report keywords
  const canadianKeywords = [
    '43-101',
    'technical report',
    'mineral resource',
    'mineral reserve',
    'feasibility',
    'preliminary economic assessment',
    'pea',
    'resource estimate',
    'reserve estimate',
  ];

  // Check for US technical report keywords
  const usKeywords = [
    'mineral',
    'mining',
    'resource',
    'reserve',
    'technical report',
    'property',
    'exploration',
  ];

  const keywords = filing.country === 'CA' ? canadianKeywords : usKeywords;

  return keywords.some(keyword =>
    formDesc.includes(keyword) || formType.includes(keyword)
  );
}