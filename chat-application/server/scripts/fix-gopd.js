#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gopdDir = path.join(__dirname, '..', 'node_modules', 'gopd');
const gOPDOriginalPath = path.join(gopdDir, 'gOPD.js');
const gOPDCopyPath = path.join(gopdDir, 'gOPD');

if (fs.existsSync(gOPDOriginalPath)) {
    try {
        // Create a copy of gOPD.js as gOPD (without extension)
        fs.copyFileSync(gOPDOriginalPath, gOPDCopyPath);
        console.log('✅ Created gOPD copy for case sensitivity compatibility');
    } catch (error) {
        console.error('❌ Error creating gOPD copy:', error.message);
    }
} else {
    console.log('ℹ️  gOPD.js not found, skipping copy');
} 