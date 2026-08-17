const articles = [
  {
    title: 'Cloud Spending Soars As Hyperscalers Up AI Investment',
    source: 'TechRadar',
    priority: 'A 精读',
    tag: 'AI infrastructure spending',
    image: './assets/cloud-ai.png',
    summary:
      'Cloud spending is rising rapidly as hyperscalers pour money into AI infrastructure, creating a strong IELTS reading and speaking thread.',
    bilingual:
      'Cloud spending is rising rapidly as the largest providers increase investment in AI infrastructure. \n\n中文理解：云支出上涨和 AI 基建投资被直接绑定，这篇适合练趋势、预测、比较和因果链表达。',
    vocab: ['cloud spending', 'hyperscalers', 'ramp up investment', 'landmark high'],
    sentences: [
      'As demand for AI services grows, cloud providers are likely to ramp up investment in infrastructure.',
      'The deeper point is that AI competition is also infrastructure competition.'
    ],
    prompts: [
      'Why do cloud providers need to spend more when AI demand rises?',
      'Is infrastructure more important than algorithms in the AI race?'
    ]
  },
  {
    title: 'Alibaba Slashes Prices For Cloud Products',
    source: 'Investopedia',
    priority: 'B 泛读+摘表达',
    tag: 'Cloud pricing strategy',
    image: './assets/cloud-ai.png',
    summary:
      'Alibaba Cloud cut international prices as part of its AI push, which makes this a useful business and globalization case.',
    bilingual:
      'Alibaba Cloud cut prices for international customers as part of a broader AI strategy. \n\n中文理解：这是价格战、国际化和 AI 资源可及性的结合点。',
    vocab: ['slash prices', 'price cuts', 'international customers', 'in an AI push'],
    sentences: [
      'By cutting prices for international customers, Alibaba Cloud may make its services more attractive to AI developers.',
      'Price cuts may attract customers, but they can also reduce margins.'
    ],
    prompts: [
      'When do price cuts help a company expand?',
      'Can cheaper cloud services accelerate AI adoption?'
    ]
  }
];

const feed = document.querySelector('#feed');
const modal = document.querySelector('#detailModal');
const detailTitle = document.querySelector('#detailTitle');
const detailSummary = document.querySelector('#detailSummary');
const detailImage = document.querySelector('#detailImage');
const detailMeta = document.querySelector('#detailMeta');
const detailBilingual = document.querySelector('#detailBilingual');
const detailVocab = document.querySelector('#detailVocab');
const detailSentences = document.querySelector('#detailSentences');
const detailPrompts = document.querySelector('#detailPrompts');

function renderFeed() {
  feed.innerHTML = articles
    .map(
      (item, index) => `
        <article class="feed-card" data-index="${index}">
          <img src="${item.image}" alt="${item.title}">
          <div class="stack">
            <div class="meta">
              <span class="pill ${index === 0 ? 'gold' : 'green'}">${item.priority}</span>
              <span class="pill">${item.source}</span>
            </div>
            <h4>${item.title}</h4>
            <p>${item.summary}</p>
            <div class="row">
              <span class="pill">${item.tag}</span>
              <span class="pill">Obsidian synced</span>
            </div>
          </div>
        </article>
      `
    )
    .join('');
}

function openDetail(index) {
  const article = articles[index];
  detailTitle.textContent = article.title;
  detailSummary.textContent = article.summary;
  detailImage.src = article.image;
  detailImage.alt = article.title;
  detailMeta.innerHTML = `
    <span class="pill ${index === 0 ? 'gold' : 'green'}">${article.priority}</span>
    <span class="pill">${article.source}</span>
    <span class="pill">${article.tag}</span>
  `;
  detailBilingual.textContent = article.bilingual;
  detailVocab.innerHTML = article.vocab.map((v) => `<span class="pill">${v}</span>`).join('');
  detailSentences.innerHTML = article.sentences.map((s) => `<p>${s}</p>`).join('');
  detailPrompts.innerHTML = article.prompts.map((s) => `<p>${s}</p>`).join('');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDetail() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

feed.addEventListener('click', (event) => {
  const card = event.target.closest('[data-index]');
  if (!card) return;
  openDetail(Number(card.dataset.index));
});

modal.addEventListener('click', (event) => {
  if (event.target.matches('[data-close]')) closeDetail();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDetail();
});

renderFeed();
