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
    let newContent = content.replace(/\btext-white\b/g, 'text-black');
    newContent = newContent.replace(/text-white\//g, 'text-black/');
    newContent = newContent.replace(/text-white\/\[/g, 'text-black/[');
    newContent = newContent.replace(/bg-\[#0d121f\]/g, 'bg-white');
    newContent = newContent.replace(/bg-white\/\[0\.02\]/g, 'bg-black/5');
    newContent = newContent.replace(/bg-white\/\[0\.04\]/g, 'bg-black/10');
    newContent = newContent.replace(/border-white\/10/g, 'border-black');
    newContent = newContent.replace(/border-white\/\[0\.08\]/g, 'border-black');
    newContent = newContent.replace(/border-white\/20/g, 'border-black');
    newContent = newContent.replace(/border-white\/30/g, 'border-black');
    newContent = newContent.replace(/bg-slate-950/g, 'bg-white');
    newContent = newContent.replace(/bg-slate-900/g, 'bg-neutral-100');
    newContent = newContent.replace(/border-white/g, 'border-black');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log('Updated ' + filePath);
    }
  }
});
