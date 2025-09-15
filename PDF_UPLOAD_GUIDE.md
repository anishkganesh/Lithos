# PDF Upload and Document Analysis Guide

## Overview
The Lithos AI chat now supports comprehensive PDF document analysis with automatic text extraction and intelligent summarization for long documents.

## Features

### 1. PDF Text Extraction
- **Full text extraction** from PDF documents
- Preserves document structure and formatting
- Extracts metadata (title, author, creation date, etc.)

### 2. Intelligent Summarization
- **Automatic summarization** for documents over 400 pages
- Preserves key information:
  - Project names and locations
  - Resource estimates and grades
  - Financial metrics and valuations
  - Technical specifications
  - Company information
  - Important dates and milestones

### 3. Document Types Supported
- **Mining Technical Reports** (NI 43-101, JORC, etc.)
- **Feasibility Studies**
- **Environmental Impact Assessments**
- **Financial Reports**
- **Geological Surveys**
- **Any text-based PDF document**

## How to Use

1. **Upload PDF**: Click the attachment button in the chat interface
2. **Select your PDF file**: Supports files up to 100MB
3. **Processing**:
   - Small PDFs (< 50 pages): Full text is extracted
   - Large PDFs (> 50 pages): Automatic summarization
   - Very large PDFs (> 400 pages): Multi-level summarization

4. **Ask Questions**: Once uploaded, you can ask specific questions about the document

## Example Questions

- "What are the key findings in this feasibility study?"
- "Summarize the resource estimates from this NI 43-101 report"
- "What are the environmental considerations mentioned?"
- "Extract all financial metrics and NPV calculations"
- "What are the main risks identified in this document?"

## Configuration

### API Key Setup
To use the enhanced gpt-5-nano model, add your AIMLAPI key to `.env.local`:

```bash
AIMLAPI_KEY=your_aimlapi_key_here
```

Get your API key from [AIMLAPI](https://aimlapi.com)

### Model Information
- **Model**: gpt-5-nano-2025-08-07
- **Provider**: AIMLAPI
- **Context Window**: Optimized for mining industry documents
- **Specialization**: Technical mining report analysis

## Technical Details

### PDF Processing Pipeline
1. **Upload**: File converted to base64
2. **Extraction**: pdf-parse library extracts text
3. **Analysis**: Document length assessment
4. **Summarization** (if needed): Multi-stage summarization for long documents
5. **Context Integration**: Processed content added to chat context
6. **AI Analysis**: gpt-5-nano processes the content

### Limitations
- **Image-only PDFs**: Cannot extract text from scanned documents without OCR
- **Password-protected PDFs**: Not supported
- **File size**: Recommended max 100MB
- **Processing time**: Large documents may take 10-30 seconds to process

## Best Practices

1. **Upload relevant sections**: For very large documents, consider uploading specific chapters
2. **Ask specific questions**: The more specific your question, the better the analysis
3. **Multiple documents**: You can upload up to 5 documents in a single chat session
4. **Cross-reference**: Upload multiple related documents for comparative analysis

## Troubleshooting

### "Cannot extract text from PDF"
- The PDF might be image-based (scanned)
- Try converting to text-based PDF first

### "Document too large"
- The summarization will handle it automatically
- For extremely large files (>100MB), consider splitting the PDF

### "Summary missing details"
- Ask follow-up questions about specific sections
- The AI retains the full context for detailed queries

## Support

For issues or questions about PDF upload functionality:
- Check the browser console for detailed error messages
- Ensure your AIMLAPI key is correctly configured
- Verify the PDF is not corrupted or password-protected
