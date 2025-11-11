/* script.js
 * Doctor Who Episodes Explorer
 * Eva — FINAL VERSION (Enhanced Filters Added)
 *
 * ✅ Fixes implemented:
 * 🟥 Added space in status bar
 * 🟧 Adjusted numeric sort fallback
 * 🟧 Added visible focus outline (CSS note included below)
 * 🟩 Added console.log for fallback data sources
 * 🟩 Cleaned join spacing for writers
 * 🟦 Added Enhanced Filters (Era / Doctor / Companion)
 *
 * Specification references:
 * - Exam Specification (Tier 1–3)
 * - Student Instructions (Grading & Edge Cases)
 */

/* =========================
   DOM elements
========================= */
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const tableEl = document.getElementById('episodes-table');
const tbodyEl = document.getElementById('episodes-body');
const noResultsEl = document.getElementById('no-results');
const nameFilterEl = document.getElementById('name-filter');
const statusBarEl = document.getElementById('status-bar');
const resultsCountEl = document.getElementById('results-count');
const warningCountEl = document.getElementById('warning-count');

// 🆕 Enhanced Filters
const eraFilterEl = document.getElementById('era-filter');
const doctorFilterEl = document.getElementById('doctor-filter');
const companionFilterEl = document.getElementById('companion-filter');
const exportBtnEl = document.getElementById('export-btn');

const thEls = Array.from(document.querySelectorAll('#episodes-table thead th'));

/* =========================
   Data source configuration
========================= */
const CHUNK_URLS = [
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
];

const REMOTE_URL =
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json';

const LOCAL_FALLBACK = './data.json';

/* =========================
   State
========================= */
let rawEpisodes = [];
let normalized = [];
let currentRows = [];
let sortOrder = [{ key: 'rank', dir: 'asc' }];
let validationWarnings = 0;

/* =========================
   Utilities
========================= */
function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function normalizeWriter(writer) {
  if (!writer || typeof writer !== 'string') return '—';
  const parts = writer
    .split(/(?:\s*&\s*|\s+and\s+|,\s*)/i)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.join(', ');
}

function companionText(companion) {
  if (!companion) return '—';
  const a = companion.actor || '';
  const c = companion.character || '';
  if (!a && !c) return '—';
  if (a && c) return `${a} (${c})`;
  return a || c || '—';
}

function doctorText(doctor) {
  if (!doctor) return '—';
  const a = doctor.actor || '';
  const inc = doctor.incarnation || '';
  if (a && inc) return `${a} (${inc})`;
  return a || inc || '—';
}

function safeText(s) {
  if (s === null || s === undefined) return '—';
  return String(s);
}

function parseBroadcast(dateStr) {
  if (!dateStr) return { year: '—', dateObj: null };
  let yearOut = '—';
  let dateObj = null;
  const s = String(dateStr).trim();
  const mYear = s.match(/^(\d{4})$/);
  if (mYear) {
    yearOut = mYear[1];
    dateObj = new Date(Number(yearOut), 0, 1);
    return { year: yearOut, dateObj };
  }
  const mDMY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mDMY) {
    const [_, dd, mm, yyyy] = mDMY;
    yearOut = yyyy;
    dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return { year: yearOut, dateObj };
  }
  const tryDate = new Date(s);
  if (!isNaN(tryDate.getTime())) {
    yearOut = String(tryDate.getFullYear());
    dateObj = tryDate;
    return { year: yearOut, dateObj };
  }
  return { year: '—', dateObj: null };
}

function cmp(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
}

