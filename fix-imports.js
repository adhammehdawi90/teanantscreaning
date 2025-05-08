const fs = require('fs');
const path = require('path');

// Directory to process
const distDir = path.join(__dirname, 'dist');

// Function to recursively process files in a directory
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      // Process JavaScript files
      fixImports(filePath);
    }
  }
}

// Function to fix imports in a file
function fixImports(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace relative imports without extensions
  // This regex matches import statements with relative paths that don't already have an extension
  content = content.replace(
    /from\s+['"](\.\/?[^'"\s]+)['"];?/g,
    (match, importPath) => {
      // Skip if already has an extension or is a directory import ending with /
      if (importPath.includes('.js') || importPath.endsWith('/')) {
        return match;
      }
      
      // Add .js extension
      return `from "${importPath}.js";`;
    }
  );
  
  // Write the modified content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
}

// Start processing
console.log('Fixing imports in the dist directory...');
processDirectory(distDir);
console.log('Import fixing complete!'); 