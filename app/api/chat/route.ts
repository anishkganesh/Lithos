import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import pdf from 'pdf-parse'

// AIMLAPI configuration for gpt-5-nano
const AIMLAPI_KEY = process.env.AIMLAPI_KEY || process.env.OPENAI_API_KEY // Fallback to OpenAI key if AIMLAPI not set
const AIMLAPI_URL = 'https://api.aimlapi.com/v1/chat/completions'
const MODEL = 'openai/gpt-5-nano-2025-08-07'

// Helper function to call AIMLAPI
async function callAIMLAPI(messages: any[], maxTokens: number = 4096, temperature: number = 0.7) {
  const response = await fetch(AIMLAPI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIMLAPI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AIMLAPI Error:', errorText);
    throw new Error(`AIMLAPI request failed: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Helper function to summarize long text
async function summarizeText(text: string, maxLength: number = 8000): Promise<string> {
  // If text is short enough, return as is
  if (text.length <= maxLength) {
    return text;
  }

  // Split text into chunks for summarization
  const chunkSize = 30000; // Process in 30k character chunks
  const chunks: string[] = [];
  
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  console.log(`Summarizing ${chunks.length} chunks of text`);

  // Summarize each chunk
  const summaries: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const messages = [
      {
        role: 'system',
        content: 'You are an expert at summarizing technical mining documents. Extract and preserve all key information including: project names, locations, commodity types, resource estimates, grades, financial metrics, dates, company names, and technical specifications.'
      },
      {
        role: 'user',
        content: `Please provide a detailed summary of this section (part ${i + 1} of ${chunks.length}) of a mining document. Preserve all important technical details, numbers, and names:\n\n${chunk}`
      }
    ];

    try {
      const response = await callAIMLAPI(messages, 2000, 0.3);
      summaries.push(response.choices[0]?.message?.content || '');
    } catch (error) {
      console.error(`Error summarizing chunk ${i + 1}:`, error);
      summaries.push(`[Error summarizing chunk ${i + 1}]`);
    }
  }

  // If we have multiple summaries, combine them
  if (summaries.length > 1) {
    const combinedSummary = summaries.join('\n\n---\n\n');
    
    // If combined summary is still too long, do a final summarization
    if (combinedSummary.length > maxLength) {
      const finalMessages = [
        {
          role: 'system',
          content: 'You are an expert at consolidating mining document summaries. Create a comprehensive summary that preserves all critical information.'
        },
        {
          role: 'user',
          content: `Please consolidate these section summaries into one comprehensive summary. Preserve all key project details, technical specifications, and financial metrics:\n\n${combinedSummary}`
        }
      ];

      try {
        const response = await callAIMLAPI(finalMessages, 3000, 0.3);
        return response.choices[0]?.message?.content || combinedSummary;
      } catch (error) {
        console.error('Error creating final summary:', error);
        return combinedSummary.slice(0, maxLength);
      }
    }
    
    return combinedSummary;
  }

  return summaries[0] || text.slice(0, maxLength);
}

// Helper function to extract text from PDF
async function extractPDFText(base64Data: string): Promise<{ text: string; pageCount: number; metadata: any }> {
  try {
    // Remove the data URL prefix if present
    const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const pdfBuffer = Buffer.from(base64Clean, 'base64');
    
    // Extract text using pdf-parse
    const data = await pdf(pdfBuffer);
    
    return {
      text: data.text,
      pageCount: data.numpages,
      metadata: {
        title: data.info?.Title || 'N/A',
        author: data.info?.Author || 'N/A',
        subject: data.info?.Subject || 'N/A',
        creator: data.info?.Creator || 'N/A',
        producer: data.info?.Producer || 'N/A',
        creationDate: data.info?.CreationDate || 'N/A',
        modificationDate: data.info?.ModDate || 'N/A'
      }
    };
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  console.log("Chat API called");

  try {
    const body = await req.json();
    console.log("Request type:", body.tool ? body.tool : "chat", "Request body:", JSON.stringify(body).substring(0, 200) + "...");
    
    const { messages, tool, webSearch, fileContents } = body;
    
    // Handle image generation request
    if (tool === 'image') {
      try {
        console.log("Processing image generation request");
        const lastMessage = messages[messages.length - 1].content;
        
        // For image generation, we'll use a different endpoint or fallback
        // Since gpt-5-nano doesn't support image generation, we'll return a message
        return NextResponse.json({
          id: Date.now().toString(),
          role: "assistant",
          content: "Image generation is not available with the current model. Please describe what you'd like to visualize and I can provide detailed descriptions or data instead.",
          createdAt: new Date()
        });
      } catch (error) {
        console.error("Image generation error:", error);
        return NextResponse.json({
          id: Date.now().toString(),
          role: "assistant",
          content: "I'm sorry, I couldn't generate that image. Please try a different request.",
          createdAt: new Date()
        });
      }
    }
    
    // Add system message if it doesn't exist
    const systemMessageExists = messages.some((m: { role: string }) => m.role === 'system');
    const finalMessages = [...messages];
    
    if (!systemMessageExists) {
      finalMessages.unshift({
        role: 'system',
        content: `You are Lithos AI, an expert mining industry assistant with real-time capabilities. You specialize in:

- Mining project analysis and discovery
- Commodity market trends and pricing
- Technical mining reports and feasibility studies (NI 43-101, JORC, etc.)
- Environmental and ESG considerations in mining
- Geological and resource estimation
- Mining finance and investment analysis
- PDF document analysis and summarization

You can analyze technical documents, spreadsheets, and PDFs including lengthy technical reports. When analyzing documents, you extract key information such as project details, resource estimates, financial metrics, and technical specifications.

Always provide data-driven insights and cite specific details from uploaded documents when available. Focus on accuracy and technical precision while remaining accessible.`
      });
    }
    
    // Add file content to the messages if provided
    if (fileContents && fileContents.length > 0) {
      console.log(`Processing ${fileContents.length} files`);
      
      let fileAnalysisPrompt = 'The user has uploaded the following files:\n\n';
      
      for (const file of fileContents) {
        if (!file) continue;
        
        console.log("Processing file:", file.fileName, "type:", file.fileType);
        
        if (file.fileType && file.fileType.startsWith('image/')) {
          // For image files, we'll add a description since gpt-5-nano doesn't have vision
          finalMessages.push({
            role: 'system',
            content: `Image file uploaded: ${file.fileName}. Note: Image analysis is not available with the current model. Please ask the user to describe the image content or provide text-based information instead.`
          });
        } else if (file.fileType === 'application/pdf') {
          // Extract text from PDF
          try {
            console.log(`Extracting text from PDF: ${file.fileName}`);
            const pdfData = await extractPDFText(file.fileContent);
            
            console.log(`PDF has ${pdfData.pageCount} pages and ${pdfData.text.length} characters`);
            
            // Add metadata
            fileAnalysisPrompt += `\n### PDF Document: "${file.fileName}"\n`;
            fileAnalysisPrompt += `**Metadata:**\n`;
            fileAnalysisPrompt += `- Pages: ${pdfData.pageCount}\n`;
            fileAnalysisPrompt += `- Title: ${pdfData.metadata.title}\n`;
            fileAnalysisPrompt += `- Author: ${pdfData.metadata.author}\n`;
            fileAnalysisPrompt += `- Subject: ${pdfData.metadata.subject}\n\n`;
            
            // Handle long PDFs (e.g., 400+ pages)
            if (pdfData.text.length > 50000) {
              console.log('PDF is very long, summarizing...');
              fileAnalysisPrompt += `**Document Summary** (Original: ${pdfData.text.length} characters):\n\n`;
              
              const summary = await summarizeText(pdfData.text, 10000);
              fileAnalysisPrompt += summary;
              
              finalMessages.push({
                role: 'system',
                content: `Large PDF document "${file.fileName}" (${pdfData.pageCount} pages) has been processed and summarized. The summary preserves key technical details, project information, and financial metrics. Use this summary to answer questions about the document.`
              });
            } else {
              // For shorter PDFs, include the full text
              fileAnalysisPrompt += `**Full Document Content:**\n\n${pdfData.text}\n\n`;
              
              finalMessages.push({
                role: 'system',
                content: `PDF document "${file.fileName}" (${pdfData.pageCount} pages) has been fully extracted and is available for analysis.`
              });
            }
          } catch (error) {
            console.error('Error processing PDF:', error);
            fileAnalysisPrompt += `PDF File "${file.fileName}": [Error extracting text: ${error}]\n\n`;
            finalMessages.push({
              role: 'system',
              content: `PDF Document: ${file.fileName}. Unable to extract text from the PDF. The document may be corrupted, password-protected, or contain only images.`
            });
          }
        } else if (file.fileType === 'application/json' || file.fileName.endsWith('.json')) {
          // Parse JSON files
          try {
            let jsonContent = file.fileContent;
            // If it's base64 encoded, decode it
            if (file.fileContent.includes('base64,')) {
              const base64Data = file.fileContent.split(',')[1];
              jsonContent = Buffer.from(base64Data, 'base64').toString('utf-8');
            }
            
            const jsonData = JSON.parse(jsonContent);
            fileAnalysisPrompt += `JSON File "${file.fileName}":\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\`\n\n`;
          } catch (e) {
            fileAnalysisPrompt += `JSON File "${file.fileName}": [Error parsing JSON: ${e}]\n\n`;
          }
        } else if (file.fileType === 'text/csv' || file.fileName.endsWith('.csv')) {
          // Handle CSV files
          let csvContent = file.fileContent;
          // If it's base64 encoded, decode it
          if (file.fileContent.includes('base64,')) {
            const base64Data = file.fileContent.split(',')[1];
            csvContent = Buffer.from(base64Data, 'base64').toString('utf-8');
          }
          
          // Parse CSV
          const lines = csvContent.split('\n').filter((line: string) => line.trim());
          const headers = lines[0]?.split(',').map((h: string) => h.trim());
          
          fileAnalysisPrompt += `CSV File "${file.fileName}" (mining data/assay results/financial model):\n`;
          fileAnalysisPrompt += `Headers: ${headers?.join(', ') || 'No headers found'}\n`;
          fileAnalysisPrompt += `Total rows: ${lines.length - 1}\n`;
          
          // Include more rows for analysis
          const sampleSize = Math.min(50, lines.length);
          fileAnalysisPrompt += `Sample data (first ${sampleSize} rows):\n\`\`\`\n${lines.slice(0, sampleSize).join('\n')}\n\`\`\`\n\n`;
        } else {
          // For other text files
          let textContent = file.fileContent;
          // If it's base64 encoded, decode it
          if (file.fileContent.includes('base64,')) {
            const base64Data = file.fileContent.split(',')[1];
            textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
          }
          
          // For long text files, summarize if needed
          if (textContent.length > 10000) {
            const summary = await summarizeText(textContent, 5000);
            fileAnalysisPrompt += `Text File "${file.fileName}" (summarized from ${textContent.length} characters):\n\`\`\`\n${summary}\n\`\`\`\n\n`;
          } else {
            fileAnalysisPrompt += `Text File "${file.fileName}":\n\`\`\`\n${textContent}\n\`\`\`\n\n`;
          }
        }
      }
      
      // Add the file analysis prompt if we have content
      if (fileAnalysisPrompt !== 'The user has uploaded the following files:\n\n') {
        finalMessages.push({
          role: 'system',
          content: fileAnalysisPrompt
        });
      }
    }
    
    // Add web search results to the messages if requested
    if (webSearch && webSearch.results) {
      console.log("Processing web search results");
      const formattedResults = webSearch.results.map((result: any, index: number) => 
        `${index + 1}. ${result.title}\n   ${result.snippet}\n   Link: ${result.link || '#'}`
      ).join('\n\n');
      
      finalMessages.push({
        role: 'system',
        content: `Here are web search results related to mining and the user's query:\n\n${formattedResults}\n\nPlease use these search results to provide a comprehensive answer with current information about mining projects, commodity prices, technical reports, or industry news.`
      });
    }
    
    console.log("Sending AIMLAPI request with message count:", finalMessages.length);
    
    // Call AIMLAPI with gpt-5-nano
    const response = await callAIMLAPI(
      finalMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      })),
      4096,
      0.7
    );
    
    const content = response.choices[0]?.message?.content || "No response generated";
    console.log("AIMLAPI response received, content length:", content.length);
    
    // Create the response object
    const responseBody = {
      id: Date.now().toString(),
      role: "assistant",
      content: content,
      createdAt: new Date()
    };
    
    console.log("Sending response:", JSON.stringify(responseBody).substring(0, 200) + "...");
    
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Chat error:", error);
    
    // Return an error response
    return NextResponse.json({
      id: Date.now().toString(),
      role: "assistant", 
      content: "I'm sorry, there was an error processing your request. Please try again later.",
      createdAt: new Date()
    }, { status: 500 });
  }
}