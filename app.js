let allItems = [];

async function init() {
  // Prefer inline data (works for file://) then fall back to fetch
  if (window.COLLECTION_DATA) {
    allItems = window.COLLECTION_DATA;
  } else {
    try {
      const res = await fetch('data.json');
      allItems = await res.json();
    } catch {
      allItems = [];
    }
  }
  populateCategoryFilter();
  render();
  wireEvents();
}

function populateCategoryFilter() {
  const sel = document.getElementById('category-filter');
  const cats = [...new Set(allItems.map(i => i.category).filter(Boolean))].sort();
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function filteredItems() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const cat = document.getElementById('category-filter').value;
  return allItems.filter(item => {
    const matchCat = !cat || item.category === cat;
    const matchQ = !q || [item.name, item.set, item.category, item.language]
      .join(' ').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

function render() {
  const items = filteredItems();
  const activeTab = document.querySelector('.tab.active').dataset.tab;
  const n = items.length;
  document.getElementById('count').textContent = `${n} item${n !== 1 ? 's' : ''}`;
  if (activeTab === 'grid') renderGrid(items);
  else renderTimeline(items);
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function renderGrid(items) {
  const grid = document.getElementById('card-grid');
  const empty = document.getElementById('empty-grid');
  grid.innerHTML = '';

  if (!items.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-img-wrap">
        ${item.image
          ? `<img class="card-img" src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" />`
          : `<div class="card-img-placeholder"><span class="ph-icon">📦</span><span class="ph-text">No image</span></div>`}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(item.name)}</div>
        <div class="card-set">${esc(item.set)}</div>
        <div class="card-footer">
          ${categoryBadge(item.category)}
          ${item.acquired ? `<span class="badge badge-date">${formatDate(item.acquired)}</span>` : ''}
        </div>
      </div>`;
    card.addEventListener('click', () => openModal(item));
    grid.appendChild(card);
  });
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function renderTimeline(items) {
  const tl = document.getElementById('timeline');
  tl.innerHTML = '';

  if (!items.length) {
    tl.innerHTML = '<p class="empty">No items match your filter.</p>';
    return;
  }

  const groups = {};
  items.forEach(item => {
    const key = item.acquired ? monthKey(item.acquired) : 'Unknown';
    (groups[key] = groups[key] || []).push(item);
  });

  Object.entries(groups).forEach(([month, monthItems]) => {
    const group = document.createElement('div');
    group.className = 'tl-group';
    group.innerHTML = `<div class="tl-date-label">${month}</div>`;

    monthItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'tl-item';
      el.innerHTML = `
        <div class="tl-thumb-wrap">
          ${item.image
            ? `<img class="tl-thumb" src="${esc(item.image)}" alt="" loading="lazy" />`
            : `<div class="tl-thumb-placeholder">📦</div>`}
        </div>
        <div class="tl-info">
          <div class="tl-name">${esc(item.name)}</div>
          <div class="tl-set">${esc(item.set)}${item.language && item.language !== 'English' ? ` · ${esc(item.language)}` : ''}</div>
          <div class="tl-badges">
            ${categoryBadge(item.category)}
            ${item.acquired ? `<span class="badge badge-date">${formatDate(item.acquired)}</span>` : ''}
          </div>
        </div>`;
      el.addEventListener('click', () => openModal(item));
      group.appendChild(el);
    });

    tl.appendChild(group);
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(item) {
  const content = document.getElementById('modal-content');
  const hasMeta = item.acquired || item.price;
  content.innerHTML = `
    <div class="modal-img-wrap">
      ${item.image
        ? `<img class="modal-img" src="${esc(item.image)}" alt="${esc(item.name)}" />`
        : `<div class="modal-img-placeholder">📦</div>`}
    </div>
    <div class="modal-body">
      <div class="modal-title">${esc(item.name)}</div>
      <div class="modal-set">${esc(item.set)}</div>
      <div class="modal-badges">
        ${categoryBadge(item.category)}
        ${item.condition ? `<span class="badge badge-sealed">${esc(item.condition)}</span>` : ''}
        ${item.language && item.language !== 'English' ? `<span class="badge badge-lang">${esc(item.language)}</span>` : ''}
        ${item.price ? `<span class="badge badge-price">${esc(item.price)}</span>` : ''}
      </div>
      ${hasMeta ? `
      <div class="modal-meta">
        ${item.acquired ? `<div class="meta-item"><label>Acquired</label><span>${formatDate(item.acquired)}</span></div>` : ''}
        ${item.price ? `<div class="meta-item"><label>Paid</label><span>${esc(item.price)}</span></div>` : ''}
      </div>` : ''}
      ${item.notes ? `<div class="modal-notes">${esc(item.notes)}</div>` : ''}
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Events ────────────────────────────────────────────────────────────────────

function wireEvents() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const isGrid = btn.dataset.tab === 'grid';
      document.getElementById('grid-view').classList.toggle('hidden', !isGrid);
      document.getElementById('timeline-view').classList.toggle('hidden', isGrid);
      render();
    });
  });

  document.getElementById('search').addEventListener('input', render);
  document.getElementById('category-filter').addEventListener('change', render);

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function monthKey(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric'
  });
}

function categoryBadge(cat) {
  if (!cat) return '';
  const cls = cat.toLowerCase().includes('elite trainer') ? 'badge-etb'
            : cat.toLowerCase().includes('booster box')   ? 'badge-box'
            : 'badge-other';
  return `<span class="badge ${cls}">${esc(cat)}</span>`;
}

init();
