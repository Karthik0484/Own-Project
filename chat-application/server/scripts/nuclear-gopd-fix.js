#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('☢️  Applying NUCLEAR gopd fix...');

// Find all possible gopd locations
const possibleGopdPaths = [
    path.join(__dirname, '..', 'node_modules', 'gopd'),
    path.join(process.cwd(), 'node_modules', 'gopd'),
    '/opt/render/project/src/chat-application/server/node_modules/gopd',
    '/opt/render/project/src/chat-application/node_modules/gopd'
];

// Create a completely working gopd module
const workingGopdContent = {
    'index.js': `'use strict';

/** @type {import('.')} */
var $gOPD = Object.getOwnPropertyDescriptor;

if ($gOPD) {
    try {
        $gOPD([], 'length');
    } catch (e) {
        // IE 8 has a broken gOPD
        $gOPD = null;
    }
}

module.exports = $gOPD;`,
    
    'gOPD.js': `'use strict';

/** @type {import('./gOPD')} */
module.exports = Object.getOwnPropertyDescriptor;`,
    
    'gOPD': `'use strict';

/** @type {import('./gOPD')} */
module.exports = Object.getOwnPropertyDescriptor;`,
    
    'package.json': `{
  "name": "gopd",
  "version": "1.2.0",
  "description": "Working gopd module",
  "main": "index.js",
  "type": "commonjs"
}`
};

// Apply the nuclear fix to all found gopd directories
for (const gopdPath of possibleGopdPaths) {
    if (fs.existsSync(gopdPath)) {
        console.log(`☢️  Applying nuclear fix to: ${gopdPath}`);
        
        try {
            // Replace all files in the gopd directory
            for (const [filename, content] of Object.entries(workingGopdContent)) {
                const filePath = path.join(gopdPath, filename);
                fs.writeFileSync(filePath, content);
                console.log(`✅ Created/updated: ${filename}`);
            }
            
            console.log(`✅ Nuclear fix applied to: ${gopdPath}`);
        } catch (error) {
            console.error(`❌ Error applying nuclear fix to ${gopdPath}:`, error.message);
        }
    }
}

// Also create a fallback in our own directory
const fallbackDir = path.join(__dirname, '..', 'gopd-nuclear-fallback');
if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
}

for (const [filename, content] of Object.entries(workingGopdContent)) {
    const filePath = path.join(fallbackDir, filename);
    fs.writeFileSync(filePath, content);
}

console.log('✅ Nuclear gopd fix completed');
console.log('✅ Fallback created at:', fallbackDir); 