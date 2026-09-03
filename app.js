const seedArticles = [
  { id: 'techradar-cloud-ai', title: 'Cloud Spending Soars As Hyperscalers Up AI Investment', source: 'TechRadar', priority: 'A 精读', tag: 'AI infrastructure spending', image: './assets/cloud-ai.png', url: 'https://www.techradar.com/pro/cloud-spending-soars-as-hyperscalers-up-ai-investment-and-could-reach-a-landmark-high-in-2026', summary: 'Cloud spending is rising rapidly as hyperscalers pour money into AI infrastructure, creating a strong IELTS reading and speaking thread.', bilingual: 'Cloud spending is rising rapidly as the largest providers increase investment in AI infrastructure.\n\n中文理解：云支出上涨和 AI 基建投资被直接绑定，这篇适合练趋势、预测、比较和因果链表达。', vocab: ['cloud spending', 'hyperscalers', 'ramp up investment', 'landmark high'], sentences: ['As demand for AI services grows, cloud providers are likely to ramp up investment in infrastructure.', 'The deeper point is that AI competition is also infrastructure competition.'], prompts: ['Why do cloud providers need to spend more when AI demand rises?', 'Is infrastructure more important than algorithms in the AI race?'] },
  { id: 'investopedia-alibaba-cloud', title: 'Alibaba Slashes Prices For Cloud Products', source: 'Investopedia', priority: 'B 泛读+摘表达', tag: 'Cloud pricing strategy', image: './assets/cloud-ai.png', url: 'https://www.investopedia.com/alibaba-slashes-prices-for-cloud-products-to-international-customers-in-ai-push-8628371', summary: 'Alibaba Cloud cut international prices as part of its AI push, which makes this a useful business and globalization case.', bilingual: 'Alibaba Cloud cut prices for international customers as part of a broader AI strategy.\n\n中文理解：这是价格战、国际化和 AI 资源可及性的结合点。', vocab: ['slash prices', 'price cuts', 'international customers', 'in an AI push'], sentences: ['By cutting prices for international customers, Alibaba Cloud may make its services more attractive to AI developers.', 'Price cuts may attract customers, but they can also reduce margins.'], prompts: ['When do price cuts help a company expand?', 'Can cheaper cloud services accelerate AI adoption?'] }
];

const stored = JSON.parse(localStorage.getItem('my-english-articles') || 'null');
localStorage.removeItem('my-english-anki');
localStorage.removeItem('my-english-anki-reviewed');
const articles = stored || seedArticles.map((article) => ({ ...article, status: 'inbox' }));
const save = () => localStorage.setItem('my-english-articles', JSON.stringify(articles));
if (!stored) save();

const feed = document.querySelector('#feed');
const feedEyebrow = document.querySelector('#feedEyebrow');
const feedTitle = document.querySelector('#feedTitle');
const feedSummary = document.querySelector('#feedSummary');
const modal = document.querySelector('#detailModal');
const importModal = document.querySelector('#importModal');
let activeArticle = null;
let activeSpeakingArticle = null;
let vaultEvents = null;
let syncMode = 'browser';
const detailTitle = document.querySelector('#detailTitle');
const detailSummary = document.querySelector('#detailSummary');
const detailImage = document.querySelector('#detailImage');
const detailMeta = document.querySelector('#detailMeta');
const detailSections = document.querySelector('#detailSections');
const detailVocab = document.querySelector('#detailVocab');
const detailSentences = document.querySelector('#detailSentences');
const detailPrompts = document.querySelector('#detailPrompts');
const syncState = document.querySelector('#syncState');
const syncDetail = document.querySelector('#syncDetail');
const speakingArticle = document.querySelector('#speakingArticle');
const speakingPrompt = document.querySelector('#speakingPrompt');
const speakingLaunchStatus = document.querySelector('#speakingLaunchStatus');
const speakingHistory = document.querySelector('#speakingHistory');
const saveSpeakingReview = document.querySelector('#saveSpeakingReview');

