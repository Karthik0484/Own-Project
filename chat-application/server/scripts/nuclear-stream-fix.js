#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('☢️  Applying NUCLEAR stream fix...');

// Find all possible readable-stream locations
const possibleReadableStreamPaths = [
    path.join(__dirname, '..', 'node_modules', 'readable-stream'),
    path.join(process.cwd(), 'node_modules', 'readable-stream'),
    '/opt/render/project/src/chat-application/server/node_modules/readable-stream',
    '/opt/render/project/src/chat-application/node_modules/readable-stream'
];

// Create a completely working readable-stream module
const workingReadableStreamContent = {
    'index.js': `// Readable-stream nuclear fix for Node.js 20
const { Readable, Writable, Transform, Duplex, PassThrough } = require('stream');

module.exports = {
    Readable,
    Writable,
    Transform,
    Duplex,
    PassThrough,
    // Add any missing methods that might be needed
    finished: require('stream').finished || (() => {}),
    pipeline: require('stream').pipeline || (() => {}),
    // Compatibility with older versions
    Stream: Readable,
    _stream_readable: Readable,
    _stream_writable: Writable,
    _stream_transform: Transform,
    _stream_duplex: Duplex,
    _stream_passthrough: PassThrough
};`,
    
    'package.json': `{
  "name": "readable-stream",
  "version": "4.0.0",
  "description": "Nuclear fix for Node.js 20 compatibility",
  "main": "index.js",
  "type": "commonjs"
}`
};

// Apply the nuclear fix to all found readable-stream directories
for (const readableStreamPath of possibleReadableStreamPaths) {
    if (fs.existsSync(readableStreamPath)) {
        console.log(`☢️  Applying nuclear fix to: ${readableStreamPath}`);
        
        try {
            // Replace all files in the readable-stream directory
            for (const [filename, content] of Object.entries(workingReadableStreamContent)) {
                const filePath = path.join(readableStreamPath, filename);
                fs.writeFileSync(filePath, content);
                console.log(`✅ Created/updated: ${filename}`);
            }
            
            console.log(`✅ Nuclear fix applied to: ${readableStreamPath}`);
        } catch (error) {
            console.error(`❌ Error applying nuclear fix to ${readableStreamPath}:`, error.message);
        }
    }
}

// Also create a fallback in our own directory
const fallbackDir = path.join(__dirname, '..', 'readable-stream-nuclear-fallback');
if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
}

for (const [filename, content] of Object.entries(workingReadableStreamContent)) {
    const filePath = path.join(fallbackDir, filename);
    fs.writeFileSync(filePath, content);
}

console.log('✅ Nuclear readable-stream fix completed');
console.log('✅ Fallback created at:', fallbackDir); 