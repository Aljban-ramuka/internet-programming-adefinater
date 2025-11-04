/* Doctor Who Episodes Explorer — Filters + CSV + Decade Grouping
 * Works with your existing index.html and styles.css
 * - Multi-source loading (bonus)
 * - Smart relevance sort (Tier 3)
 * - Era & Doctor filters (functional)
 * - Export CSV of current view
 * - Decade grouping headers like “2020s (18 episodes)”
 */

const DATA_URLS = [
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
  'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
];

// ---- DOM ----
const loadingEl  = document.getElementById('loading');
const errorEl    = document.getElementById('error');
const tableEl    = document.getElementById('episodes-table');
const tbodyEl    = document.getElementById('episodes-body');
const noResultsEl= document.getElementById('no-results');
const filterInput= document.getElementById('name-filter');
const statusEl   = document.getElementById('status');
const headers    = Array.from(document.querySelectorAll('th[data-sort]'));
const filtersBox = document.querySelector('.filters');

let eraSelect, doctorSelect, exportBtn; // will be injected
let allEpisodes = [];
let view = [];
let sortKey = 'rank';
let sortDir = 'desc';
let warningCount = 0;

// ---- utils ----
const toStr = v => (v == null ? '' : String(v));
const toNum = v => { const n = Number(v); return Number.isNaN(n) ? null : n; };
const debounce = (fn, ms = 200) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

function yearFrom(dateStr) {
  const s = toStr(dateStr).trim();
  if (!s) return '';
  // starts with YYYY
  let m = s.match(/^(\d{4})/); if (m) return m[1];
  // ends with YYYY
  m = s.match(/(\d{4})$/); if (m) return m[1];
  return '';
}
const decadeOf = y => (y ? `${Math.floor(Number(y)/10)*10}s` : 'Unknown');

function formatDoctor(d) {
  if (!d) return '—';
  const a = d.actor || '';
  const inc = d.incarnation || '';
  return a && inc ? `${a} (${inc})` : a || inc || '—';
}
function formatCompanion(c) {
  if (!c) return '—';
  const a = c.actor || '';
  const ch = c.character || '';
  return a && ch ? `${a} (${ch})` : a || ch || '—';
}
const castCount = ep => Array.isArray(ep.cast) ? ep.cast.length : 0;

// ---- warnings ----
function countWarnings(rows) {
  let w = 0; const ranks = new Set();
  for (const e of rows) {
    if (!e.title || !e.director || !e.writer || !e.doctor) w++;
    const r = toNum(e.rank);
    if (r == null || r < 0 || ranks.has(r)) w++; else ranks.add(r);
    const y = yearFrom(e.broadcast_date);
    if (!y || Number(y) > new Date().getFullYear() + 1) w++;
  }
  return w;
}

// ---- sorting ----
function compare(a, b, key) {
  if (key === 'broadcast_date') {
    const ya = toNum(yearFrom(a.broadcast_date));
    const yb = toNum(yearFrom(b.broadcast_date));
    if (ya == null && yb == null) return 0;
    if (ya == null) return 1;
    if (yb == null) return -1;
    return ya - yb;
  }
  if (key === 'cast') return castCount(a) - castCount(b);
  if (key === 'doctor') return formatDoctor(a.doctor).localeCompare(formatDoctor(b.doctor), undefined, {sensitivity:'base'});
  if (key === 'companion') return formatCompanion(a.companion).localeCompare(formatCompanion(b.companion), undefined, {sensitivity:'base'});
  const na = toNum(a[key]), nb = toNum(b[key]);
  if (na != null && nb != null) return na - nb;
  return toStr(a[key]).localeCompare(toStr(b[key]), undefined, {sensitivity:'base'});
}

function updateSortIndicators() {
  headers.forEach(h => {
    h.classList.remove('sort-asc','sort-desc');
    if (h.dataset.sort === sortKey) {
      h.classList.add(sortDir === 'asc' ? 'sort-asc':'sort-desc');
      h.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending':'descending');
    } else h.setAttribute('aria-sort','none');
  });
}

