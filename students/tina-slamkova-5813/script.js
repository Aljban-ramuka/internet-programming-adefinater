(() => {
  const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json';

  const loadBtn = document.getElementById('loadBtn');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const tableEl = document.getElementById('episodesTable');
  const tableBody = document.getElementById('tableBody');
  const filterInput = document.getElementById('filterInput');
  const clearFilterBtn = document.getElementById('clearFilterBtn');
  const headers = Array.from(document.querySelectorAll('#episodesTable thead th.sortable'));

  let episodes = [];  
  let view = [];       
  let sortState = { key: null, dir: 1 }; 

  function showLoading(show = true) { 
    loadingEl.classList.toggle('hidden', !show);
    loadBtn.disabled = show;
  }
  
  function showError(msg) {
    if (!msg) {
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
      return;
    }
    errorEl.innerHTML = `<span class="prefix">Error:</span> ${escapeHtml(String(msg))}`;
    errorEl.classList.remove('hidden');
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  function safeText(v, fallback = 'N/A') {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s.length ? s : fallback;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function extractYear(dateStr) {
    if (!dateStr) return null;
    
    if (typeof dateStr === 'number') {
      const n = Number(dateStr);
      if (!isNaN(n) && n > 1000 && n < 9999) return n;
    }
    
    const str = String(dateStr).trim();
    
    if (/^\d{4}$/.test(str)) {
      const y = Number(str);
      if (y >= 1900 && y <= 2100) return y;
    }
    
    const parsed = new Date(str);
    const year = parsed.getFullYear();
    if (!isNaN(year) && year >= 1900 && year <= 2100) {
      return year;
    }
    
    const m = str.match(/(19|20)\d{2}/);
    if (m) {
      const y = Number(m[0]);
      if (y >= 1900 && y <= 2100) return y;
    }
    
    return null;
  }

  function determineEraFromYear(year) {
    if (!year) return 'Unknown';
    if (year < 2005) return 'Classic';
    if (year < 2018) return 'Modern';
    return 'Recent';
  }

  function formatDoctor(raw, castArr) {
    if (typeof raw === 'string' && raw.startsWith('{')) {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
      }
    }
    
    if (!raw && Array.isArray(castArr)) {
      const found = castArr.find(c => {
        const role = safeText(c.role || c.character || '', '').toLowerCase();
        return role.includes('doctor');
      });
      if (found) {
        const actor = safeText(found.actor || found.name, '');
        const incarnation = safeText(found.character || found.role, '');
        if (!actor || actor === 'N/A') return incarnation !== 'N/A' ? incarnation : 'N/A';
        return incarnation !== 'N/A' ? `${actor} (${incarnation})` : actor;
      }
      return 'N/A';
    }
    
    if (typeof raw === 'string' && raw.length > 0) return raw;
    
    if (typeof raw === 'object' && raw !== null) {
      const actor = safeText(raw.actor || raw.name, '');
      const incarnation = safeText(raw.incarnation || raw.character || raw.role, '');
      
      // Handle "Unknown Doctor" case
      if (incarnation.toLowerCase().includes('unknown')) {
        return actor !== 'N/A' ? actor : 'Unknown Doctor';
      }
      
      // Build formatted string
      if (actor !== 'N/A' && incarnation !== 'N/A') {
        return `${actor} (${incarnation})`;
      }
      if (actor !== 'N/A') return actor;
      if (incarnation !== 'N/A') return incarnation;
    }
    
    return 'N/A';
  }

  function formatCompanion(raw, castArr) {
    if (typeof raw === 'string' && raw.startsWith('{')) {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
      }
    }
    
    if (!raw && Array.isArray(castArr)) {
      const found = castArr.find(c => {
        const role = safeText(c.role || c.character || '', '').toLowerCase();
        return role.includes('companion');
      });
      if (found) {
        const actor = safeText(found.actor || found.name, '');
        const character = safeText(found.character || found.role, '');
        if (!actor || actor === 'N/A') return character !== 'N/A' ? character : 'N/A';
        return character !== 'N/A' ? `${actor} (${character})` : actor;
      }
      // fallback: pick first non-doctor cast member as best effort
      const maybe = castArr.find(c => {
        const role = safeText(c.role || c.character || '', '').toLowerCase();
        return !role.includes('doctor');
      });
      if (maybe) {
        const actor = safeText(maybe.actor || maybe.name, '');
        const character = safeText(maybe.character || maybe.role, '');
        if (!actor || actor === 'N/A') return character !== 'N/A' ? character : 'N/A';
        return character !== 'N/A' ? `${actor} (${character})` : actor;
      }
      return 'N/A';
    }
    
    if (typeof raw === 'string' && raw.length > 0) return raw;
    
    if (typeof raw === 'object' && raw !== null) {
      const actor = safeText(raw.actor || raw.name, '');
      const character = safeText(raw.character || raw.role, '');
      
      if (actor !== 'N/A' && character !== 'N/A') {
        return `${actor} (${character})`;
      }
      if (actor !== 'N/A') return actor;
      if (character !== 'N/A') return character;
    }
    
    return 'N/A';
  }

  // If writer is array, join; if string, return; else fallback to 'N/A'
  function formatWriter(raw) {
    if (!raw) return 'N/A';
    if (Array.isArray(raw)) {
      const cleaned = raw.map(r => String(r).trim()).filter(Boolean);
      return cleaned.length ? cleaned.join(', ') : 'N/A';
    }
    return String(raw).trim() || 'N/A';
  }

  // Get cast count defensively
  function getCastCount(cast) {
    if (!cast) return 0;
    if (Array.isArray(cast)) return cast.length;
    if (typeof cast === 'number' && Number.isFinite(cast)) return cast;
    return 0;
  }

  function normalizeEpisode(raw, index) {
    // FIXED: Better title extraction - try multiple field names before giving up
    let title = raw.title || raw.name || raw.episodeTitle || raw.titleText || raw.heading || '';
    title = String(title).trim();
    // If still empty, use a more descriptive fallback
    if (!title) {
      title = `Episode ${index + 1}`;
    }

    // Series number - FIXED: Handle "Special" and other string values more gracefully
    const seriesRaw = raw.series ?? raw.season ?? raw.seriesNumber ?? raw.seasonNumber ?? raw.series_no;
    let series;
    if (seriesRaw === undefined || seriesRaw === null || seriesRaw === '') {
      series = 'N/A';
    } else if (typeof seriesRaw === 'string') {
      // Keep string values like "Special" as-is, but try to parse if it looks like a number
      const num = Number(seriesRaw);
      series = isNaN(num) ? seriesRaw : num;
    } else {
      series = Number(seriesRaw) || seriesRaw;
    }

    let year = null;
    
    // Try explicit year field first
    if (raw.year) {
      const y = Number(raw.year);
      if (!isNaN(y) && y >= 1900 && y <= 2100) {
        year = y;
      }
    }
    
    // If no year yet, try date fields
    if (!year) {
      const dateVal = raw.date || raw.broadcast || raw.broadcastDate || raw.airdate || raw.aired || raw.firstAired || raw.broadcast_date;
      year = extractYear(dateVal);
    }
    
    const yearForDisplay = year ? year : 'N/A';

    // director/writer
    const director = Array.isArray(raw.director) ? 
      raw.director.map(d => String(d).trim()).filter(Boolean).join(', ') : 
      (raw.director || raw.director_name || raw.directors || '');
    const writer = formatWriter(raw.writer || raw.writers || raw.writer_name || raw.author);

    // doctor/companion detection (explicit or via cast)
    const doctor = formatDoctor(raw.doctor || raw.doctor_name || raw.doctor_actor, raw.cast);
    const companion = formatCompanion(raw.companion || raw.companions || raw.companion_name, raw.cast);

    // cast count (empty arrays -> 0)
    const castCount = getCastCount(raw.cast || raw.castList || raw.castMembers);

    // rank: use explicit or index+1
    const rank = (raw.rank !== undefined && raw.rank !== null) ? Number(raw.rank) : (index + 1);

    // era detection: if explicit use it, else infer from year (now works with fixed extractYear)
    const era = (raw.era && String(raw.era).length) ? safeText(raw.era, 'Unknown') : determineEraFromYear(year);

    return {
      raw,
      rank: Number.isFinite(rank) ? rank : null,
      title,
      series,
      era,
      year: yearForDisplay,
      yearNumeric: year, // Keep numeric year for sorting
      director: safeText(Array.isArray(director) ? director.join(', ') : director, 'N/A'),
      writer: safeText(writer, 'N/A'),
      doctor: safeText(doctor, 'N/A'),
      companion: safeText(companion, 'N/A'),
      castCount: Number.isFinite(castCount) ? castCount : 0
    };
  }

  // ---------------------------
  // Render table rows (escape output)
  // ---------------------------
  function renderTable(list) {
    tableBody.innerHTML = '';
    if (!list || list.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="10" style="padding:18px;color:var(--muted)">No episodes to display.</td>`;
      tableBody.appendChild(tr);
      return;
    }
    list.forEach((ep, i) => {
      const tr = document.createElement('tr');
      if (i % 2 === 1) tr.classList.add('row-alt');
      tr.innerHTML = `
        <td>${ep.rank ?? (i + 1)}</td>
        <td>${escapeHtml(ep.title)}</td>
        <td>${escapeHtml(String(ep.series ?? 'N/A'))}</td>
        <td>${escapeHtml(ep.era)}</td>
        <td>${escapeHtml(String(ep.year ?? 'N/A'))}</td>
        <td>${escapeHtml(ep.director)}</td>
        <td>${escapeHtml(ep.writer)}</td>
        <td>${escapeHtml(ep.doctor)}</td>
        <td>${escapeHtml(ep.companion)}</td>
        <td>${ep.castCount ?? 0}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ---------------------------
  // Sorting & comparison helpers
  // ---------------------------
  function compareForKey(a, b, key) {
    let va = a[key];
    let vb = b[key];
    
    // Special handling for year column - use numeric year for sorting
    if (key === 'year') {
      va = a.yearNumeric;
      vb = b.yearNumeric;
    }

    // treat 'N/A' or '' as missing
    const isMissing = v => v === undefined || v === null || String(v).trim() === '' || String(v).toUpperCase() === 'N/A';

    const ma = isMissing(va);
    const mb = isMissing(vb);
    if (ma && mb) return 0;
    if (ma) return 1; // push missing to end
    if (mb) return -1;

    // If both values look like numbers (year, rank, castCount, series), compare numerically
    const numA = Number(va);
    const numB = Number(vb);
    const bothNumeric = !isNaN(numA) && !isNaN(numB);

    if (bothNumeric) return numA - numB;

    // otherwise compare strings case-insensitive
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  }

  // ---------------------------
  // Filter + sort pipeline
  // ---------------------------
  function applyFilterAndSort() {
    const q = filterInput.value.trim().toLowerCase();
    view = episodes.filter(ep => {
      if (!q) return true;
      const combined = `${ep.title} ${ep.doctor} ${ep.companion}`.toLowerCase();
      return combined.includes(q);
    });

    if (sortState.key) {
      const key = sortState.key;
      const dir = sortState.dir;
      view.sort((a, b) => compareForKey(a, b, key) * dir);
    }

    renderTable(view);
    tableEl.classList.remove('hidden');
  }

  // ---------------------------
  // Header sorting UI handler
  // ---------------------------
  function onHeaderClick(e) {
    const th = e.currentTarget;
    const key = th.dataset.key;
    if (!key) return;
    if (sortState.key === key) {
      sortState.dir = -sortState.dir;
    } else {
      sortState.key = key;
      sortState.dir = 1;
    }
    // update indicators
    headers.forEach(h => {
      const ind = h.querySelector('.sort-indicator');
      if (h.dataset.key === sortState.key) {
        ind.textContent = sortState.dir === 1 ? '▲' : '▼';
      } else {
        ind.textContent = '';
      }
    });
    applyFilterAndSort();
  }

  // ---------------------------
  // Load data (Alternative 1)
  // ---------------------------
  async function loadData() {
    showError(null);
    showLoading(true); // FIXED: Now properly shows loading indicator
    tableEl.classList.add('hidden');

    try {
      const raw = await fetchJson(DATA_URL);
      // figure out where array is
      let arr = raw;
      if (!Array.isArray(raw)) {
        if (Array.isArray(raw.episodes)) arr = raw.episodes;
        else if (Array.isArray(raw.data)) arr = raw.data;
        else {
          const maybe = Object.values(raw).find(v => Array.isArray(v));
          arr = maybe || [];
        }
      }

      // Normalize
      episodes = arr.map((it, idx) => normalizeEpisode(it, idx));

      // Default sort: rank if available else title
      if (episodes.every(e => e.rank !== null && e.rank !== undefined)) {
        sortState = { key: 'rank', dir: 1 };
      } else {
        sortState = { key: 'title', dir: 1 };
      }

      filterInput.value = '';
      applyFilterAndSort();
      showLoading(false);
    } catch (err) {
      console.error(err);
      showLoading(false);
      showError('Failed to load episodes: ' + (err.message || 'Unknown error'));
    }
  }

  // ---------------------------
  // Debounce helper
  // ---------------------------
  function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------------------------
  // Wire events
  // ---------------------------
  loadBtn.addEventListener('click', loadData);
  clearFilterBtn.addEventListener('click', () => {
    filterInput.value = '';
    applyFilterAndSort();
    filterInput.focus();
  });
  filterInput.addEventListener('input', debounce(() => applyFilterAndSort(), 120));
  headers.forEach(h => {
    h.addEventListener('click', onHeaderClick);
    h.setAttribute('tabindex', '0');
    h.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        h.click();
      }
    });
  });
})();