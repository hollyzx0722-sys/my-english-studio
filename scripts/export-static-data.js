const fs = require('node:fs');
const path = require('node:path');
const { VAULT, scanVault } = require('../server');

const outputPath = path.join(__dirname, '..', 'data', 'articles.json');
const articles = scanVault()
  .filter((article) => article.kind === 'study-note')
  .map(({ sourcePath, originalSourcePath, kind, isArticle, ...article }) => ({
    ...article,
    readingSections: article.studyMode === 'extensive' ? article.readingSections.slice(0, 4) : article.readingSections.slice(0, 8),
    vocab: article.studyMode === 'extensive' ? article.vocab.slice(0, 8) : article.vocab.slice(0, 15),
    vocabEntries: article.studyMode === 'extensive' ? article.vocabEntries.slice(0, 8) : article.vocabEntries.slice(0, 15),
    sentences: article.studyMode === 'extensive' ? article.sentences.slice(0, 2) : article.sentences.slice(0, 5),
    prompts: article.studyMode === 'extensive' ? article.prompts.slice(0, 3) : article.prompts.slice(0, 5),
    speakingSessions: []
  }));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ articles, exportedAt: new Date().toISOString() }, null, 2)}\n`);
console.log(`Exported ${articles.length} study notes from ${VAULT} to ${outputPath}`);
