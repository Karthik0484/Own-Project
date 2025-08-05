#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Applying FORCE gopd fix...');

// Try multiple possible locations for the gopd module
const possibleGopdPaths = [
    path.join(__dirname, '..', 'node_modules', 'gopd'),
    path.join(__dirname, '..', '..', 'node_modules', 'gopd'),
    path.join(process.cwd(), 'node_modules', 'gopd'),
    path.join(process.cwd(), '..', 'node_modules', 'gopd'),
    '/opt/render/project/src/chat-application/server/node_modules/gopd',
    '/opt/render/project/src/chat-application/node_modules/gopd'
];

let gopdDir = null;
let gopdIndexPath = null;
let gOPDOriginalPath = null;

// Find the gopd directory
for (const possiblePath of possibleGopdPaths) {
    console.log(`🔍 Checking for gopd at: ${possiblePath}`);
    if (fs.existsSync(possiblePath)) {
        gopdDir = possiblePath;
        gopdIndexPath = path.join(gopdDir, 'index.js');
        gOPDOriginalPath = path.join(gopdDir, 'gOPD.js');
        console.log(`✅ Found gopd at: ${gopdDir}`);
        break;
    }
}

if (!gopdDir) {
    console.log('❌ gopd module not found in any expected location');
    console.log('🔍 Searching for gopd in node_modules...');
    
    // Search recursively for gopd
    const searchForGopd = (dir) => {
        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    if (item === 'gopd') {
                        return fullPath;
                    }
                    const result = searchForGopd(fullPath);
                    if (result) return result;
                }
            }
        } catch (error) {
            // Ignore errors and continue searching
        }
        return null;
    };
    
    const foundGopd = searchForGopd(path.join(__dirname, '..', 'node_modules'));
    if (foundGopd) {
        gopdDir = foundGopd;
        gopdIndexPath = path.join(gopdDir, 'index.js');
        gOPDOriginalPath = path.join(gopdDir, 'gOPD.js');
        console.log(`✅ Found gopd at: ${gopdDir}`);
    }
}

if (gopdDir && fs.existsSync(gopdIndexPath) && fs.existsSync(gOPDOriginalPath)) {
    try {
        console.log('🔧 Applying comprehensive gopd fix...');
        
        // Step 1: Create a copy of gOPD.js as gOPD (without extension)
        const gOPDCopyPath = path.join(gopdDir, 'gOPD');
        if (!fs.existsSync(gOPDCopyPath)) {
            fs.copyFileSync(gOPDOriginalPath, gOPDCopyPath);
            console.log('✅ Created gOPD copy (without extension)');
        }

        // Step 2: Replace the index.js with a robust version
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

        // Step 3: Verify the files exist
        const files = fs.readdirSync(gopdDir);
        console.log('📁 Files in gopd directory:', files);

        console.log('✅ FORCE gopd fix applied successfully');
        
    } catch (error) {
        console.error('❌ Error applying FORCE gopd fix:', error.message);
        process.exit(1);
    }
} else {
    console.log('❌ Could not find gopd module or required files');
    console.log('Available paths checked:', possibleGopdPaths);
    process.exit(1);
} 