// Doctor Who Episodes Explorer - wired to local json/episodes.json
// Place your provided JSON in a file named "episodes.json" next to index.html.
// Serve the folder via a local HTTP server (e.g., VS Code Live Server, python -m http.server).

// Feature flags
const VALIDATION = true;
const KEYBOARD_NAV = true;
const RELEVANCE_SORT = true;
const PAGINATION = true;
const ENHANCED_FILTERS = true;
const CSV_EXPORT = true;

// Local data path (uses your attached structure: { "episodes": [ ... ] })
const LOCAL_JSON = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json';

// DOM
const tbody = document.getElementById('tbody');
const table = document.getElementById('episodesTable');
const theadButtons = Array.from(table.querySelectorAll('thead th > button'));
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const errorText = document.getElementById('errorText');
const errorDetails = document.getElementById('errorDetails');
const errorDebug = document.getElementById('errorDebug');
const retryBtn = document.getElementById('retry');
const searchInput = document.getElementById('search');
const warnBadge = document.getElementById('warnBadge');
const eraFilter = document.getElementById('eraFilter');
const doctorFilter = document.getElementById('doctorFilter');
const companionFilter = document.getElementById('companionFilter');
const exportBtn = document.getElementById('exportCsv');
const pager = document.getElementById('pager');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// State
let allEpisodes = [];
let viewEpisodes = [];
let sortState = { col: 'rank', dir: 'asc', multi: [] };
let filterText = '';
let filterEra = '';
let filterDoctor = '';
let filterCompanion = '';
let page = 1;
let pageSize = 50;
let focusedRowIndex = -1;

// Helpers
const safeText = v => (v ?? '').toString();

function parseYear(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}$/.test(s)) return +s;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return +iso[1];
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return +dmy[3];
  const long = s.match(/^[A-Za-z]+ \d{1,2}, (\d{4})$/);
  if (long) return +long[1];
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getFullYear() : '';
}

function parseDateKey(dateStr) {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const s = String(dateStr).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}`).getTime();
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`).getTime();
  const long = s.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (long) return new Date(s).getTime();
  if (/^\d{4}$/.test(s)) return new Date(`${s}-01-01`).getTime();
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getTime() : Number.POSITIVE_INFINITY;
}

function normalizeEpisode(ep) {
  const year = parseYear(ep.broadcast_date);
  const dateKey = parseDateKey(ep.broadcast_date);
  const doctor = ep.doctor
    ? `${safeText(ep.doctor.actor)} (${safeText(ep.doctor.incarnation)})`
    : '—';
  const companion = ep.companion
    ? `${safeText(ep.companion.actor)} (${safeText(ep.companion.character)})`
    : '—';
  const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;
  const writers = safeText(ep.writer)
    .replace(/\s+&\s+/g, ' & ')
    .replace(/\sand\s/gi, ' & ');
  return {
    ...ep,
    _year: year,
    _dateKey: dateKey,
    _doctorFmt: doctor,
    _companionFmt: companion,
    _castCount: castCount,
    _writersFmt: writers
  };
}

// Validation
function validateEpisodes(arr) {
  let warnings = 0;
  const seenRanks = new Set();
  const now = Date.now();
  for (const ep of arr) {
    const missing = ['rank','title','series','era','broadcast_date'].filter(k => ep[k] == null);
    if (missing.length) { console.warn('Missing fields', ep.rank, missing, ep); warnings++; }
    if (typeof ep.series === 'number' && ep.series < 0) { console.warn('Negative series', ep); warnings++; }
    if (typeof ep.rank !== 'number') { console.warn('Invalid rank', ep.rank, ep); warnings++; }
    else {
      if (seenRanks.has(ep.rank)) { console.warn('Duplicate rank', ep.rank, ep); warnings++; }
      seenRanks.add(ep.rank);
    }
    const dk = parseDateKey(ep.broadcast_date);
    if (Number.isFinite(dk) && dk > now) { console.warn('Future date', ep.broadcast_date, ep); warnings++; }
  }
  return warnings;
}

