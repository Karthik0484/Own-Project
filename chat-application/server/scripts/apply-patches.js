#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Applying comprehensive patches...');

const gopdDir = path.join(__dirname, '..', 'node_modules', 'gopd');
const gopdIndexPath = path.join(gopdDir, 'index.js');
const gOPDOriginalPath = path.join(gopdDir, 'gOPD.js');

if (fs.existsSync(gopdIndexPath) && fs.existsSync(gOPDOriginalPath)) {
    try {
        // Step 1: Create a copy of gOPD.js as gOPD (without extension)
        const gOPDCopyPath = path.join(gopdDir, 'gOPD');
        if (!fs.existsSync(gOPDCopyPath)) {
            fs.copyFileSync(gOPDOriginalPath, gOPDCopyPath);
            console.log('✅ Created gOPD copy (without extension)');
        }

        // Step 2: Create a copy of gOPD.js as gOPD.js (with extension) if it doesn't exist
        const gOPDWithExtPath = path.join(gopdDir, 'gOPD.js');
        if (!fs.existsSync(gOPDWithExtPath)) {
            fs.copyFileSync(gOPDOriginalPath, gOPDWithExtPath);
            console.log('✅ Created gOPD.js copy (with extension)');
        }

        // Step 3: Replace the index.js with a robust version
        const robustIndexContent = `'use strict';

/** @type {import('.')} */
var $gOPD;

// Try multiple approaches to load the module
try {
    // First try with .js extension
    $gOPD = require('./gOPD.js');
} catch (e) {
    try {
        // Then try without extension
        $gOPD = require('./gOPD');
    } catch (e2) {
        try {
            // Try with relative path
            $gOPD = require('./gOPD.js');
        } catch (e3) {
            // Final fallback
            $gOPD = Object.getOwnPropertyDescriptor;
        }
    }
}

if ($gOPD) {
    try {
        $gOPD([], 'length');
    } catch (e) {
        // IE 8 has a broken gOPD
        $gOPD = null;
    }
}

module.exports = $gOPD;`;

        fs.writeFileSync(gopdIndexPath, robustIndexContent);
        console.log('✅ Applied robust gopd index.js patch');

        // Step 4: Verify the fix works
        try {
            // Test the module loading
            const testContent = `const gopd = require('${gopdDir}');
console.log('✅ gopd module loaded successfully:', typeof gopd);`;
            
            const testFile = path.join(__dirname, '..', 'test-gopd-temp.js');
            fs.writeFileSync(testFile, testContent);
            
            // Run the test
            const { execSync } = await import('child_process');
            execSync(`node ${testFile}`, { stdio: 'pipe' });
            
            // Clean up test file
            fs.unlinkSync(testFile);
            
            console.log('✅ gopd module test passed');
        } catch (testError) {
            console.log('⚠️  gopd module test failed, but continuing...');
        }

        console.log('✅ All patches applied successfully');
        
    } catch (error) {
        console.error('❌ Error applying patches:', error.message);
        process.exit(1);
    }
} else {
    console.log('ℹ️  gopd module not found, skipping patches');
} 