#!/usr/bin/env node
// Reads collection/*.md files, parses frontmatter, and writes data.json

const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: '' };

  const data = {};
  match[1].split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  });

  return { data, body: match[2].trim() };
}

const collectionDir = path.join(__dirname, 'collection');
const files = fs.readdirSync(collectionDir)
  .filter(f => f.endsWith('.md'))
  .sort();

const items = files.map(file => {
  const content = fs.readFileSync(path.join(collectionDir, file), 'utf8');
  const { data, body } = parseFrontmatter(content);
  return {
    slug: file.replace('.md', ''),
    name: data.name || '',
    category: data.category || '',
    set: data.set || '',
    language: data.language || 'English',
    acquired: data.acquired || '',
    condition: data.condition || 'Sealed',
    image: data.image || '',
    price: data.price || '',
    notes: body || '',
  };
});

items.sort((a, b) => {
  if (!a.acquired) return 1;
  if (!b.acquired) return -1;
  return new Date(b.acquired) - new Date(a.acquired);
});

const json = JSON.stringify(items, null, 2);

fs.writeFileSync(path.join(__dirname, 'data.json'), json);

// Also write a JS file so the site works when opened as file://
fs.writeFileSync(
  path.join(__dirname, 'data.js'),
  `window.COLLECTION_DATA = ${json};\n`
);

console.log(`Built data.json + data.js with ${items.length} item(s).`);
