const fs = require('node:fs');
const path = require('node:path');
const { VAULT, scanVault } = require('../server');

const outputPath = path.join(__dirname, '..', 'data', 'articles.json');
const articles = scanVault()
  .filter((article) => article.kind === 'study-note')
  .map(({ sourcePath, originalSourcePath, kind, isArticle, ...article }) => ({
    ...article,
    speakingSessions: []
  }));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ articles, exportedAt: new Date().toISOString() }, null, 2)}\n`);
console.log(`Exported ${articles.length} study notes from ${VAULT} to ${outputPath}`);
