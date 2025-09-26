#!/usr/bin/env node

// Load environment variables immediately
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Verify environment variables are loaded
console.log('Environment variables loaded:');
console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
console.log('');

// Now run the TypeScript file using Node's child_process
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const child = spawn('npx', ['tsx', 'scripts/edgar-background-scraper.ts', ...args], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code);
});