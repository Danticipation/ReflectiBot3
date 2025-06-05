// build-client.js
const fs = require('fs');
const path = require('path');

const distClientPath = path.join(__dirname, 'dist', 'client');
if (!fs.existsSync(distClientPath)) {
  fs.mkdirSync(distClientPath, { recursive: true });
}

// Simulate client build
fs.writeFileSync(path.join(distClientPath, 'index.html'), '<!DOCTYPE html><html><body><h1>Reflectibot Client</h1></body></html>');

console.log('✅ Dummy client build complete');
