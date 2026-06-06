const fs = require('fs');
const path = require('path');

const directory = './src';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(directory, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content.replace(/text-white\/[0-9]+/g, 'text-black/60');
    newContent = newContent.replace(/text-cyan-50\/[0-9]+/g, 'text-black/60');
    newContent = newContent.replace(/border-white\/[0-9]+/g, 'border-black');
    newContent = newContent.replace(/border-white\/\[.*?\]/g, 'border-black');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log('Updated minor properties for ' + filePath);
    }
  }
});
