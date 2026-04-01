const fs = require('fs');
const path = './src/pages/projects/fixtures/BomTree.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Modify StandardPartsSection to just render the table without the button/accordion, or better, we can inline it or modify it.
content = content.replace(
  /function StandardPartsSection\(\{[\s\S]*?\}\) \{[\s\S]*?const \[open, setOpen\] = useState\(true\)[\s\S]*?return \([\s\S]*?<div className="rounded border border-teal-100 overflow-hidden">[\s\S]*?<button[\s\S]*?<\/button>[\s\S]*?\{open && \([\s\S]*?<div className="overflow-x-auto">/m,
  (match) => {
    // Replace the signature and remove accordion
    return match.replace('function StandardPartsSection', 'function StandardPartsTable')
                .replace(/const \[open, setOpen\] = useState\(true\)/, '')
                .replace(/<button[\s\S]*?<\/button>/, '')
                .replace(/\{open && \(/, '')
                .replace(/<div className="rounded border border-teal-100 overflow-hidden">/, '<div className="rounded border border-teal-100 overflow-hidden">')
  }
);

content = content.replace(
  /<\/div>\n\s*\)\}\n\s*<\/div>/g,
  (match, offset, str) => {
    if (str.substring(offset - 200, offset).includes('StandardPartsTable')) {
       return '</div>\n    </div>'; // Removed the `)}` that matched `{open && (`
    }
    return match;
  }
);

// Oh actually, regex rewriting this complex file might be brittle. Let me just rewrite it properly by fetching the file, parsing and modifying.
