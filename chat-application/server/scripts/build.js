#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Starting deployment build process...');

try {
    // Run the gopd patch
    console.log('📦 Applying gopd case sensitivity patch...');
    execSync('node scripts/patch-gopd.js', { stdio: 'inherit' });
    
    // Run the gopd fix
    console.log('🔧 Creating gopd compatibility files...');
    execSync('node scripts/fix-gopd.js', { stdio: 'inherit' });
    
    console.log('✅ Build process completed successfully!');
} catch (error) {
    console.error('❌ Build process failed:', error.message);
    process.exit(1);
} 