// Sorting
function compare(a, b, col, dir) {
  const mul = dir === 'asc' ? 1 : -1;
  const cmpStr = (x, y) => (x > y ? 1 : x < y ? -1 : 0) * mul;
  switch (col) {
    case 'rank': return ((a.rank ?? 0) - (b.rank ?? 0)) * mul;
    case 'title': return cmpStr(safeText(a.title).toLowerCase(), safeText(b.title).toLowerCase());
    case 'series': {
      const an = typeof a.series === 'number' ? a.series : Number.NEGATIVE_INFINITY;
      const bn = typeof b.series === 'number' ? b.series : Number.NEGATIVE_INFINITY;
      return (an - bn) * mul;
    }
    case 'era': return cmpStr(safeText(a.era).toLowerCase(), safeText(b.era).toLowerCase());
    case 'year': return ((a._year || 0) - (b._year || 0)) * mul;
    case 'director': return cmpStr(safeText(a.director).toLowerCase(), safeText(b.director).toLowerCase());
    case 'writer': return cmpStr(safeText(a._writersFmt).toLowerCase(), safeText(b._writersFmt).toLowerCase());
    case 'doctor': return cmpStr(safeText(a._doctorFmt).toLowerCase(), safeText(b._doctorFmt).toLowerCase());
    case 'companion': return cmpStr(safeText(a._companionFmt).toLowerCase(), safeText(b._companionFmt).toLowerCase());
    case 'castCount': return ((a._castCount || 0) - (b._castCount || 0)) * mul;
    case 'date': return ((a._dateKey || 0) - (b._dateKey || 0)) * mul;
    default: return 0;
  }
}

function applySort(arr) {
  const data = arr.slice();
  if (RELEVANCE_SORT && filterText.trim()) {
    const q = filterText.trim().toLowerCase();
    const score = (e) => {
      const t = safeText(e.title).toLowerCase();
      if (t === q) return 0;
      if (t.includes(q)) return 1;
      const any = [e._writersFmt, e.director, e.era, e._doctorFmt, e._companionFmt].map(safeText).join(' ').toLowerCase();
      if (any.includes(q)) return 2;
      return 3;
    };
    data.sort((a, b) => {
      const sa = score(a), sb = score(b);
      if (sa !== sb) return sa - sb;
      return (a.rank ?? 0) - (b.rank ?? 0);
    });
    return data;
  }

  if (sortState.multi.length) {
    data.sort((a, b) => {
      for (const lvl of sortState.multi) {
        const r = compare(a, b, lvl.col, lvl.dir);
        if (r !== 0) return r;
      }
      return 0;
    });
    return data;
  }
  return data.sort((a, b) => compare(a, b, sortState.col, sortState.dir));
}

function clearAriaSort() {
  table.querySelectorAll('thead th').forEach(th => th.setAttribute('aria-sort', 'none'));
}
function setAriaSort(col, dir) {
  clearAriaSort();
  const btn = theadButtons.find(b => b.dataset.col === col);
  if (btn) btn.closest('th').setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
}

