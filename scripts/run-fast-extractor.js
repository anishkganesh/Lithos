#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('⚡ Starting FAST Project Extractor');
console.log('🎯 Target: 1000+ projects\n');

const { spawn } = require('child_process');

const child = spawn('npx', ['tsx', 'scripts/fast-project-extractor.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Fast extraction completed successfully');
  } else {
    console.log(`\n❌ Fast extraction exited with code ${code}`);
  }
  process.exit(code);
});