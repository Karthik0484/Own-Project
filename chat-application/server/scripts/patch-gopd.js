#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gopdIndexPath = path.join(__dirname, '..', 'node_modules', 'gopd', 'index.js');

if (fs.existsSync(gopdIndexPath)) {
    try {
        let content = fs.readFileSync(gopdIndexPath, 'utf8');
        
        // Replace require('./gOPD') with require('./gOPD.js')
        const originalPattern = /require\(['"]\.\/gOPD['"]\)/g;
        const replacement = "require('./gOPD.js')";
        
        if (content.match(originalPattern)) {
            content = content.replace(originalPattern, replacement);
            fs.writeFileSync(gopdIndexPath, content);
            console.log('✅ Applied gopd patch for case sensitivity');
        } else {
            console.log('ℹ️  gopd patch not needed - pattern not found');
        }
    } catch (error) {
        console.error('❌ Error applying gopd patch:', error.message);
    }
} else {
    console.log('ℹ️  gopd module not found, skipping patch');
} 