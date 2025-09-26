#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔧 Environment loaded');
console.log('🚀 Starting EDGAR Document Processor...');
console.log('📊 This will extract companies and projects using GPT-4o\n');

const { spawn } = require('child_process');

const child = spawn('npx', ['tsx', 'scripts/process-edgar-documents.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Document processing completed successfully');
  } else {
    console.log(`\n❌ Document processing exited with code ${code}`);
  }
  process.exit(code);
});