function statusLabel(status) { return { inbox: 'Inbox', reading: '精读中', complete: '已完成' }[status] || 'Inbox'; }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
function setActiveNav(section) { document.querySelectorAll('[data-nav]').forEach((item) => item.classList.toggle('active', item.dataset.nav === section)); }

function renderFeed(filter = 'All') {
  const visible = articles.filter((item) => {
    if (filter === 'All') return true;
    if (filter === 'Reading') return item.status === 'reading' || item.status === 'complete';
    if (filter === 'Inbox') return item.status === 'inbox';
    return item.tag === filter;
  });
  const labels = {
    All: { eyebrow: 'All materials', title: '全部精读材料' },
    Inbox: { eyebrow: 'Inbox', title: '待处理材料' },
    Reading: { eyebrow: 'Reading library', title: '精读文章' }
  };
  const label = labels[filter] || labels.All;
  feedEyebrow.textContent = label.eyebrow;
  feedTitle.textContent = label.title;
  feedSummary.textContent = `${visible.length} 篇文章`;
  feed.innerHTML = visible.length ? visible.map((item) => `
    <article class="feed-card" data-id="${item.id}">
      <img src="${item.image}" alt="${item.title}">
      <div class="stack"><div class="meta"><span class="pill ${item.priority.startsWith('A') ? 'gold' : 'green'}">${item.priority}</span><span class="pill">${item.source}</span></div>
      <h4>${item.title}</h4><p>${item.summary}</p><div class="row"><span class="pill">${item.tag}</span><span class="pill status-pill">${statusLabel(item.status)}</span></div></div>
    </article>`).join('') : '<div class="empty-state">这个栏目还没有材料。</div>';
}

