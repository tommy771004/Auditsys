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
    let newContent = content.replace(/bg-\[#[a-fA-F0-9]{6}(e8)?\](\/40|\/90)?/g, 'bg-white');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log('Updated hex colors for ' + filePath);
    }
  }
});
