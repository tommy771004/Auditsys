const fs = require('fs');

function repl(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/\btext-white\b/g, 'text-black');
  content = content.replace(/text-white\//g, 'text-black/');
  content = content.replace(/bg-\[#0d121f\]/g, 'bg-white');
  content = content.replace(/bg-white\/\[0\.02\]/g, 'bg-black/5');
  content = content.replace(/bg-white\/\[0\.04\]/g, 'bg-black/10');
  content = content.replace(/border-white\/10/g, 'border-black');
  content = content.replace(/border-white\/\[0\.08\]/g, 'border-black');
  content = content.replace(/border-white\/20/g, 'border-black');
  fs.writeFileSync(filePath, content, 'utf-8');
}

repl('src/pages/Home.tsx');
