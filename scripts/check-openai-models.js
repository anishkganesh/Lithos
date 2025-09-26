#!/usr/bin/env node

const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function checkModels() {
  console.log('🤖 Available OpenAI Models for Document Processing\n');
  console.log('=' + '='.repeat(60) + '\n');

  // Key models for our use case
  const relevantModels = [
    {
      id: 'gpt-4o',
      context: '128K',
      description: 'Latest multimodal model, fast and accurate',
      cost: '$2.50/$10 per 1M tokens'
    },
    {
      id: 'gpt-4o-2024-11-20',
      context: '128K',
      description: 'Latest GPT-4o with improved accuracy',
      cost: '$2.50/$10 per 1M tokens'
    },
    {
      id: 'gpt-4o-mini',
      context: '128K',
      description: 'Smaller, faster, cheaper version',
      cost: '$0.15/$0.60 per 1M tokens'
    },
    {
      id: 'gpt-4-turbo',
      context: '128K',
      description: 'Previous generation, still very capable',
      cost: '$10/$30 per 1M tokens'
    },
    {
      id: 'gpt-4-turbo-preview',
      context: '128K',
      description: 'Preview version of GPT-4 Turbo',
      cost: '$10/$30 per 1M tokens'
    },
    {
      id: 'o1-preview',
      context: '128K',
      description: 'Advanced reasoning model (beta)',
      cost: '$15/$60 per 1M tokens'
    },
    {
      id: 'o1-mini',
      context: '128K',
      description: 'Smaller reasoning model (beta)',
      cost: '$3/$12 per 1M tokens'
    }
  ];

  console.log('📊 BEST OPTIONS FOR TECHNICAL DOCUMENT EXTRACTION:\n');

  console.log('1️⃣  GPT-4o-mini (FASTEST & CHEAPEST)');
  console.log('   - Context: 128K tokens (~100K words)');
  console.log('   - Speed: Very fast');
  console.log('   - Cost: $0.15 per 1M input tokens');
  console.log('   - Best for: High-volume processing where speed matters');
  console.log('   - Accuracy: Good for structured extraction\n');

  console.log('2️⃣  GPT-4o (BALANCED - Currently Using)');
  console.log('   - Context: 128K tokens');
  console.log('   - Speed: Fast');
  console.log('   - Cost: $2.50 per 1M input tokens');
  console.log('   - Best for: Balance of accuracy and speed');
  console.log('   - Accuracy: Excellent\n');

  console.log('3️⃣  o1-mini (BEST FOR COMPLEX REASONING)');
  console.log('   - Context: 128K tokens');
  console.log('   - Speed: Moderate');
  console.log('   - Cost: $3 per 1M input tokens');
  console.log('   - Best for: Complex financial calculations');
  console.log('   - Accuracy: Superior reasoning capabilities\n');

  console.log('4️⃣  o1-preview (MOST ADVANCED)');
  console.log('   - Context: 128K tokens');
  console.log('   - Speed: Slower');
  console.log('   - Cost: $15 per 1M input tokens');
  console.log('   - Best for: Most complex extraction tasks');
  console.log('   - Accuracy: State-of-the-art reasoning\n');

  console.log('💡 RECOMMENDATION FOR YOUR USE CASE:');
  console.log('=' + '='.repeat(60));

  console.log('\nFor 7,160 documents with ~50K chars each:');
  console.log('- Total tokens: ~70M tokens');
  console.log('\nCost estimates:');
  console.log('- GPT-4o-mini: ~$10.50 total');
  console.log('- GPT-4o: ~$175 total (current)');
  console.log('- o1-mini: ~$210 total');
  console.log('- o1-preview: ~$1,050 total\n');

  console.log('📌 SUGGESTED APPROACH:');
  console.log('1. Use GPT-4o-mini for initial document screening');
  console.log('2. Use GPT-4o for detailed extraction (current choice)');
  console.log('3. Use o1-mini for documents with complex financial models');
  console.log('4. Reserve o1-preview for the most critical documents\n');

  // Note about context windows
  console.log('📝 NOTE ON CONTEXT WINDOWS:');
  console.log('All models now support 128K context (about 100,000 words)');
  console.log('This is sufficient for even the longest technical reports');
  console.log('No need for GPT-4-32k as all new models exceed this\n');

  console.log('🚨 IMPORTANT: There is NO GPT-4.1 or GPT-5 available yet');
  console.log('The latest models are GPT-4o and o1 series (as of 2024)\n');
}

checkModels();