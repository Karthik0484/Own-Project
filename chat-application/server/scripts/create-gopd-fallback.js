#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Creating gopd fallback module...');

// Create a fallback gopd module in our own directory
const fallbackGopdDir = path.join(__dirname, '..', 'gopd-fallback');
const fallbackGopdIndex = path.join(fallbackGopdDir, 'index.js');
const fallbackGopdGOPD = path.join(fallbackGopdDir, 'gOPD.js');

// Ensure the directory exists
if (!fs.existsSync(fallbackGopdDir)) {
    fs.mkdirSync(fallbackGopdDir, { recursive: true });
}

// Create the gOPD.js file
const gOPDContent = `'use strict';

/** @type {import('./gOPD')} */
module.exports = Object.getOwnPropertyDescriptor;`;

fs.writeFileSync(fallbackGopdGOPD, gOPDContent);

// Create the index.js file
const indexContent = `'use strict';

/** @type {import('.')} */
var $gOPD = require('./gOPD.js');

if ($gOPD) {
    try {
        $gOPD([], 'length');
    } catch (e) {
        // IE 8 has a broken gOPD
        $gOPD = null;
    }
}

module.exports = $gOPD;`;

fs.writeFileSync(fallbackGopdIndex, indexContent);

console.log('✅ Created fallback gopd module');

// Now try to find and fix the actual gopd module
const possibleGopdPaths = [
    path.join(__dirname, '..', 'node_modules', 'gopd'),
    path.join(process.cwd(), 'node_modules', 'gopd'),
    '/opt/render/project/src/chat-application/server/node_modules/gopd'
];

for (const gopdPath of possibleGopdPaths) {
    if (fs.existsSync(gopdPath)) {
        console.log(`🔧 Fixing gopd at: ${gopdPath}`);
        
        const gopdIndexPath = path.join(gopdPath, 'index.js');
        const gOPDOriginalPath = path.join(gopdPath, 'gOPD.js');
        
        if (fs.existsSync(gOPDOriginalPath)) {
            // Create a copy without extension
            const gOPDCopyPath = path.join(gopdPath, 'gOPD');
            fs.copyFileSync(gOPDOriginalPath, gOPDCopyPath);
            
            // Replace the index.js with our robust version
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
        // Final fallback
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

            fs.writeFileSync(gopdIndexPath, robustIndexContent);
            console.log(`✅ Fixed gopd at: ${gopdPath}`);
        }
    }
}

console.log('✅ gopd fallback creation completed'); 