function applySort(rows, order = sortOrder) {
  if (!order || order.length === 0) return rows;
  const copy = rows.slice();
  copy.sort((r1, r2) => {
    for (const { key, dir } of order) {
      let v1 = r1[key];
      let v2 = r2[key];
      if (key === 'series') {
        const toSeriesRank = v =>
          typeof v === 'number' ? { cat: 0, val: v } : { cat: 1, val: String(v) };
        const s1 = toSeriesRank(v1);
        const s2 = toSeriesRank(v2);
        const primary = s1.cat - s2.cat;
        if (primary !== 0) return dir === 'asc' ? primary : -primary;
        const sec = cmp(s1.val, s2.val);
        if (sec !== 0) return dir === 'asc' ? sec : -sec;
        continue;
      }
      if (key === 'year') {
        const n1 = isNaN(Number(v1)) ? Infinity : Number(v1);
        const n2 = isNaN(Number(v2)) ? Infinity : Number(v2);
        if (n1 !== n2) return dir === 'asc' ? n1 - n2 : n2 - n1;
        continue;
      }
      const c = cmp(v1, v2);
      if (c !== 0) return dir === 'asc' ? c : -c;
    }
    return 0;
  });
  return copy;
}

function smartRelevanceSort(rows, term) {
  if (!term) return rows;
  const q = term.toLowerCase();
  const score = row => {
    const title = (row.title || '').toLowerCase();
    const whole = title === q ? 0 : Infinity;
    const titleContains = title.includes(q) ? 1 : Infinity;
    const anyContains =
      Object.keys(row).some(k => String(row[k] ?? '').toLowerCase().includes(q)) ? 2 : Infinity;
    const byRank = Number.isFinite(+row.rank) ? +row.rank : 999999;
    return [whole, titleContains, anyContains, byRank];
  };
  const copy = rows.slice();
  copy.sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) return sa[i] - sb[i];
    }
    return 0;
  });
  return copy;
}

/* =========================
   Data loading
========================= */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function loadChunks() {
  const all = await Promise.all(CHUNK_URLS.map(fetchJSON));
  const episodes = [];
  for (const part of all) {
    if (part && Array.isArray(part.episodes)) {
      episodes.push(...part.episodes);
    } else if (Array.isArray(part)) {
      episodes.push(...part);
    }
  }
  return { episodes };
}

async function loadData() {
  showLoading(true);
  showError(null);
  try {
    const d = await loadChunks();
    console.log('✅ Loaded from CHUNK_URLS (bonus source)');
    return d;
  } catch (_) {
    console.log('⚠️ Chunked source failed, trying REMOTE_URL');
  }
  try {
    const d = await fetchJSON(REMOTE_URL);
    console.log('✅ Loaded from REMOTE_URL');
    return d;
  } catch (_) {
    console.log('⚠️ Remote failed, trying LOCAL_FALLBACK');
  }
  try {
    const d = await fetchJSON(LOCAL_FALLBACK);
    console.log('✅ Loaded from LOCAL_FALLBACK');
    return d;
  } catch (err) {
    throw new Error(`Failed to load data. (${err.message})`);
  }
}

/* =========================
   Validation
========================= */
function validateEpisodes(episodes) {
  const warnings = [];
  const ranks = new Map();
  const now = new Date();
  const addWarn = msg => warnings.push(msg);
  for (const ep of episodes) {
    const required = ['rank', 'title', 'era', 'doctor'];
    for (const key of required) {
      if (ep[key] === undefined || ep[key] === null || ep[key] === '') {
        addWarn(`Missing required field "${key}" for episode "${ep.title ?? '(unknown)'}"`);
      }
    }
    if (ep.rank !== undefined) {
      const r = String(ep.rank);
      if (ranks.has(r)) {
        addWarn(`Duplicate rank detected: ${ep.rank} ("${ep.title}")`);
      } else {
        ranks.set(r, ep.title || '(unknown)');
      }
    }
    if (typeof ep.series === 'number' && ep.series < 0) {
      addWarn(`Negative series number for "${ep.title}"`);
    }
    if (ep.broadcast_date) {
      const { dateObj } = parseBroadcast(ep.broadcast_date);
      if (dateObj && dateObj.getTime() > now.getTime()) {
        addWarn(`Future broadcast date for "${ep.title}"`);
      }
    }
  }
  validationWarnings = warnings.length;
  return warnings;
}

