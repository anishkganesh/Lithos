/**
 * Document Context Extraction Service
 * Intelligently extracts key information from technical reports for AI insights
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { MINING_METRICS, extractFinancialMetrics, validateDocumentMetrics } from '@/lib/mining-metrics-extractor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface ExtractedContext {
  hasDocuments: boolean;
  documentCount: number;
  keyFindings: string[];
  financialMetrics: Record<string, any>;
  executiveSummary: string | null;
  qualifiedPersons: Array<{ name: string; credentials: string; company: string }>;
  riskFactors: string[];
  technicalHighlights: string[];
  tokenCount: number;
}

/**
 * Extract key sections from document text using regex patterns
 */
function extractKeySections(text: string): {
  executiveSummary: string | null;
  financialMetrics: string[];
  riskFactors: string[];
  qualifiedPersons: string[];
  technicalHighlights: string[];
} {
  const sections = {
    executiveSummary: null as string | null,
    financialMetrics: [] as string[],
    riskFactors: [] as string[],
    qualifiedPersons: [] as string[],
    technicalHighlights: [] as string[]
  };

  // Extract Executive Summary (first ~2000 chars after heading)
  const execSummaryMatch = text.match(
    /(?:executive\s+summary|summary|highlights|overview)\s*[:.\n]+([\s\S]{100,2000}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/i
  );
  if (execSummaryMatch) {
    sections.executiveSummary = execSummaryMatch[1].trim();
  }

  // Extract financial metrics sections
  const financialPatterns = [
    /(?:financial|economic)\s+(?:results|analysis|summary|metrics)\s*[:.\n]+([\s\S]{100,800}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi,
    /(?:NPV|IRR|CAPEX|payback)\s+(?:analysis|summary)\s*[:.\n]+([\s\S]{100,500}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi,
    /base\s+case\s+(?:financial|economic)\s*[:.\n]+([\s\S]{100,800}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi
  ];

  for (const pattern of financialPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      sections.financialMetrics.push(match[1].trim());
    }
  }

  // Extract risk factors
  const riskPatterns = [
    /(?:risks?|risk\s+factors?)\s*[:.\n]+([\s\S]{100,800}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi,
    /(?:uncertainties|challenges)\s*[:.\n]+([\s\S]{100,500}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi
  ];

  for (const pattern of riskPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      sections.riskFactors.push(match[1].trim());
    }
  }

  // Extract qualified persons information
  const qpPatterns = [
    /qualified\s+persons?\s*[:.\n]+([\s\S]{50,500}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi,
    /(?:prepared|authored|reviewed)\s+by\s*[:.\n]*([\s\S]{50,300}?)(?:\n\s*\n)/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(?:P\.Eng\.|M\.Sc\.|Ph\.D\.|B\.Sc\.|Geo\.|P\.Geo\.|MAusIMM|MAIG|CEng)/g
  ];

  for (const pattern of qpPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      sections.qualifiedPersons.push(match[0].trim());
    }
  }

  // Extract technical highlights
  const technicalPatterns = [
    /(?:mineral\s+resource|ore\s+reserve|reserves?|resources?)\s+(?:estimate|statement)\s*[:.\n]+([\s\S]{100,600}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi,
    /(?:mining\s+method|processing|metallurgy)\s*[:.\n]+([\s\S]{100,500}?)(?:\n\s*\n|\n[A-Z][A-Z\s]+\n)/gi,
    /(?:grade|tonnage|throughput)\s*[:.\n]+([\s\S]{50,300}?)(?:\n\s*\n)/gi
  ];

  for (const pattern of technicalPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      sections.technicalHighlights.push(match[1].trim());
    }
  }

  return sections;
}

/**
 * Parse qualified persons from extracted text
 */
function parseQualifiedPersons(qpTexts: string[]): Array<{ name: string; credentials: string; company: string }> {
  const persons: Array<{ name: string; credentials: string; company: string }> = [];

  for (const text of qpTexts) {
    // Match: "John Smith, P.Eng., M.Sc., Company Name"
    const personMatch = text.match(
      /([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)+)\s*,?\s+((?:P\.Eng\.|M\.Sc\.|Ph\.D\.|B\.Sc\.|Geo\.|P\.Geo\.|MAusIMM|MAIG|CEng|,\s*)+)\s*(?:,\s*)?(.+)?/i
    );

    if (personMatch) {
      persons.push({
        name: personMatch[1].trim(),
        credentials: personMatch[2].replace(/,\s*$/, '').trim(),
        company: personMatch[3]?.trim() || 'Not specified'
      });
    }
  }

  return persons;
}

/**
 * Use OpenAI to summarize extracted sections into concise context
 */
async function summarizeWithOpenAI(sections: {
  executiveSummary: string | null;
  financialMetrics: string[];
  riskFactors: string[];
  technicalHighlights: string[];
}, maxTokens: number = 1500): Promise<{
  summary: string;
  keyFindings: string[];
}> {
  // Combine all sections
  const combinedText = [
    sections.executiveSummary ? `Executive Summary:\n${sections.executiveSummary}` : '',
    sections.financialMetrics.length > 0 ? `\nFinancial Metrics:\n${sections.financialMetrics.join('\n\n')}` : '',
    sections.technicalHighlights.length > 0 ? `\nTechnical Highlights:\n${sections.technicalHighlights.join('\n\n')}` : '',
    sections.riskFactors.length > 0 ? `\nRisk Factors:\n${sections.riskFactors.join('\n\n')}` : ''
  ].filter(Boolean).join('\n\n');

  if (!combinedText || combinedText.length < 100) {
    return { summary: '', keyFindings: [] };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a mining technical report analyzer. Extract the most critical information from the following document sections and provide:
1. A concise executive summary (2-3 paragraphs max)
2. 5-7 key findings as bullet points

Focus on: financial metrics, resource/reserve estimates, technical parameters, risks, and project stage.
Be specific with numbers and units. Keep the total response under ${maxTokens} tokens.`
        },
        {
          role: 'user',
          content: combinedText
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse the response to extract summary and key findings
    const summaryMatch = content.match(/(?:summary|overview)[\s\S]*?:\s*([\s\S]+?)(?:\n\n|key findings)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : content.split('\n\n')[0];

    // Extract bullet points
    const keyFindings = content
      .split('\n')
      .filter(line => line.match(/^[\s-•*]\s*[A-Z]/))
      .map(line => line.replace(/^[\s-•*]\s*/, '').trim())
      .filter(Boolean);

    return { summary, keyFindings };
  } catch (error) {
    console.error('OpenAI summarization error:', error);
    return { summary: '', keyFindings: [] };
  }
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Main function: Extract context from project's technical documents
 */
export async function extractDocumentContext(projectId: string): Promise<ExtractedContext> {
  try {
    // Fetch all documents for this project
    const { data: pdfHighlights, error: pdfError } = await supabase
      .from('pdf_highlights')
      .select('highlight_data, document_url')
      .eq('project_id', projectId);

    const { data: factsetDocs, error: factsetError } = await supabase
      .from('factset_documents')
      .select('storage_path, public_url, headline')
      .eq('project_id', projectId)
      .order('filing_date', { ascending: false })
      .limit(3); // Only get 3 most recent documents

    if (pdfError || factsetError) {
      console.error('Error fetching documents:', pdfError || factsetError);
    }

    const hasDocuments = (pdfHighlights && pdfHighlights.length > 0) ||
                        (factsetDocs && factsetDocs.length > 0);

    if (!hasDocuments) {
      return {
        hasDocuments: false,
        documentCount: 0,
        keyFindings: [],
        financialMetrics: {},
        executiveSummary: null,
        qualifiedPersons: [],
        riskFactors: [],
        technicalHighlights: [],
        tokenCount: 0
      };
    }

    // Combine text from all available documents
    let combinedText = '';

    // Add PDF highlights data
    if (pdfHighlights && pdfHighlights.length > 0) {
      for (const pdf of pdfHighlights) {
        if (pdf.highlight_data && typeof pdf.highlight_data === 'object') {
          const data = pdf.highlight_data as any;
          if (data.extractedText) {
            combinedText += data.extractedText + '\n\n';
          }
          if (data.highlights) {
            combinedText += JSON.stringify(data.highlights) + '\n\n';
          }
        }
      }
    }

    // For FactSet documents, we'd need to fetch the actual content
    // For now, we'll use the headline and metadata
    if (factsetDocs && factsetDocs.length > 0) {
      for (const doc of factsetDocs) {
        if (doc.headline) {
          combinedText += `Document: ${doc.headline}\n`;
        }
      }
    }

    // Limit combined text to prevent token overflow (max ~100k chars = ~25k tokens)
    if (combinedText.length > 100000) {
      combinedText = combinedText.substring(0, 100000);
    }

    // Extract key sections using regex
    const sections = extractKeySections(combinedText);

    // Extract financial metrics using existing extractor
    const financialMetrics = extractFinancialMetrics(combinedText);

    // Parse qualified persons
    const qualifiedPersons = parseQualifiedPersons(sections.qualifiedPersons);

    // Summarize with OpenAI to create concise context
    const { summary, keyFindings } = await summarizeWithOpenAI({
      executiveSummary: sections.executiveSummary,
      financialMetrics: sections.financialMetrics,
      riskFactors: sections.riskFactors,
      technicalHighlights: sections.technicalHighlights
    });

    // Calculate total token count for the final context
    const finalContext = `
${summary}

Key Findings:
${keyFindings.map(f => `- ${f}`).join('\n')}

Financial Metrics:
${JSON.stringify(financialMetrics, null, 2)}

Risk Factors:
${sections.riskFactors.slice(0, 2).join('\n\n')}

Technical Highlights:
${sections.technicalHighlights.slice(0, 3).join('\n\n')}
`;

    return {
      hasDocuments: true,
      documentCount: (pdfHighlights?.length || 0) + (factsetDocs?.length || 0),
      keyFindings,
      financialMetrics,
      executiveSummary: summary || sections.executiveSummary,
      qualifiedPersons,
      riskFactors: sections.riskFactors.slice(0, 3).map(r => r.substring(0, 200)),
      technicalHighlights: sections.technicalHighlights.slice(0, 3).map(t => t.substring(0, 200)),
      tokenCount: estimateTokens(finalContext)
    };

  } catch (error) {
    console.error('Error extracting document context:', error);
    return {
      hasDocuments: false,
      documentCount: 0,
      keyFindings: [],
      financialMetrics: {},
      executiveSummary: null,
      qualifiedPersons: [],
      riskFactors: [],
      technicalHighlights: [],
      tokenCount: 0
    };
  }
}

/**
 * Fetch recent news context for a project
 */
export async function extractNewsContext(projectId: string, limit: number = 5): Promise<{
  newsItems: Array<{
    headline: string;
    summary: string;
    publishedAt: string;
    sentiment?: string;
  }>;
  tokenCount: number;
}> {
  try {
    const { data: news, error } = await supabase
      .from('news')
      .select('headline, summary, published_at, sentiment')
      .contains('project_ids', [projectId])
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error || !news || news.length === 0) {
      return { newsItems: [], tokenCount: 0 };
    }

    const newsItems = news.map(item => ({
      headline: item.headline || '',
      summary: item.summary || '',
      publishedAt: item.published_at || '',
      sentiment: item.sentiment || undefined
    }));

    const newsText = newsItems
      .map(item => `${item.headline}\n${item.summary}`)
      .join('\n\n');

    return {
      newsItems,
      tokenCount: estimateTokens(newsText)
    };
  } catch (error) {
    console.error('Error fetching news context:', error);
    return { newsItems: [], tokenCount: 0 };
  }
}
