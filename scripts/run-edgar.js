#!/usr/bin/env node

// Load environment variables before anything else
require('dotenv').config({ path: '.env.local' });

// Now import and run the TypeScript file
require('tsx/register');
require('./edgar-background-scraper.ts');