/* =========================
   Normalization
========================= */
function normalizeEpisodes(episodes) {
  return episodes.map(ep => {
    const { year } = parseBroadcast(ep.broadcast_date);
    return {
      rank: ep.rank ?? null,
      title: safeText(ep.title),
      series: typeof ep.series === 'number' ? ep.series : safeText(ep.series),
      era: safeText(ep.era),
      year: year,
      director: safeText(ep.director),
      writer: normalizeWriter(ep.writer),
      doctor: doctorText(ep.doctor),
      companion: companionText(ep.companion),
      castCount: Array.isArray(ep.cast) ? ep.cast.length : 0,
      _raw: ep
    };
  });
}

/* =========================
   Rendering
========================= */
function renderRows(rows) {
  tbodyEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.tabIndex = 0;
    tr.innerHTML = `
      <td>${row.rank ?? '—'}</td>
      <td>${row.title}</td>
      <td>${row.series}</td>
      <td>${row.era}</td>
      <td>${row.year}</td>
      <td>${row.director}</td>
      <td>${row.writer}</td>
      <td>${row.doctor}</td>
      <td>${row.companion}</td>
      <td><span class="cast-count">${row.castCount}</span></td>
    `;
    frag.appendChild(tr);
  }
  tbodyEl.appendChild(frag);
}

function updateStatusBar(visibleCount) {
  statusBarEl.style.display = 'flex';
  resultsCountEl.textContent = `${visibleCount} episode${visibleCount === 1 ? '' : 's'} shown `;
  warningCountEl.textContent =
    validationWarnings > 0 ? `Warnings: ${validationWarnings}` : 'Warnings: 0';
}

/* =========================
   Filtering + Sorting
========================= */
function getFilterTerm() {
  return nameFilterEl.value.trim();
}

function applyFilterAndSort() {
  const term = getFilterTerm().toLowerCase();

  // 🆕 Enhanced filter logic
  let filtered = normalized.filter(r => {
    const matchesName = String(r.title).toLowerCase().includes(term);
    const matchesEra = !eraFilterEl.value || r.era === eraFilterEl.value;
    const matchesDoctor = !doctorFilterEl.value || r.doctor === doctorFilterEl.value;
    const matchesCompanion = !companionFilterEl.value || r.companion === companionFilterEl.value;
    return matchesName && matchesEra && matchesDoctor && matchesCompanion;
  });

  if (term) filtered = smartRelevanceSort(filtered, term);
  const sorted = applySort(filtered, sortOrder);
  currentRows = sorted;
  renderRows(sorted);
  tableEl.style.display = sorted.length ? 'table' : 'none';
  noResultsEl.style.display = sorted.length ? 'none' : 'block';
  updateStatusBar(sorted.length);
}

/* =========================
   Populate Enhanced Filters
========================= */
function populateDropdowns(episodes) {
  const doctors = new Set();
  const companions = new Set();

  episodes.forEach(ep => {
    if (ep.doctor && ep.doctor !== '—') doctors.add(ep.doctor);
    if (ep.companion && ep.companion !== '—') companions.add(ep.companion);
  });

  doctorFilterEl.innerHTML =
    '<option value="">All</option>' +
    Array.from(doctors)
      .sort()
      .map(d => `<option value="${d}">${d}</option>`)
      .join('');

  companionFilterEl.innerHTML =
    '<option value="">All</option>' +
    Array.from(companions)
      .sort()
      .map(c => `<option value="${c}">${c}</option>`)
      .join('');
}

/* =========================
   Sorting UI
========================= */
function clearSortIndicators() {
  thEls.forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
}

function setSortIndicator() {
  clearSortIndicators();
  if (!sortOrder.length) return;
  const primary = sortOrder[0];
  const th = thEls.find(t => t.dataset.sort === primary.key);
  if (th) th.classList.add(primary.dir === 'asc' ? 'sort-asc' : 'sort-desc');
}

