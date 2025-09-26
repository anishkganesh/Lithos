/**
 * Document processor for extracting and storing technical documents from QuoteMedia
 */

import { createClient } from '@supabase/supabase-js';
import { QuoteMediaClient, isTechnicalDocument } from './api-client';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessingOptions {
  symbols?: string[];
  startDate?: string;
  endDate?: string;
  countries?: ('US' | 'CA')[];
  limit?: number;
  downloadPDFs?: boolean;
  forceReprocess?: boolean;
}

interface ProcessingResult {
  totalProcessed: number;
  technicalReports: number;
  errors: string[];
  newDocuments: number;
  updatedDocuments: number;
}

export class TechnicalDocumentProcessor {
  private client: QuoteMediaClient;

  constructor(webservicePassword: string) {
    this.client = new QuoteMediaClient(webservicePassword);
  }

  /**
   * Main processing pipeline
   */
  async processDocuments(options: ProcessingOptions): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      totalProcessed: 0,
      technicalReports: 0,
      errors: [],
      newDocuments: 0,
      updatedDocuments: 0,
    };

    const countries = options.countries || ['US', 'CA'];

    for (const country of countries) {
      console.log(`\n🌍 Processing ${country} documents...`);

      try {
        const documents = await this.fetchDocuments({
          ...options,
          country,
        });

        for (const doc of documents) {
          try {
            const processed = await this.processDocument(doc, {
              downloadPDF: options.downloadPDFs || false,
              forceReprocess: options.forceReprocess || false,
            });

            result.totalProcessed++;
            if (processed.isTechnical) result.technicalReports++;
            if (processed.isNew) result.newDocuments++;
            else if (processed.isUpdated) result.updatedDocuments++;

          } catch (error) {
            const errorMsg = `Error processing ${doc.filingId}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Error fetching ${country} documents: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    return result;
  }

  /**
   * Fetch documents from QuoteMedia
   */
  private async fetchDocuments(options: {
    symbols?: string[];
    startDate?: string;
    endDate?: string;
    country: 'US' | 'CA';
    limit?: number;
  }) {
    const { symbols, startDate, endDate, country, limit } = options;

    if (symbols && symbols.length > 0) {
      // Fetch for specific symbols
      const allDocuments = [];
      for (const symbol of symbols) {
        const docs = await this.client.getCompanyFilings({
          symbol,
          country,
          startDate,
          endDate,
          limit: limit || 100,
        });
        allDocuments.push(...docs);
      }
      return allDocuments;
    } else {
      // Fetch all documents for the country
      if (country === 'CA') {
        // For Canada, focus on NI 43-101 reports
        return await this.client.getNI43101Reports({
          startDate,
          endDate,
          limit: limit || 250,
        });
      } else {
        // For US, get technical forms
        return await this.client.getUSTechnicalReports({
          startDate,
          endDate,
          limit: limit || 250,
        });
      }
    }
  }

  /**
   * Process individual document
   */
  private async processDocument(
    doc: any,
    options: { downloadPDF: boolean; forceReprocess: boolean }
  ): Promise<{ isTechnical: boolean; isNew: boolean; isUpdated: boolean }> {
    // Check if document already exists
    const { data: existing } = await supabase
      .from('edgar_technical_documents')
      .select('*')
      .eq('filing_id', doc.filingId)
      .single();

    if (existing && !options.forceReprocess) {
      console.log(`⏭️  Skipping existing document: ${doc.filingId}`);
      return { isTechnical: existing.is_technical_report, isNew: false, isUpdated: false };
    }

    // Determine if this is a technical document
    const isTechnical = isTechnicalDocument(doc);

    // Extract metadata
    const metadata = this.extractMetadata(doc);

    // Prepare document record
    const documentRecord = {
      filing_id: doc.filingId,
      accession_number: doc.accessionNumber || null,
      symbol: doc.symbol,
      company_name: doc.companyName,
      cik: doc.cik || null,
      issuer_number: doc.issuerNumber || null,
      cusip: doc.cusip || null,
      isin: doc.isin || null,
      form_type: doc.formType,
      form_description: doc.formDescription,
      form_group: doc.formGroup,
      country: doc.country,
      date_filed: doc.dateFiled,
      period_date: doc.period || null,
      html_link: doc.htmlLink || null,
      pdf_link: doc.pdfLink || null,
      doc_link: doc.docLink || null,
      xls_link: doc.xlsLink || null,
      xbrl_link: doc.xbrlLink || null,
      file_size: doc.fileSize || null,
      page_count: doc.pages || null,
      is_technical_report: isTechnical,
      report_type: metadata.reportType,
      project_name: metadata.projectName,
      project_location: metadata.projectLocation,
      commodity_types: metadata.commodities,
      content_summary: metadata.summary,
      processing_status: 'pending',
      metadata: metadata.additional,
    };

    // Download PDF if requested and it's a technical report
    if (options.downloadPDF && isTechnical && doc.pdfLink) {
      try {
        const pdfBuffer = await this.client.downloadFiling(doc.pdfLink, 'PDF');
        const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

        // Store PDF (you would implement actual storage here)
        documentRecord.pdf_stored = true;
        documentRecord.pdf_hash = pdfHash;
        // documentRecord.pdf_storage_path = await this.storePDF(pdfBuffer, doc.filingId);

        console.log(`📄 Downloaded PDF for ${doc.filingId} (${pdfBuffer.length} bytes)`);
      } catch (error) {
        console.error(`Failed to download PDF for ${doc.filingId}:`, error);
      }
    }

    // Insert or update in database
    if (existing) {
      const { error } = await supabase
        .from('edgar_technical_documents')
        .update(documentRecord)
        .eq('filing_id', doc.filingId);

      if (error) throw error;

      console.log(`✅ Updated ${isTechnical ? 'technical' : 'regular'} document: ${doc.symbol} - ${doc.formType} (${doc.dateFiled})`);
      return { isTechnical, isNew: false, isUpdated: true };
    } else {
      const { error } = await supabase
        .from('edgar_technical_documents')
        .insert(documentRecord);

      if (error) throw error;

      console.log(`✅ Inserted ${isTechnical ? 'technical' : 'regular'} document: ${doc.symbol} - ${doc.formType} (${doc.dateFiled})`);
      return { isTechnical, isNew: true, isUpdated: false };
    }
  }

  /**
   * Extract metadata from document
   */
  private extractMetadata(doc: any): {
    reportType: string | null;
    projectName: string | null;
    projectLocation: string | null;
    commodities: string[];
    summary: string | null;
    additional: any;
  } {
    const formDesc = (doc.formDescription || '').toLowerCase();
    const formType = (doc.formType || '').toLowerCase();

    // Determine report type
    let reportType = null;
    if (formDesc.includes('43-101') || formType.includes('43-101')) {
      reportType = 'NI 43-101';
    } else if (formDesc.includes('technical report')) {
      reportType = 'Technical Report';
    } else if (formDesc.includes('feasibility')) {
      reportType = 'Feasibility Study';
    } else if (formDesc.includes('preliminary economic assessment') || formDesc.includes('pea')) {
      reportType = 'PEA';
    } else if (formDesc.includes('resource')) {
      reportType = 'Resource Estimate';
    } else if (formDesc.includes('reserve')) {
      reportType = 'Reserve Estimate';
    }

    // Extract commodities (basic keyword search)
    const commodityKeywords = [
      'gold', 'silver', 'copper', 'zinc', 'lead', 'nickel',
      'cobalt', 'lithium', 'uranium', 'platinum', 'palladium',
      'iron', 'coal', 'potash', 'phosphate', 'rare earth',
      'molybdenum', 'tin', 'tungsten', 'vanadium', 'graphite',
    ];

    const foundCommodities = commodityKeywords.filter(commodity =>
      formDesc.includes(commodity) || (doc.companyName || '').toLowerCase().includes(commodity)
    );

    // Create summary
    const summary = `${doc.formType}: ${doc.formDescription} filed on ${doc.dateFiled}`;

    return {
      reportType,
      projectName: null, // Would need content analysis
      projectLocation: null, // Would need content analysis
      commodities: foundCommodities,
      summary,
      additional: {
        formType: doc.formType,
        formGroup: doc.formGroup,
        filer: doc.filer,
      },
    };
  }
}