// ---- filters UI (injected) ----
function ensureExtraControls() {
  if (document.getElementById('extra-controls')) return;

  const wrap = document.createElement('div');
  wrap.id = 'extra-controls';
  wrap.className = 'filter-row';

  // Era
  const eraLabel = document.createElement('label');
  eraLabel.textContent = 'Era:';
  eraLabel.setAttribute('for','era-select');
  eraLabel.className = 'mr-8';

  eraSelect = document.createElement('select');
  eraSelect.id = 'era-select';
  eraSelect.className = 'select';

  // Doctor
  const docLabel = document.createElement('label');
  docLabel.textContent = 'Doctor:';
  docLabel.setAttribute('for','doctor-select');
  docLabel.className = 'ml-12 mr-8';

  doctorSelect = document.createElement('select');
  doctorSelect.id = 'doctor-select';
  doctorSelect.className = 'select';

  // Export
  exportBtn = document.createElement('button');
  exportBtn.id = 'export-csv';
  exportBtn.className = 'btn';
  exportBtn.type = 'button';
  exportBtn.textContent = 'Export CSV';
  exportBtn.title = 'Export current results to CSV';

  wrap.appendChild(eraLabel);
  wrap.appendChild(eraSelect);
  wrap.appendChild(docLabel);
  wrap.appendChild(doctorSelect);
  wrap.appendChild(exportBtn);

  filtersBox.appendChild(wrap);
}

function populateFilters(data) {
  ensureExtraControls();

  // Era options
  const eras = Array.from(new Set(data.map(e => toStr(e.era).trim()).filter(Boolean))).sort();
  eraSelect.innerHTML = `<option value="">All Eras</option>` + eras.map(e => `<option value="${e}">${e}</option>`).join('');

  // Doctor options (Actor (Incarnation))
  const doctors = Array.from(new Set(
    data.map(e => formatDoctor(e.doctor)).filter(s => s && s !== '—')
  )).sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
  doctorSelect.innerHTML = `<option value="">All Doctors</option>` + doctors.map(d => `<option value="${d}">${d}</option>`).join('');
}

