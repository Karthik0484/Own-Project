#!/bin/bash

echo "🧹 Cleaning old dependencies..."
rm -rf node_modules package-lock.json

echo "🧹 Cleaning npm cache..."
npm cache clean --force

echo "📦 Installing dependencies with compatible versions..."
npm install

echo "🔧 Applying gopd nuclear fix..."
node scripts/nuclear-gopd-fix.js

echo "🔍 Verifying readable-stream version..."
npm list readable-stream

echo "🔍 Verifying multer version..."
npm list multer

echo "✅ Build completed successfully!" 