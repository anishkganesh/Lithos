#!/usr/bin/env node

// Load environment variables immediately
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Verify environment variables are loaded
console.log('Environment check:');
console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('- SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('');

// Now run the TypeScript file using Node's child_process
const { spawn } = require('child_process');

const child = spawn('npx', ['tsx', 'scripts/edgar-comprehensive-scrape.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code);
});