function toggleSort(key, multi = false) {
  if (multi) {
    const idx = sortOrder.findIndex(s => s.key === key);
    if (idx === -1) sortOrder.push({ key, dir: 'asc' });
    else {
      const cur = sortOrder[idx];
      if (cur.dir === 'asc') cur.dir = 'desc';
      else sortOrder.splice(idx, 1);
    }
  } else {
    const existing = sortOrder.find(s => s.key === key);
    if (!existing) sortOrder = [{ key, dir: 'asc' }];
    else {
      existing.dir = existing.dir === 'asc' ? 'desc' : 'asc';
      sortOrder = [existing];
    }
  }
  setSortIndicator();
  applyFilterAndSort();
}

/* =========================
   Keyboard Navigation
========================= */
thEls.forEach(th => {
  th.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      toggleSort(th.dataset.sort, e.shiftKey);
    }
  });
  th.addEventListener('click', e => {
    toggleSort(th.dataset.sort, e.shiftKey);
  });
});

tbodyEl.addEventListener('keydown', e => {
  const rows = Array.from(tbodyEl.querySelectorAll('tr'));
  const idx = rows.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = Math.min(idx + 1, rows.length - 1);
    if (rows[next]) rows[next].focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = Math.max(idx - 1, 0);
    if (rows[prev]) rows[prev].focus();
  }
});

/* =========================
   Loading / Error helpers
========================= */
function showLoading(show) {
  loadingEl.style.display = show ? 'block' : 'none';
}
function showError(msg) {
  if (!msg) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  } else {
    errorEl.style.display = 'block';
    errorEl.textContent = msg;
  }
}

/* =========================
   Init
========================= */
async function init() {
  try {
    const data = await loadData();
    const episodes = Array.isArray(data?.episodes) ? data.episodes : Array.isArray(data) ? data : [];
    const warnings = validateEpisodes(episodes);
    if (warnings.length) console.warn('[Validation warnings]', warnings);
    rawEpisodes = episodes;
    normalized = normalizeEpisodes(rawEpisodes);
    setSortIndicator();

    // 🆕 Populate dropdowns and bind events
    populateDropdowns(normalized);
    applyFilterAndSort();
    nameFilterEl.addEventListener('input', debounce(applyFilterAndSort, 150));
    eraFilterEl.addEventListener('change', applyFilterAndSort);
    doctorFilterEl.addEventListener('change', applyFilterAndSort);
    companionFilterEl.addEventListener('change', applyFilterAndSort);

    // ✅ Correctly placed CSV export binding
    exportBtnEl.addEventListener('click', exportToCSV);
  } catch (err) {
    console.error(err);
    showError(`Failed to load episodes. (${err.message})`);
    tableEl.style.display = 'none';
    noResultsEl.style.display = 'none';
  } finally {
    showLoading(false);
  }
}

/* =========================
   Export to CSV (Bonus Feature)
========================= */
function exportToCSV() {
  if (!currentRows || !currentRows.length) {
    alert('No episodes to export.');
    return;
  }

  const headers = [
    'Rank',
    'Title',
    'Series',
    'Era',
    'Broadcast Year',
    'Director',
    'Writer',
    'Doctor',
    'Companion',
    'Cast Count'
  ];

  const csvContent = [
    headers.join(','),
    ...currentRows.map(r =>
      [
        r.rank ?? '',
        `"${r.title.replace(/"/g, '""')}"`,
        r.series,
        r.era,
        r.year,
        `"${r.director.replace(/"/g, '""')}"`,
        `"${r.writer.replace(/"/g, '""')}"`,
        `"${r.doctor.replace(/"/g, '""')}"`,
        `"${r.companion.replace(/"/g, '""')}"`,
        r.castCount
      ].join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'doctor-who-episodes.csv';
  link.click();
}

init();

/* =========================
   CSS NOTE for visible focus outline:
   tr:focus {
     outline: 2px solid #0078d7;
     outline-offset: -2px;
   }
========================= */
