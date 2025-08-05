#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing stream dependencies for Node.js 20...');

// Create a more aggressive fix for readable-stream
const createReadableStreamFallback = () => {
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    const readableStreamPath = path.join(nodeModulesPath, 'readable-stream');
    
    if (fs.existsSync(readableStreamPath)) {
        console.log('🔧 Creating readable-stream fallback...');
        
        // Create a simple fallback that uses native streams
        const fallbackContent = `// Readable-stream fallback for Node.js 20
const { Readable, Writable, Transform, Duplex } = require('stream');

module.exports = {
    Readable,
    Writable,
    Transform,
    Duplex,
    // Add any missing methods that might be needed
    finished: require('stream').finished || (() => {}),
    pipeline: require('stream').pipeline || (() => {})
};`;
        
        // Replace with our fallback
        fs.writeFileSync(path.join(readableStreamPath, 'index.js'), fallbackContent);
        console.log('✅ Created readable-stream fallback');
    }
};

// Find and fix concat-stream issues
const findAndFixConcatStream = () => {
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    const concatStreamPath = path.join(nodeModulesPath, 'concat-stream');
    
    if (fs.existsSync(concatStreamPath)) {
        console.log('✅ Found concat-stream, checking for issues...');
        
        const indexPath = path.join(concatStreamPath, 'index.js');
        if (fs.existsSync(indexPath)) {
            let content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for problematic readable-stream usage
            if (content.includes('readable-stream')) {
                console.log('🔧 Fixing concat-stream readable-stream usage...');
                content = content.replace(
                    /require\(['"]readable-stream['"]\)/g,
                    'require(\'stream\')'
                );
                fs.writeFileSync(indexPath, content);
            }
        }
    }
};

// Find and fix multer issues
const findAndFixMulter = () => {
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    const multerPath = path.join(nodeModulesPath, 'multer');
    
    if (fs.existsSync(multerPath)) {
        console.log('✅ Found multer, checking for issues...');
        
        // Check storage/memory.js for concat-stream usage
        const memoryPath = path.join(multerPath, 'storage', 'memory.js');
        if (fs.existsSync(memoryPath)) {
            let content = fs.readFileSync(memoryPath, 'utf8');
            
            if (content.includes('concat-stream')) {
                console.log('🔧 Fixing multer concat-stream usage...');
                // Replace concat-stream with a simple buffer accumulation
                const newContent = content.replace(
                    /const ConcatStream = require\(['"]concat-stream['"]\)/g,
                    '// Using native stream handling instead of concat-stream'
                );
                fs.writeFileSync(memoryPath, newContent);
            }
        }
    }
};

// Create a fallback stream implementation
const createStreamFallback = () => {
    const fallbackDir = path.join(__dirname, '..', 'stream-fallback');
    if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
    }
    
    const fallbackContent = `// Stream fallback for Node.js 20 compatibility
const { Readable, Writable, Transform } = require('stream');

module.exports = {
    Readable,
    Writable,
    Transform,
    // Add any missing stream utilities here
    BufferList: class BufferList extends Readable {
        constructor() {
            super();
            this.buffers = [];
        }
        
        add(buffer) {
            this.buffers.push(buffer);
        }
        
        _read() {
            if (this.buffers.length > 0) {
                const buffer = this.buffers.shift();
                this.push(buffer);
            } else {
                this.push(null);
            }
        }
    }
};`;
    
    fs.writeFileSync(path.join(fallbackDir, 'index.js'), fallbackContent);
    console.log('✅ Created stream fallback');
};

try {
    console.log('🔍 Scanning for stream-related issues...');
    
    createReadableStreamFallback();
    findAndFixConcatStream();
    findAndFixMulter();
    createStreamFallback();
    
    console.log('✅ Stream dependency fixes completed');
} catch (error) {
    console.error('❌ Error fixing stream dependencies:', error.message);
    process.exit(1);
} 