// Configuration
const CONFIG = {
  DATA_URL:
    'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
  ERA_ORDER: ['Classic', 'Modern', 'Recent'],
  DATE_FORMATS: {
    ISO: /^\d{4}-\d{2}-\d{2}$/,
    UK: /^\d{2}\/\d{2}\/\d{4}$/,
    LONG: /^[A-Za-z]+\s+\d{1,2},\s*\d{4}$/,
    YEAR: /^\d{4}$/
  }
};

// State
let state = {
  episodes: [],
  filtered: [],
  loading: true,
  error: null,
  sort: { field: 'rank', ascending: true },
  filters: { name: '' }
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await loadEpisodes();
}

function setupEventListeners() {
  document.getElementById('name-filter').addEventListener('input', (e) => {
    state.filters.name = e.target.value.trim().toLowerCase();
    filterEpisodes();
  });

  document.querySelectorAll('#episodes-table th').forEach((th) => {
    th.addEventListener('click', () => sortEpisodes(th.dataset.sort));
  });

  document.getElementById('era-filter').addEventListener('change', filterEpisodes);
  document.getElementById('doctor-filter').addEventListener('change', filterEpisodes);
  document.getElementById('companion-filter').addEventListener('change', filterEpisodes);
}

// Load data
async function loadEpisodes() {
  try {
    showLoading(true);
    const res = await fetch(CONFIG.DATA_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.episodes;

    state.episodes = raw.map(normalizeEpisode);
    state.filtered = [...state.episodes];

    populateDynamicFilters(state.episodes);
    displayEpisodes(state.filtered);
    updateResultCount();
  } catch (err) {
    showError('Failed to load episodes: ' + err.message);
  } finally {
    showLoading(false);
  }
}

// Normalize episode
function normalizeEpisode(ep) {
  return {
    rank: ep.rank ?? '—',
    title: ep.title ?? '—',
    series: ep.series ?? '—',
    era: ep.era ?? '—',
    broadcast_date: ep.broadcast_date ?? '—',
    year: extractYear(ep.broadcast_date),
    director: ep.director ?? '—',
    writer: formatWriters(ep.writer),
    doctor: formatDoctor(ep.doctor),
    companion: formatCompanion(ep.companion),
    castCount: Array.isArray(ep.cast) ? ep.cast.length : 0
  };
}

// Helpers
function formatWriters(w) {
  if (!w) return '—';
  return String(w).replace(/ & /g, ', ').replace(/ and /gi, ', ');
}

function formatDoctor(doc) {
  if (!doc) return '—';
  return `${doc.actor ?? 'Unknown'} (${doc.incarnation ?? 'Doctor'})`;
}

function formatCompanion(c) {
  if (!c) return 'None';
  return `${c.actor ?? 'Unknown'} (${c.character ?? '—'})`;
}

function extractYear(dateStr) {
  if (!dateStr) return '—';
  const s = String(dateStr).trim();

  if (CONFIG.DATE_FORMATS.YEAR.test(s)) return Number(s);
  if (CONFIG.DATE_FORMATS.ISO.test(s)) return Number(s.slice(0, 4));
  if (CONFIG.DATE_FORMATS.UK.test(s)) return Number(s.slice(6, 10));

  if (CONFIG.DATE_FORMATS.LONG.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return '—';
}

function populateDynamicFilters(episodes) {
  const docSet = new Set();
  const compSet = new Set();

  episodes.forEach((ep) => {
    if (ep.doctor !== '—') docSet.add(ep.doctor);
    if (ep.companion !== '—' && ep.companion !== 'None') compSet.add(ep.companion);
  });

  const docSel = document.getElementById('doctor-filter');
  const compSel = document.getElementById('companion-filter');

  [...docSet].sort().forEach((d) => {
    const o = document.createElement('option');
    o.value = d;
    o.textContent = d;
    docSel.appendChild(o);
  });

  [...compSet].sort().forEach((c) => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    compSel.appendChild(o);
  });
}

// Display table
function displayEpisodes(episodes) {
  const tbody = document.getElementById('episodes-body');
  tbody.innerHTML = '';

  if (!episodes.length) {
    document.getElementById('no-results').style.display = 'block';
    document.getElementById('episodes-table').style.display = 'none';
    updateResultCount();
    return;
  }

  document.getElementById('no-results').style.display = 'none';
  document.getElementById('episodes-table').style.display = 'table';

  tbody.innerHTML = episodes
    .map(
      (ep) => `
    <tr>
      <td>${ep.rank}</td>
      <td>${ep.title}</td>
      <td>${ep.series}</td>
      <td>${ep.era}</td>
      <td>${ep.year}</td>
      <td>${ep.director}</td>
      <td>${ep.writer}</td>
      <td>${ep.doctor}</td>
      <td>${ep.companion}</td>
      <td><span class="cast-count">${ep.castCount}</span></td>
    </tr>`
    )
    .join('');

  updateResultCount();
}


function sortEpisodes(field) {
  if (state.sort.field === field) {
    state.sort.ascending = !state.sort.ascending;
  } else {
    state.sort.field = field;
    state.sort.ascending = true;
  }

  const dir = state.sort.ascending ? 1 : -1;

  state.filtered.sort((a, b) => {
    const A = a[field];
    const B = b[field];
    if (A < B) return -1 * dir;
    if (A > B) return 1 * dir;
    return 0;
  });

  updateSortIndicators();
  displayEpisodes(state.filtered);
}

function updateSortIndicators() {
  document.querySelectorAll('#episodes-table th')
    .forEach(th => th.classList.remove('sort-asc', 'sort-desc'));

  const th = document.querySelector(`th[data-sort="${state.sort.field}"]`);
  if (th) th.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
}


function filterEpisodes() {
  const q = state.filters.name;
  const era = document.getElementById('era-filter').value;
  const doc = document.getElementById('doctor-filter').value;
  const comp = document.getElementById('companion-filter').value;

  state.filtered = state.episodes.filter((ep) => {
    const textHit =
      !q ||
      ep.title.toLowerCase().includes(q) ||
      ep.writer.toLowerCase().includes(q) ||
      ep.director.toLowerCase().includes(q) ||
      ep.doctor.toLowerCase().includes(q) ||
      ep.companion.toLowerCase().includes(q);

    const eraHit = !era || ep.era === era;
    const docHit = !doc || ep.doctor === doc;
    const compHit = !comp || ep.companion === comp;

    return textHit && eraHit && docHit && compHit;
  });

  sortEpisodes(state.sort.field);
  displayEpisodes(state.filtered);
}

function updateResultCount() {
  const el = document.getElementById('result-count');
  el.textContent = `Showing ${state.filtered.length} of ${state.episodes.length}`;
}

// UI
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  document.getElementById('episodes-table').style.display = show ? 'none' : 'table';
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}