// Render
function renderTable(arr) {
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  // Pagination
  let subset = arr;
  let pages = 1;
  if (PAGINATION) {
    pages = Math.max(1, Math.ceil(arr.length / pageSize));
    page = Math.min(Math.max(1, page), pages);
    const start = (page - 1) * pageSize;
    subset = arr.slice(start, start + pageSize);
    pager.hidden = false;
    pageInfo.textContent = `Page ${page} / ${pages}`;
    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= pages;
  } else {
    pager.hidden = true;
  }

  subset.forEach((e, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.index = String(idx);
    const cells = [
      e.rank ?? '',
      safeText(e.title || '(untitled)'),
      typeof e.series === 'number' ? e.series : safeText(e.series),
      safeText(e.era),
      e._year ?? '',
      safeText(e.director),
      safeText(e._writersFmt),
      safeText(e._doctorFmt),
      safeText(e._companionFmt),
      e._castCount ?? 0
    ];
    for (const val of cells) {
      const td = document.createElement('td');
      td.textContent = String(val);
      tr.appendChild(td);
    }
    if (KEYBOARD_NAV) tr.tabIndex = -1;
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
  if (KEYBOARD_NAV) attachRowKeyboardHandlers();
}

// Filters/pipeline
function applyFilters() {
  const q = filterText.trim().toLowerCase();
  const byText = (e) => {
    if (!q) return true;
    const fields = [e.title, e._writersFmt, e.director, e.era, e._doctorFmt, e._companionFmt].map(safeText).join(' ').toLowerCase();
    return fields.includes(q);
  };
  const byEra = (e) => !filterEra || safeText(e.era) === filterEra;
  const byDoctor = (e) => !filterDoctor || safeText(e._doctorFmt) === filterDoctor;
  const byCompanion = (e) => !filterCompanion || safeText(e._companionFmt) === filterCompanion;

  let arr = allEpisodes.filter(e => byText(e) && byEra(e) && byDoctor(e) && byCompanion(e));
  arr = applySort(arr);
  viewEpisodes = arr;
  page = 1;
  renderTable(arr);
}

function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Keyboard nav
function attachRowKeyboardHandlers() {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (!rows.length) return;
  if (focusedRowIndex < 0) focusedRowIndex = 0;
  rows.forEach(r => { r.classList.remove('focused'); r.tabIndex = -1; });
  const cur = rows[focusedRowIndex] || rows[0];
  cur.tabIndex = 0; cur.classList.add('focused');
  tbody.addEventListener('keydown', onTbodyKey);
  cur.focus();
}
function onTbodyKey(e) {
  if (!KEYBOARD_NAV) return;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (!rows.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); focusedRowIndex = Math.min(rows.length - 1, focusedRowIndex + 1); updateFocus(rows); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusedRowIndex = Math.max(0, focusedRowIndex - 1); updateFocus(rows); }
}
function updateFocus(rows) {
  rows.forEach(r => { r.tabIndex = -1; r.classList.remove('focused'); });
  const cur = rows[focusedRowIndex]; if (cur) { cur.tabIndex = 0; cur.classList.add('focused'); cur.scrollIntoView({ block: 'nearest' }); cur.focus(); }
}

// CSV export
function escapeCsvField(field) {
  if (field == null) return '';
  let s = String(field);
  const needs = /[",\n\r]/.test(s);
  if (s.includes('"')) s = s.replace(/"/g, '""');
  return needs ? `"${s}"` : s;
}
function exportCSV(rows) {
  const headers = ['Rank','Title','Series','Era','Broadcast Year','Director','Writer','Doctor','Companion','Cast Count'];
  const lines = [headers.map(escapeCsvField).join(',')];
  rows.forEach(e => {
    lines.push([
      e.rank ?? '',
      safeText(e.title || '(untitled)'),
      typeof e.series === 'number' ? e.series : safeText(e.series),
      safeText(e.era),
      e._year ?? '',
      safeText(e.director),
      safeText(e._writersFmt),
      safeText(e._doctorFmt),
      safeText(e._companionFmt),
      e._castCount ?? 0
    ].map(escapeCsvField).join(','));
  });
  const csv = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'doctor-who-episodes.csv'; a.click();
  URL.revokeObjectURL(a.href);
}

// Fetch from local episodes.json (attached format)
async function fetchAll() {
  showLoading(true); hideError();
  try {
    const resp = await fetch(LOCAL_JSON);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const raw = Array.isArray(json) ? json : Array.isArray(json.episodes) ? json.episodes : [];
    if (!raw.length) throw new Error('No episodes array found in JSON');

    allEpisodes = raw.map(normalizeEpisode);

    if (VALIDATION) {
      const warns = validateEpisodes(allEpisodes);
      if (warns > 0) { warnBadge.hidden = false; warnBadge.textContent = `Warnings: ${warns}`; }
      else warnBadge.hidden = true;
    }

    if (ENHANCED_FILTERS) populateFilters(allEpisodes);

    sortState = { col: 'rank', dir: 'asc', multi: [] };
    initAriaSort();
    applyFilters();
  } catch (err) {
    showError(`Failed to load episode data. ${err.message}`, { urlTried: LOCAL_JSON, error: String(err) });
  } finally {
    showLoading(false);
  }
}

// UI helpers
function showLoading(show) {
  loadingEl.hidden = !show;
  setControlsDisabled(show);
}
function setControlsDisabled(disabled) {
  searchInput.disabled = disabled;
  theadButtons.forEach(b => b.disabled = disabled);
  [eraFilter, doctorFilter, companionFilter, exportBtn, prevPageBtn, nextPageBtn].forEach(el => { if (el) el.disabled = disabled; });
}
function showError(msg, dbg) {
  errorText.textContent = msg;
  if (dbg) {
    errorDetails.hidden = false;
    errorDebug.textContent = JSON.stringify({ ...dbg, time: new Date().toISOString() }, null, 2);
  }
  errorEl.hidden = false;
}
function hideError() {
  errorEl.hidden = true;
}

// Events
function onHeaderClick(e) {
  const btn = e.currentTarget;
  const col = btn.dataset.col;
  const isShift = e.shiftKey;

  if (isShift) {
    const idx = sortState.multi.findIndex(s => s.col === col);
    if (idx >= 0) sortState.multi[idx].dir = sortState.multi[idx].dir === 'asc' ? 'desc' : 'asc';
    else sortState.multi.push({ col, dir: 'asc' });
    if (sortState.multi.length) setAriaSort(sortState.multi[0].col, sortState.multi[0].dir);
  } else {
    if (sortState.col === col) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    else { sortState.col = col; sortState.dir = 'asc'; }
    sortState.multi = [];
    setAriaSort(sortState.col, sortState.dir);
  }
  applyFilters();
}

function initAriaSort() {
  table.querySelectorAll('thead th').forEach(th => th.setAttribute('aria-sort', 'none'));
  setAriaSort(sortState.col, sortState.dir);
}

function populateFilters(arr) {
  const eras = Array.from(new Set(arr.map(e => safeText(e.era)))).sort();
  const doctors = Array.from(new Set(arr.map(e => safeText(e._doctorFmt)))).sort();
  const companions = Array.from(new Set(arr.map(e => safeText(e._companionFmt)))).sort();

  const fill = (sel, items, label) => {
    sel.innerHTML = '';
    const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = `${label}: All`;
    sel.appendChild(optAll);
    items.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
    sel.hidden = false;
  };

  fill(eraFilter, eras, 'Era');
  fill(doctorFilter, doctors, 'Doctor');
  fill(companionFilter, companions, 'Companion');
}

// Wire events
theadButtons.forEach(btn => btn.addEventListener('click', onHeaderClick));
if (KEYBOARD_NAV) {
  table.querySelectorAll('thead th > button').forEach(btn => {
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onHeaderClick.call(btn, e); } });
  });
}
retryBtn.addEventListener('click', fetchAll);

const onSearch = debounce((e) => { filterText = e.target.value || ''; applyFilters(); }, 200);
searchInput.addEventListener('input', onSearch);

if (ENHANCED_FILTERS) {
  eraFilter.addEventListener('change', () => { filterEra = eraFilter.value; applyFilters(); });
  doctorFilter.addEventListener('change', () => { filterDoctor = doctorFilter.value; applyFilters(); });
  companionFilter.addEventListener('change', () => { filterCompanion = companionFilter.value; applyFilters(); });
  eraFilter.hidden = false; doctorFilter.hidden = false; companionFilter.hidden = false;
}

if (CSV_EXPORT) {
  exportBtn.hidden = false;
  exportBtn.addEventListener('click', () => exportCSV(viewEpisodes));
}

if (PAGINATION) {
  pager.hidden = false;
  prevPageBtn.addEventListener('click', () => { page = Math.max(1, page - 1); renderTable(viewEpisodes); });
  nextPageBtn.addEventListener('click', () => {
    const maxPage = Math.max(1, Math.ceil(viewEpisodes.length / pageSize));
    page = Math.min(maxPage, page + 1);
    renderTable(viewEpisodes);
  });
}

// Start
fetchAll();
