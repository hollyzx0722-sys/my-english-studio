const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.MY_ENGLISH_PORT || 4174);
const VAULT = process.env.OBSIDIAN_VAULT || '/Users/cecilia/Documents/Codex/PHD';
const ROOT = __dirname;
const clients = new Set();
let lastSync = null;
let syncError = null;
let debounceTimer = null;
let speakingSessions = [];

function unquote(value = '') { return value.trim().replace(/^['"]|['"]$/g, ''); }
function section(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${heading}\\s*$`, 'i').test(line));
  if (start < 0) return '';
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return lines.slice(start + 1, end < 0 ? lines.length : end).join('\n').trim();
}
function plain(value) { return value.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`>#=]/g, '').replace(/^\s*[-+]\s*/gm, '').replace(/\s+/g, ' ').trim(); }
function field(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'mi'));
  return match ? unquote(match[1]) : '';
}
function listField(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s*.+\\n?)+)`, 'mi'));
  return match ? [...match[1].matchAll(/^\s+-\s*(.+)$/gmi)].map((item) => unquote(item[1])) : [];
}
function readingSections(content) {
  const matches = [...content.matchAll(/^###\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const chunk = content.slice(match.index + match[0].length, matches[index + 1]?.index || content.length).trim();
    const en = chunk.match(/\*\*EN:\*\*\s*([\s\S]*?)(?=\n\s*\*\*中:\*\*|\n\s*\*\*可摘表达:\*\*|\n\s*\*\*IELTS 句型:\*\*|$)/i)?.[1] || '';
    const zh = chunk.match(/\*\*中:\*\*\s*([\s\S]*?)(?=\n\s*\*\*可摘表达:\*\*|\n\s*\*\*IELTS 句型:\*\*|$)/i)?.[1] || '';
    const expression = chunk.match(/\*\*(?:可摘表达|IELTS 句型):\*\*\s*([\s\S]*)$/i)?.[1] || '';
    return { number: String(index + 1).padStart(2, '0'), title: match[1].trim(), en: plain(en), zh: plain(zh), expression: plain(expression) };
  }).filter((item) => item.en || item.zh);
}
function parseMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  const frontmatter = match ? match[1] : '';
  const body = match ? match[2] : raw;
  const title = field(frontmatter, 'title') || (body.match(/^#\s+(.+)$/m)?.[1] || path.basename(filePath, '.md'));
  const url = field(frontmatter, 'url') || field(frontmatter, 'source');
  const isStudyNote = field(frontmatter, 'type') === '外刊精读单篇';
  const vocabSection = section(body, 'Vocabulary And Chunks');
  const vocabEntries = [...vocabSection.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/gm)]
    .map((item) => ({ term: item[1].trim(), meaning: item[2].trim(), use: item[3].trim() }))
    .filter((item) => item.term && !/^[-]+$/.test(item.term) && item.term.toLowerCase() !== 'english');
  const vocab = vocabEntries.map((item) => item.term);
  const summary = isStudyNote
    ? plain(section(body, 'One-Minute Summary')).split(/\n+/).filter(Boolean).slice(0, 2).join(' ')
    : plain(body.split(/\n\s*\n/).find((block) => block.trim() && !block.trim().startsWith('---')) || body).slice(0, 240);
  const bilingual = isStudyNote ? section(body, '全文级中英对照精读') : '';
  const reading = isStudyNote ? readingSections(bilingual) : [];
  const sentencesSection = section(body, 'Long Sentence Practice');
  const sentences = sentencesSection ? sentencesSection.split(/\n+/).map(plain).filter((line) => line.length > 35).slice(0, 3) : [];
  const prompts = section(body, 'Personal Review Prompts').split('<!-- my-english-audio:start -->')[0].split(/\n+/).map(plain).filter(Boolean).slice(0, 4);
  const relative = path.relative(VAULT, filePath);
  const id = crypto.createHash('sha1').update(relative).digest('hex').slice(0, 12);
  const isArticle = isStudyNote || relative.split(path.sep)[0].toLowerCase() === 'clippings' || listField(frontmatter, 'tags').includes('clippings');
  return {
    id,
    title, source: isStudyNote ? field(frontmatter, 'source') : new URL(url || 'https://example.com').hostname.replace(/^www\./, ''),
    priority: field(frontmatter, 'priority') || 'Inbox',
    tag: listField(frontmatter, 'topic')[0] || 'New clipping',
    image: './assets/cloud-ai.png', url, status: isStudyNote ? 'complete' : 'inbox',
    summary: summary || '从 Obsidian 同步的学习材料。', bilingual: bilingual || `原始剪藏已同步。\n\n文件：${relative}`, readingSections: reading,
    vocab, vocabEntries, sentences, prompts: prompts.length ? prompts : ['Summarize the article in your own words.', 'What is your opinion on this topic?'],
    sourcePath: relative, updatedAt: fs.statSync(filePath).mtime.toISOString(), kind: isStudyNote ? 'study-note' : 'clipping', isArticle
  };
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.obsidian' || entry.name.startsWith('.')) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
  });
}
function scanSpeakingSessions() {
  const directory = path.join(VAULT, 'Speaking Sessions');
  return walk(directory).map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
    return { articleId: field(frontmatter, 'article_id'), title: field(frontmatter, 'article_title'), practicedAt: field(frontmatter, 'practiced_at'), sourcePath: path.relative(VAULT, filePath) };
  }).sort((a, b) => b.practicedAt.localeCompare(a.practicedAt));
}
function scanVault() {
  const files = walk(VAULT);
  const byUrl = new Map();
  for (const file of files) {
    try {
      const article = parseMarkdown(file);
      if (!article.isArticle) continue;
      const key = article.url || article.title.toLowerCase();
      const previous = byUrl.get(key);
      if (!previous) { article.originalSourcePath = article.sourcePath; byUrl.set(key, article); }
      else if (article.kind === 'study-note') {
        article.originalSourcePath = previous.kind === 'clipping' ? previous.sourcePath : previous.originalSourcePath || previous.sourcePath;
        byUrl.set(key, article);
      } else if (previous.kind === 'study-note') {
        previous.originalSourcePath = article.sourcePath;
      }
    } catch (error) { syncError = error.message; }
  }
  lastSync = new Date().toISOString(); syncError = files.length ? syncError : `No Markdown files found in ${VAULT}`;
  return [...byUrl.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
let articles = scanVault();
speakingSessions = scanSpeakingSessions();
function notify() { for (const response of clients) response.write(`data: ${JSON.stringify({ type: 'sync', at: lastSync })}\n\n`); }
function scheduleScan() { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { articles = scanVault(); speakingSessions = scanSpeakingSessions(); notify(); }, 250); }
if (require.main === module && fs.existsSync(VAULT)) fs.watch(VAULT, { recursive: true }, scheduleScan);

function json(response, value, status = 200) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)); }
function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; if (body.length > 1_000_000) request.destroy(); });
    request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); } });
    request.on('error', reject);
  });
}
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'speaking-session'; }
function saveSpeakingSession(payload) {
  const article = articles.find((item) => item.id === payload.articleId);
  if (!article || typeof payload.review !== 'string' || payload.review.trim().length < 20) throw new Error('Article and after-class review are required');
  const practicedAt = new Date().toISOString();
  const directory = path.join(VAULT, 'Speaking Sessions');
  fs.mkdirSync(directory, { recursive: true });
  const fileName = `${practicedAt.replace(/[:.]/g, '-')}-${slug(article.title)}.md`;
  const content = `---\ntype: speaking-session\narticle_id: "${article.id}"\narticle_title: "${article.title.replace(/"/g, '\\"')}"\nsource: "${article.url}"\npracticed_at: "${practicedAt}"\ntags:\n  - english/speaking\n  - ielts/review\n---\n\n# Speaking Review - ${article.title}\n\n${payload.review.trim()}\n`;
  fs.writeFileSync(path.join(directory, fileName), content, { flag: 'wx' });
  speakingSessions = scanSpeakingSessions();
  return { articleId: article.id, practicedAt, sourcePath: path.join('Speaking Sessions', fileName) };
}
function staticFile(requestPath, response) {
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.resolve(ROOT, `.${safePath}`);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return json(response, { error: 'Not found' }, 404);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg' };
  response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' }); fs.createReadStream(filePath).pipe(response);
}
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/api/articles') return json(response, { vault: VAULT, articles: articles.map((article) => ({ ...article, speakingSessions: speakingSessions.filter((session) => session.articleId === article.id) })), sessions: speakingSessions, syncedAt: lastSync, error: syncError });
  if (url.pathname === '/api/sync') { articles = scanVault(); return json(response, { vault: VAULT, count: articles.length, syncedAt: lastSync, error: syncError }); }
  if (url.pathname === '/api/speaking-sessions' && request.method === 'POST') {
    return readJson(request).then((payload) => { const result = saveSpeakingSession(payload); notify(); json(response, result, 201); }).catch((error) => json(response, { error: error.message }, 400));
  }
  if (url.pathname === '/api/events') { response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }); response.write(`data: ${JSON.stringify({ type: 'connected', at: lastSync })}\n\n`); clients.add(response); request.on('close', () => clients.delete(response)); return; }
  staticFile(url.pathname, response);
});
if (require.main === module) server.listen(PORT, '127.0.0.1', () => console.log(`My English Studio: http://127.0.0.1:${PORT}`));

module.exports = { VAULT, scanVault };
