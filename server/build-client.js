import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create dist/client directory
const clientDir = path.join(__dirname, 'dist', 'client');
if (!fs.existsSync(clientDir)) {
  fs.mkdirSync(clientDir, { recursive: true });
}

// Copy index.html if it exists
const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, path.join(clientDir, 'index.html'));
  console.log('Copied index.html to dist/client/');
}

// Copy src directory if it exists
const srcPath = path.join(__dirname, 'src');
if (fs.existsSync(srcPath)) {
  const destSrcPath = path.join(clientDir, 'src');
  if (!fs.existsSync(destSrcPath)) {
    fs.mkdirSync(destSrcPath, { recursive: true });
  }
  
  // Simple recursive copy function
  function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const files = fs.readdirSync(src);
      files.forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  
  try {
    copyRecursive(srcPath, destSrcPath);
    console.log('Copied src/ to dist/client/src/');
  } catch (err) {
    console.log('No src directory found, skipping...');
  }
}

console.log('Client build completed successfully!');