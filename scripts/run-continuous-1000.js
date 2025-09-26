#!/usr/bin/env node

// Load environment variables
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔧 Environment loaded');
console.log('🚀 Starting continuous scraper to reach 1000 documents...\n');

// Run the TypeScript file
const { spawn } = require('child_process');

const child = spawn('npx', ['tsx', 'scripts/edgar-continuous-1000.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Scraper finished successfully');
  } else {
    console.log(`\n❌ Scraper exited with code ${code}`);
  }
  process.exit(code);
});