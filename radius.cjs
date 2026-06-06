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
    let newContent = content.replace(/rounded-xl/g, 'rounded-sm');
    newContent = newContent.replace(/rounded-2xl/g, 'rounded-sm');
    newContent = newContent.replace(/rounded-3xl/g, 'rounded-sm');
    newContent = newContent.replace(/rounded-lg/g, 'rounded-sm');
    newContent = newContent.replace(/rounded-\[.*?\]/g, 'rounded-sm');
    newContent = newContent.replace(/bg-black\/5/g, 'bg-black/5');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log('Updated radius for ' + filePath);
    }
  }
});