function openDetail(article) {
  activeArticle = article;
  detailTitle.textContent = article.title; detailSummary.textContent = article.summary;
  detailImage.src = article.image; detailImage.alt = article.title;
  detailMeta.innerHTML = `<span class="pill ${article.priority.startsWith('A') ? 'gold' : 'green'}">${article.priority}</span><span class="pill">${article.source}</span><span class="pill">${statusLabel(article.status)}</span>`;
  const sections = article.readingSections?.length ? article.readingSections : [{ number: '01', title: 'Reading takeaway', en: article.bilingual || article.summary, zh: '这篇材料已经同步，结构化精读内容将在笔记生成后显示。', expression: '' }];
  detailSections.innerHTML = sections.map((section) => `<article class="reading-segment"><div class="segment-top"><span class="segment-number">${escapeHtml(section.number)}</span><h5>${escapeHtml(section.title)}</h5></div><div class="reading-compare"><div><span class="language-label">ENGLISH</span><p>${escapeHtml(section.en).replace(/\n/g, '<br>')}</p></div><div><span class="language-label">中文</span><p>${escapeHtml(section.zh).replace(/\n/g, '<br>')}</p></div></div>${section.expression ? `<div class="expression"><span>Useful language</span><strong>${escapeHtml(section.expression)}</strong></div>` : ''}</article>`).join('');
  detailVocab.innerHTML = article.vocab.length ? article.vocab.map((v) => `<span class="pill">${v}</span>`).join('') : '<span class="muted">精读后会在这里出现词汇。</span>';
  detailSentences.innerHTML = article.sentences.length ? article.sentences.map((s) => `<p>${s}</p>`).join('') : '<p>精读后会在这里出现长难句。</p>';
  detailPrompts.innerHTML = article.prompts.map((s) => `<p>${s}</p>`).join('');
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false');
}
const vocabularyMeta = {
  'cloud spending': { meaning: '云支出；云计算服务上的开支', uses: ['writing'], levels: ['雅思高频', '专四专八'] },
  'hyperscalers': { meaning: '超大规模云服务商', uses: ['writing'], levels: ['专四专八', '雅思高频'] },
  'ramp up investment': { meaning: '加大投资；逐步提高投资力度', uses: ['speaking', 'writing'], levels: ['四六级', '雅思高频'] },
  'landmark high': { meaning: '标志性新高；具有里程碑意义的高点', uses: ['writing'], levels: ['专四专八', '雅思高频'] },
  'ai investment': { meaning: '人工智能投资', uses: ['speaking', 'writing'], levels: ['四六级', '雅思高频'] },
  'slash prices': { meaning: '大幅削价；大幅降低价格', uses: ['speaking', 'writing'], levels: ['四六级', '雅思高频'] },
  'price cuts': { meaning: '降价措施；价格下调', uses: ['writing'], levels: ['四六级', '雅思高频'] },
  'international customers': { meaning: '国际客户；海外客户', uses: ['speaking', 'writing'], levels: ['四六级', '雅思高频'] },
  'in an ai push': { meaning: '作为推动 AI 战略的一部分', uses: ['speaking', 'writing'], levels: ['专四专八', '雅思高频'] }
};
function vocabularyItems() {
  const items = new Map();
  articles.forEach((article) => (article.vocab || []).forEach((rawTerm) => {
    const term = rawTerm.replace(/[`*]/g, '').trim(); const key = term.toLowerCase();
    if (!term || key === 'english') return;
    const meta = vocabularyMeta[key] || { meaning: '结合原文理解并在口语中复用。', uses: ['speaking', 'writing'], levels: ['雅思高频'] };
    const current = items.get(key) || { term, meaning: meta.meaning, uses: meta.uses, levels: meta.levels, sources: [], practiceCount: 0 };
    if (!current.sources.includes(article.source)) current.sources.push(article.source);
    current.practiceCount += article.speakingSessions?.length || 0;
    items.set(key, current);
  }));
  return [...items.values()].sort((a, b) => b.practiceCount - a.practiceCount || a.term.localeCompare(b.term));
}
function renderVocabulary(filter = 'all') {
  const items = vocabularyItems().filter((item) => filter === 'all' || item.uses.includes(filter) || item.levels.includes(filter));
  const groups = ['speaking', 'writing'].filter((group) => filter === 'all' || filter === group).map((group) => ({ key: group, title: group === 'speaking' ? '口语' : '写作', subtitle: group === 'speaking' ? '用于观点表达、解释和追问' : '用于趋势、因果和论证写作', items: items.filter((item) => item.uses.includes(group)) }));
  const visibleGroups = filter === 'all' || filter === 'speaking' || filter === 'writing' ? groups : [{ key: filter, title: filter, subtitle: '来自当前精读文章的考试场景词汇', items }];
  document.querySelectorAll('[data-vocab-filter]').forEach((button) => button.classList.toggle('active', button.dataset.vocabFilter === filter));
  document.querySelector('#vocabContent').innerHTML = visibleGroups.map((group) => `<section class="vocab-group"><div class="vocab-group-head"><div><span class="eyebrow">Level 1</span><h4>${group.title}</h4></div><span class="muted">${group.subtitle}</span></div><div class="vocab-grid">${group.items.length ? group.items.map((item) => `<article class="vocab-item"><div class="vocab-item-top"><div class="vocab-term"><h5>${escapeHtml(item.term)}</h5><button type="button" class="vocab-speak" data-speak="${encodeURIComponent(item.term)}" aria-label="朗读 ${escapeHtml(item.term)}">朗读</button></div>${item.practiceCount ? '<span class="practice-mark">口语用过</span>' : ''}</div><p>${escapeHtml(item.meaning)}</p><div class="vocab-tags">${item.levels.map((level) => `<span class="pill">${escapeHtml(level)}</span>`).join('')}</div><small>${escapeHtml(item.sources.join(' · '))}</small></article>`).join('') : '<div class="empty-state">这个分类暂时没有词汇。</div>'}</div></section>`).join('');
}
function closeModal(target) { target.classList.add('hidden'); target.setAttribute('aria-hidden', 'true'); }

function buildSpeakingPrompt(article) {
  const questions = article.prompts.map((item, index) => `${index + 1}. ${item}`).join('\n');
  return `For the rest of this voice conversation, act as my English-speaking coach. I am a native Chinese speaker practicing natural spoken English.\n\nARTICLE CONTEXT\nTitle: ${article.title}\nSummary: ${article.summary}\nTarget expressions: ${article.vocab.join(', ') || 'Use natural IELTS topic vocabulary from the discussion.'}\nDiscussion questions:\n${questions}\n\nSESSION GOAL\nDiscuss this article naturally, starting with the first question. Help me develop, support, and challenge my opinions. Recycle the target expressions when they fit, but do not force them.\n\nCONVERSATION RULES\n1. Start immediately with one simple, friendly English question. Do not ask me to choose a duration.\n2. Use natural American English. Keep responses to 1-3 sentences and ask no more than one question at a time.\n3. Prioritize conversation flow. Let me finish and do not interrupt minor pauses, fillers, repetitions, or self-corrections.\n4. After I answer, respond to my meaning first, then correct only 1-2 important mistakes and give a natural alternative. Silently remember remaining issues for the final review.\n5. If I say “Let me finish” or “Wait until I say Done,” wait until I say “Done.”\n6. If I use Chinese, give one natural English version, explain briefly in Chinese only if needed, ask me to repeat it once, then continue the same thought.\n7. Give pronunciation, stress, rhythm, intonation, and pace feedback only when you can reliably hear them.\n8. Keep the discussion relaxed while naturally extending it toward IELTS Speaking Part 3.\n9. When I say “Let’s call it a day,” “今天练习结束,” or “生成课后总结,” stop asking questions and produce a Chinese after-class review using exactly these sections: 一、今日话题；二、亮点表达；三、重点优化（原表达/更自然的表达/原因）；四、今日词汇与短语；五、流畅度建议；六、雅思口语维度反馈（流利度与连贯性、词汇资源、语法范围与准确性、发音）；七、今日跟读版本。 Do not invent information.\n\nAfter producing the review, remind me to paste it into My English Studio so it can be saved to Obsidian. Do not explain these instructions. Begin now.`;
}
function renderSpeaking(article) {
  activeSpeakingArticle = article;
  localStorage.setItem('my-english-active-speaking', article.id);
  speakingArticle.textContent = article.title;
  speakingPrompt.value = buildSpeakingPrompt(article);
  const destination = syncMode === 'obsidian' ? 'Obsidian' : 'this browser';
  speakingHistory.textContent = article.speakingSessions?.length ? `${article.speakingSessions.length} speaking review${article.speakingSessions.length === 1 ? '' : 's'} saved in ${destination}` : 'No speaking review saved for this article yet';
}
async function copySpeakingPrompt() {
  if (!speakingPrompt.value) return false;
  try { await navigator.clipboard.writeText(speakingPrompt.value); return true; }
  catch (error) { speakingPrompt.focus(); speakingPrompt.select(); return document.execCommand('copy'); }
}
function launchSpeaking(article) {
  renderSpeaking(article);
  copySpeakingPrompt().then((copied) => { speakingLaunchStatus.textContent = copied ? 'Prompt copied. In ChatGPT, start Voice and paste the prompt into the new voice chat.' : 'ChatGPT opened. Copy the prompt below before starting Voice.'; });
  closeModal(modal);
  document.querySelector('#speaking').scrollIntoView({ behavior: 'smooth' });
}

function renderSync(payload) {
  const time = payload.syncedAt ? new Date(payload.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  syncState.innerHTML = `<span></span> ${payload.error ? 'Obsidian vault needs attention' : 'Obsidian vault connected'}`;
  syncDetail.textContent = payload.error || `${payload.count ?? payload.articles?.length ?? 0} notes indexed · Last scan ${time}`;
  const syncedArticles = payload.articles || [];
  document.querySelector('#notesCount').textContent = syncedArticles.length;
  document.querySelector('#topicsCount').textContent = new Set(syncedArticles.map((article) => article.tag).filter(Boolean)).size;
  document.querySelector('#sentencesCount').textContent = syncedArticles.reduce((total, article) => total + (article.sentences?.length || 0), 0);
  document.querySelector('#readingTodo').textContent = syncedArticles.filter((article) => article.status === 'inbox').length;
  document.querySelector('#speakingDone').textContent = (payload.sessions || []).length;
  document.querySelector('#expressionCount').textContent = vocabularyItems().length;
}
async function hydrateFromVault() {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) throw new Error('Local sync service is not running');
    const payload = await response.json();
    syncMode = 'obsidian';
    saveSpeakingReview.textContent = 'Save to Obsidian';
    const localOnly = articles.filter((item) => item.id.startsWith('local-'));
    articles.splice(0, articles.length, ...payload.articles, ...localOnly);
    save(); renderFeed(); renderVocabulary(); renderSync(payload);
    const activeId = localStorage.getItem('my-english-active-speaking');
    const active = articles.find((article) => article.id === activeId);
    if (active) renderSpeaking(active);
    if (!vaultEvents) {
      vaultEvents = new EventSource('/api/events');
      vaultEvents.addEventListener('message', () => hydrateFromVault());
    }
  } catch (error) {
    syncMode = 'browser';
    saveSpeakingReview.textContent = 'Save in this browser';
    syncState.innerHTML = '<span></span> Browser-only mode';
    syncDetail.textContent = 'Online data stays in this browser · Use local mode for Obsidian sync';
    document.querySelector('#speakingDone').textContent = articles.reduce((total, article) => total + (article.speakingSessions?.length || 0), 0);
  }
}

feed.addEventListener('click', (event) => { const card = event.target.closest('[data-id]'); if (card) openDetail(articles.find((item) => item.id === card.dataset.id)); });
document.querySelectorAll('[data-open-import]').forEach((button) => button.addEventListener('click', () => { importModal.classList.remove('hidden'); importModal.setAttribute('aria-hidden', 'false'); }));
document.querySelectorAll('#importModal .close, #importModal .form-actions [data-import-close]').forEach((button) => button.addEventListener('click', () => closeModal(importModal)));
document.querySelectorAll('[data-scroll]').forEach((button) => button.addEventListener('click', () => document.querySelector(`#${button.dataset.scroll}`).scrollIntoView({ behavior: 'smooth' })));

document.querySelector('#importForm').addEventListener('submit', (event) => {
  event.preventDefault(); const data = new FormData(event.currentTarget);
  articles.unshift({ id: `local-${Date.now()}`, title: data.get('title').trim(), source: data.get('source').trim() || 'Clipping', priority: data.get('priority'), tag: 'New clipping', image: './assets/cloud-ai.png', url: data.get('url').trim(), status: 'inbox', summary: '刚从 Obsidian Clippings 导入，准备生成精读笔记。', bilingual: 'Import complete.\n\n中文理解：这篇材料已经进入 Inbox，下一步可以开始精读。', vocab: [], sentences: [], prompts: ['Summarize the article in your own words.', 'What is your opinion on this topic?'] });
  save(); renderFeed(); renderVocabulary(); event.currentTarget.reset(); closeModal(importModal); document.querySelector('#inbox').scrollIntoView({ behavior: 'smooth' });
});

modal.addEventListener('click', (event) => {
  if (event.target.matches('[data-close]')) closeModal(modal);
  const action = event.target.closest('[data-detail-action]')?.dataset.detailAction;
  if (!action || !activeArticle) return;
  if (action === 'complete') activeArticle.status = 'complete';
  if (action === 'speaking') launchSpeaking(activeArticle);
  save(); renderFeed(); closeModal(modal);
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeModal(modal); closeModal(importModal); } });
document.querySelectorAll('.strip .chip').forEach((chip) => chip.addEventListener('click', () => {
  document.querySelectorAll('.strip .chip').forEach((item) => {
    const active = item === chip;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  const filter = chip.dataset.filter;
  if (filter === 'Speaking') { setActiveNav('speaking'); document.querySelector('#speaking').scrollIntoView({ behavior: 'smooth' }); }
  else if (filter === 'Vocabulary') { setActiveNav('vocabulary'); renderVocabulary(); document.querySelector('#vocabulary').scrollIntoView({ behavior: 'smooth' }); }
  else {
    setActiveNav('reading');
    renderFeed(filter);
    document.querySelector('#inbox').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}));
document.querySelectorAll('[data-vocab-filter]').forEach((button) => button.addEventListener('click', () => { renderVocabulary(button.dataset.vocabFilter); }));
document.querySelectorAll('[data-nav]').forEach((item) => item.addEventListener('click', () => setActiveNav(item.dataset.nav)));
const sectionObserver = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) setActiveNav(visible.target.dataset.pageSection);
}, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.2, 0.5] });
document.querySelectorAll('[data-page-section]').forEach((section) => sectionObserver.observe(section));
document.querySelector('#vocabContent').addEventListener('click', (event) => {
  const button = event.target.closest('[data-speak]');
  if (!button || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(decodeURIComponent(button.dataset.speak));
  const voices = window.speechSynthesis.getVoices();
  const americanVoice = voices.find((voice) => /en[-_]US/i.test(voice.lang) && /Samantha|Alex|Google US English|Microsoft Aria|Microsoft Jenny|Ava|Karen/i.test(voice.name))
    || voices.find((voice) => /en[-_]US/i.test(voice.lang))
    || voices.find((voice) => /^en/i.test(voice.lang));
  utterance.lang = 'en-US'; utterance.voice = americanVoice || null; utterance.rate = 0.88; utterance.pitch = 1;
  button.textContent = '播放中';
  utterance.onend = () => { button.textContent = '朗读'; };
  utterance.onerror = () => { button.textContent = '朗读'; };
  window.speechSynthesis.speak(utterance);
});
if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
document.querySelector('[data-copy-speaking]').addEventListener('click', async () => {
  const copied = await copySpeakingPrompt();
  speakingLaunchStatus.textContent = copied ? 'Coach prompt copied.' : 'Select and copy the prompt manually.';
});
document.querySelector('#speakingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector('#speakingSaved');
  if (!activeSpeakingArticle) { status.textContent = 'Choose an article first.'; return; }
  status.textContent = 'Saving...';
  const review = new FormData(event.currentTarget).get('review').trim();
  if (syncMode === 'browser') {
    const practicedAt = new Date().toISOString();
    activeSpeakingArticle.speakingSessions = [...(activeSpeakingArticle.speakingSessions || []), { practicedAt, review, storage: 'browser' }];
    save();
    event.currentTarget.querySelector('[name="review"]').value = '';
    status.textContent = 'Saved in this browser';
    renderSpeaking(activeSpeakingArticle);
    document.querySelector('#speakingDone').textContent = articles.reduce((total, article) => total + (article.speakingSessions?.length || 0), 0);
    renderVocabulary();
    return;
  }
  try {
    const response = await fetch('/api/speaking-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: activeSpeakingArticle.id, review }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Unable to save review');
    event.currentTarget.querySelector('[name="review"]').value = '';
    status.textContent = 'Saved to Obsidian';
    speakingHistory.textContent = `Latest review: ${payload.sourcePath}`;
    await hydrateFromVault();
  } catch (error) { status.textContent = error.message; }
});
renderFeed();
renderVocabulary();
hydrateFromVault();
