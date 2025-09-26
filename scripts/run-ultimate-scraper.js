#!/usr/bin/env node

// Load environment variables
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔧 Environment loaded');
console.log('🚀 Starting ULTIMATE EDGAR scraper to collect ALL available documents...\n');

// Run the TypeScript file
const { spawn } = require('child_process');

const child = spawn('npx', ['tsx', 'scripts/edgar-ultimate-scraper.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Ultimate scraper finished successfully');
  } else {
    console.log(`\n❌ Ultimate scraper exited with code ${code}`);
  }
  process.exit(code);
});