// ---- rendering with decade grouping ----
function renderTableGrouped(rows) {
  tbodyEl.innerHTML = '';
  const frag = document.createDocumentFragment();

  // groups: decade -> episodes[]
  const groups = new Map();
  for (const e of rows) {
    const y = yearFrom(e.broadcast_date);
    const key = decadeOf(y);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  // order groups by decade desc numeric (Unknown last)
  const keys = Array.from(groups.keys()).sort((a,b) => {
    const ax = /^\d/.test(a) ? Number(a.slice(0,4)) : -Infinity;
    const bx = /^\d/.test(b) ? Number(b.slice(0,4)) : -Infinity;
    return bx - ax;
  });

  for (const k of keys) {
    const eps = groups.get(k).slice();
    // within each group, keep current global sort
    // (already sorted by applyFilterSort)
    // insert a header row
    const trH = document.createElement('tr');
    trH.className = 'group-row';
    const td = document.createElement('td');
    td.colSpan = 10;
    td.textContent = `${k} (${eps.length} episode${eps.length===1?'':'s'})`;
    trH.appendChild(td);
    frag.appendChild(trH);

    // rows
    for (const e of eps) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.rank ?? '—'}</td>
        <td>${e.title}</td>
        <td>${e.series}</td>
        <td>${e.era}</td>
        <td>${yearFrom(e.broadcast_date)}</td>
        <td>${e.director}</td>
        <td>${e.writer}</td>
        <td>${formatDoctor(e.doctor)}</td>
        <td>${formatCompanion(e.companion)}</td>
        <td><span class="cast-count">${castCount(e)}</span></td>
      `;
      frag.appendChild(tr);
    }
  }

  tbodyEl.appendChild(frag);
}

// ---- pipeline (filter + smart relevance + sort + render) ----
function applyFilterSort() {
  const q = filterInput.value.trim().toLowerCase();
  const eraVal = eraSelect ? eraSelect.value : '';
  const docVal = doctorSelect ? doctorSelect.value : '';

  // filter
  view = allEpisodes.filter(ep => {
    if (eraVal && toStr(ep.era) !== eraVal) return false;
    if (docVal && formatDoctor(ep.doctor) !== docVal) return false;
    if (!q) return true;
    const text = [
      ep.title, ep.series, ep.era, ep.director, ep.writer, ep.broadcast_date,
      formatDoctor(ep.doctor), formatCompanion(ep.companion)
    ].map(toStr).join(' ').toLowerCase();
    return text.includes(q);
  });

  // smart relevance (when a query exists)
  if (q) {
    view.sort((a, b) => {
      const qa = q;
      const ta = toStr(a.title).toLowerCase();
      const tb = toStr(b.title).toLowerCase();
      const sa = ta === qa ? 0 : ta.includes(qa) ? 1 : 2;
      const sb = tb === qa ? 0 : tb.includes(qa) ? 1 : 2;
      if (sa !== sb) return sa - sb;
      return (a.rank ?? 9999) - (b.rank ?? 9999);
    });
  } else {
    // normal sort
    view.sort((a, b) => compare(a, b, sortKey) * (sortDir === 'asc' ? 1 : -1));
  }

  // render with decade grouping like the screenshot
  renderTableGrouped(view);

  // visibility
  const has = view.length > 0;
  tableEl.style.display = has ? 'table' : 'none';
  noResultsEl.style.display = has ? 'none' : 'block';

  // warnings + status
  warningCount = countWarnings(view);
  updateSummary();
  updateSortIndicators();
  statusEl.textContent = `${view.length} results, sorted by ${sortKey} ${sortDir}.`;
}

// ---- summary line inside .filters ----
function updateSummary() {
  let summary = document.getElementById('summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'summary';
    summary.className = 'summary-line';
    filtersBox.appendChild(summary);
  }
  summary.textContent = `${view.length} episodes shown | Warnings: ${warningCount}`;
}

// ---- CSV export of current view ----
function exportCSV() {
  // headers must match table
  const headers = [
    'Rank','Title','Series','Era','Broadcast Year','Director',
    'Writer','Doctor','Companion','Cast Count'
  ];
  const rows = view.map(e => ([
    toStr(e.rank ?? ''),
    toStr(e.title),
    toStr(e.series),
    toStr(e.era),
    toStr(yearFrom(e.broadcast_date)),
    toStr(e.director),
    toStr(e.writer),
    formatDoctor(e.doctor),
    formatCompanion(e.companion),
    String(castCount(e))
  ]));
  const escape = s => `"${String(s).replace(/"/g,'""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r=>r.map(escape).join(','))].join('\r\n');

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'doctor-who-episodes.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- data load ----
async function loadData() {
  try {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';

    const results = await Promise.all(
      DATA_URLS.map(url =>
        fetch(url).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
          return r.json();
        })
      )
    );

    allEpisodes = results.flatMap(d => d.episodes ?? d);

    // inject & populate filters and wire events
    populateFilters(allEpisodes);
    eraSelect.addEventListener('change', applyFilterSort);
    doctorSelect.addEventListener('change', applyFilterSort);
    exportBtn.addEventListener('click', exportCSV);

    applyFilterSort();
  } catch (err) {
    errorEl.textContent = `Failed to load data (${err.message})`;
    errorEl.style.display = 'block';
  } finally {
    loadingEl.style.display = 'none';
  }
}

// ---- header sort events ----
headers.forEach(h => {
  h.addEventListener('click', () => {
    const k = h.dataset.sort;
    if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = k; sortDir = 'asc'; }
    applyFilterSort();
  });
  h.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); h.click(); }
  });
});

// search
filterInput.addEventListener('input', debounce(applyFilterSort, 200));

// init
ensureExtraControls(); // create containers before load for layout stability
loadData();
