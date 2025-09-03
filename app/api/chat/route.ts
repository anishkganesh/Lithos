import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Dynamic import for pdf-parse to avoid issues
let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.warn('pdf-parse not available:', error);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

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
        
        // Create a mining-focused prompt
        const miningPrompt = `Create a professional mining industry visualization: ${lastMessage}. 
        The image should be technical, accurate, and suitable for mining industry presentations.
        Focus on realistic depictions of mining operations, geological features, equipment, or data visualizations.`;
        
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: miningPrompt,
          n: 1,
          size: "1024x1024",
        });
        
        // Get the image URL from the response
        const imageUrl = response.data?.[0]?.url;
        
        if (!imageUrl) {
          throw new Error("Failed to generate image: No URL returned");
        }
        
        // Create the response object
        const responseBody = {
          id: Date.now().toString(),
          role: "assistant",
          content: `![Generated image](${imageUrl})`,
          createdAt: new Date()
        };
        
        console.log("Image response:", JSON.stringify(responseBody));
        
        // Return the response
        return NextResponse.json(responseBody);
      } catch (error) {
        console.error("Image generation error:", error);
        return NextResponse.json({
          id: Date.now().toString(),
          role: "assistant",
          content: "I'm sorry, I couldn't generate that image. Please try a different prompt.",
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
        content: `You are Lithos AI, an expert mining industry assistant with real-time web search capabilities. You specialize in:

- Mining project analysis and discovery
- Commodity market trends and pricing
- Technical mining reports and feasibility studies (NI 43-101, JORC, etc.)
- Environmental and ESG considerations in mining
- Geological and resource estimation
- Mining finance and investment analysis

You can search the web for current mining news, analyze technical documents and spreadsheets, generate mining-related visualizations, and provide up-to-date industry insights. When web search is enabled, you have access to current information from mining news sites, technical report databases (SEDAR, EDGAR), commodity exchanges, and industry sources.

Always provide data-driven insights and cite sources when available. Focus on accuracy and technical precision while remaining accessible.`
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
          // For image files, add to messages with vision
          finalMessages.push({
            role: 'system',
            content: `Image file: ${file.fileName} - Analyze this for mining-related content, geological features, equipment, or data visualizations.`
          });
          
          finalMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: `Analyze this image (${file.fileName}):` },
              { type: 'image_url', image_url: { url: file.fileContent } }
            ]
          });
        } else if (file.fileType === 'application/pdf') {
          // Extract text from PDF
          try {
            // Remove the data:application/pdf;base64, prefix
            const base64Data = file.fileContent.split(',')[1];
            const pdfBuffer = Buffer.from(base64Data, 'base64');
            
            // Parse the PDF if library is available
            if (!pdfParse) {
              throw new Error('PDF parsing library not available');
            }
            const data = await pdfParse(pdfBuffer);
            
            // Add the extracted text with mining-specific context
            fileAnalysisPrompt += `PDF Document "${file.fileName}" (likely a mining technical report - NI 43-101, JORC, feasibility study, etc.):\n\n`;
            fileAnalysisPrompt += `Metadata:\n`;
            fileAnalysisPrompt += `- Pages: ${data.numpages}\n`;
            fileAnalysisPrompt += `- Title: ${data.info?.Title || 'N/A'}\n`;
            fileAnalysisPrompt += `- Author: ${data.info?.Author || 'N/A'}\n`;
            fileAnalysisPrompt += `- Subject: ${data.info?.Subject || 'N/A'}\n`;
            fileAnalysisPrompt += `- Creation Date: ${data.info?.CreationDate || 'N/A'}\n\n`;
            fileAnalysisPrompt += `Content (extracted text):\n\`\`\`\n${data.text.substring(0, 10000)}${data.text.length > 10000 ? '\n... (truncated to first 10,000 characters)' : ''}\n\`\`\`\n\n`;
            
            finalMessages.push({
              role: 'system',
              content: `PDF Document uploaded: ${file.fileName}. This appears to be a technical mining document with ${data.numpages} pages. Focus on extracting key mining project information such as resource estimates, project economics, metallurgy, and risk factors.`
            });
          } catch (error) {
            console.error('Error parsing PDF:', error);
            fileAnalysisPrompt += `PDF File "${file.fileName}": [Error extracting PDF content: ${error}]\n\n`;
            finalMessages.push({
              role: 'system',
              content: `PDF Document: ${file.fileName}. Unable to extract text content. The document may be image-based or corrupted.`
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
        } else if (file.fileType === 'text/csv' || file.fileName.endsWith('.csv') || 
                   file.fileType.includes('sheet') || file.fileName.endsWith('.xlsx')) {
          // Handle CSV and Excel files (common for mining data)
          let csvContent = file.fileContent;
          // If it's base64 encoded, decode it
          if (file.fileContent.includes('base64,')) {
            const base64Data = file.fileContent.split(',')[1];
            csvContent = Buffer.from(base64Data, 'base64').toString('utf-8');
          }
          
          if (file.fileName.endsWith('.xlsx')) {
            fileAnalysisPrompt += `Excel File "${file.fileName}": [Excel parsing will be implemented - for mining data, please export as CSV]\n\n`;
          } else {
            // Parse CSV
            const lines = csvContent.split('\n').filter((line: string) => line.trim());
            const headers = lines[0]?.split(',').map((h: string) => h.trim());
            
            fileAnalysisPrompt += `CSV File "${file.fileName}" (likely contains mining project data, assay results, or financial models):\n`;
            fileAnalysisPrompt += `Headers: ${headers?.join(', ') || 'No headers found'}\n`;
            fileAnalysisPrompt += `Total rows: ${lines.length - 1}\n`;
            fileAnalysisPrompt += `Sample data (first 10 rows):\n\`\`\`\n${lines.slice(0, 11).join('\n')}\n\`\`\`\n\n`;
          }
        } else {
          // For other text files
          let textContent = file.fileContent;
          // If it's base64 encoded, decode it
          if (file.fileContent.includes('base64,')) {
            const base64Data = file.fileContent.split(',')[1];
            textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
          }
          
          fileAnalysisPrompt += `Text File "${file.fileName}":\n\`\`\`\n${textContent.substring(0, 3000)}${textContent.length > 3000 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`;
        }
      }
      
      // Add the file analysis prompt if we have non-image files
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
    
    console.log("Sending OpenAI request with message count:", finalMessages.length);
    
    // Use GPT-4o for all requests (it has vision capabilities)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: finalMessages.map(m => {
        // Handle special case for images
        if (m.content && typeof m.content !== 'string') {
          return { role: m.role, content: m.content };
        }
        return { role: m.role, content: m.content };
      }),
      stream: false,
      max_tokens: 4096,
      temperature: 0.7,
    });
    
    const content = response.choices[0]?.message?.content || "No response generated";
    console.log("OpenAI response received, content length:", content.length);
    
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