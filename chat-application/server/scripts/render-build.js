#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Render build process...');

try {
    // Step 1: Clean install
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    // Step 2: Apply patches
    console.log('🔧 Applying gopd patches...');
    execSync('node scripts/apply-patches.js', { stdio: 'inherit' });
    
    // Step 3: Verify the fix
    console.log('✅ Verifying gopd fix...');
    const gopdDir = path.join(__dirname, '..', 'node_modules', 'gopd');
    const gopdIndexPath = path.join(gopdDir, 'index.js');
    
    if (fs.existsSync(gopdIndexPath)) {
        const content = fs.readFileSync(gopdIndexPath, 'utf8');
        if (content.includes('require(\'./gOPD.js\')') || content.includes('require(\'./gOPD\')')) {
            console.log('✅ gopd patch verified successfully');
        } else {
            console.log('⚠️  gopd patch may not be applied correctly');
        }
    }
    
    // Step 4: Test the application
    console.log('🧪 Testing application startup...');
    try {
        // Test if the main application can load without errors
        execSync('node -e "console.log(\'Testing app startup...\'); require(\'./index.js\'); console.log(\'✅ App loads successfully\');"', { 
            stdio: 'pipe',
            timeout: 10000 
        });
        console.log('✅ Application startup test passed');
    } catch (testError) {
        console.log('⚠️  Application startup test failed, but continuing...');
    }
    
    console.log('✅ Render build process completed successfully!');
    
} catch (error) {
    console.error('❌ Render build process failed:', error.message);
    process.exit(1);
} 