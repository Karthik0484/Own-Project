#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gopdDir = path.join(__dirname, '..', 'node_modules', 'gopd');
const gopdIndexPath = path.join(gopdDir, 'index.js');
const gOPDOriginalPath = path.join(gopdDir, 'gOPD.js');

console.log('🔧 Applying permanent gopd fix...');

if (fs.existsSync(gopdIndexPath) && fs.existsSync(gOPDOriginalPath)) {
    try {
        // Read the original index.js
        let content = fs.readFileSync(gopdIndexPath, 'utf8');
        
        // Create a more robust version that handles both cases
        const newContent = `'use strict';

/** @type {import('.')} */
var $gOPD;
try {
    $gOPD = require('./gOPD.js');
} catch (e) {
    try {
        $gOPD = require('./gOPD');
    } catch (e2) {
        // Fallback to Object.getOwnPropertyDescriptor
        $gOPD = Object.getOwnPropertyDescriptor;
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

        // Write the fixed version
        fs.writeFileSync(gopdIndexPath, newContent);
        
        // Also create a copy of gOPD.js as gOPD (without extension) for extra safety
        const gOPDCopyPath = path.join(gopdDir, 'gOPD');
        if (!fs.existsSync(gOPDCopyPath)) {
            fs.copyFileSync(gOPDOriginalPath, gOPDCopyPath);
        }
        
        console.log('✅ Applied permanent gopd fix successfully');
        console.log('✅ Created compatibility files');
        
    } catch (error) {
        console.error('❌ Error applying permanent gopd fix:', error.message);
        process.exit(1);
    }
} else {
    console.log('ℹ️  gopd module not found, skipping fix');
} 