const fs = require('fs');
const path = require('path');

// Find the DuckDB WASM module path
const duckdbPath = path.dirname(require.resolve('@duckdb/duckdb-wasm'));
const duckdbDistPath = path.join(duckdbPath, 'dist');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Copy the DuckDB WASM files to the public directory
const filesToCopy = [
  'duckdb-browser-eh.worker.js',
  'duckdb-browser-mvp.worker.js',
  'duckdb-eh.wasm',
  'duckdb-mvp.wasm',
];

filesToCopy.forEach(file => {
  const sourcePath = path.join(duckdbDistPath, file);
  const destPath = path.join(publicDir, file);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${file} to public directory`);
  } else {
    console.error(`File not found: ${sourcePath}`);
  }
});

console.log('DuckDB WASM files copied to public directory');
