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
    let newContent = content.replace(/bg-white\/\[0\.0[1-9]\]/g, 'bg-black/5');
    newContent = newContent.replace(/bg-white\/5(?!\d)/g, 'bg-black/5');
    newContent = newContent.replace(/bg-white\/10(?!\d)/g, 'bg-black/10');
    newContent = newContent.replace(/bg-white\/40(?!\d)/g, 'bg-white');
    newContent = newContent.replace(/bg-white\/50(?!\d)/g, 'bg-white');
    newContent = newContent.replace(/bg-white\/60(?!\d)/g, 'bg-white');
    newContent = newContent.replace(/bg-white\/70(?!\d)/g, 'bg-white');
    newContent = newContent.replace(/bg-white\/80(?!\d)/g, 'bg-white');
    newContent = newContent.replace(/bg-white\/55(?!\d)/g, 'bg-white');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log('Fixed bg diffs: ' + filePath);
    }
  }
});
