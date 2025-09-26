#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔧 Environment loaded');
console.log('🚀 Starting EXPANDED search for 1000 more documents...\n');

const { spawn } = require('child_process');

const child = spawn('npx', ['tsx', 'scripts/edgar-expand-search.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Expanded search completed successfully');
  } else {
    console.log(`\n❌ Expanded search exited with code ${code}`);
  }
  process.exit(code);
});