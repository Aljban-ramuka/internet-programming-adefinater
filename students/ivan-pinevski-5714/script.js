const CONFIG = {
    MULTI_URLS: [
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
    ],
    DATE_FORMATS: {
        ISO: 'YYYY-MM-DD',
        UK: 'DD/MM/YYYY',
        LONG: 'MMMM DD, YYYY',
        YEAR: 'YYYY'
    },
    ERA_ORDER: ['Classic', 'Modern', 'Recent'],
    DEBOUNCE_MS: 250
};

// State management
let state = {
    episodes: [],      // original loaded
    filtered: [],      // after filter
    loading: false,
    error: null,
    sort: [            // array for multi-column sorting: [{field, ascending}]
        { field: 'rank', ascending: true }
    ],
    filters: {
        name: '',
        era: 'All',
        doctor: 'All',
        companion: 'All'
    },
    validationWarnings: [] // collected validation messages
};

// DOM references
const $loading = document.getElementById('loading');
const $error = document.getElementById('error');
const $table = document.getElementById('episodes-table');
const $tbody = document.getElementById('episodes-body');
const $noResults = document.getElementById('no-results');
const $nameFilter = document.getElementById('name-filter');
const $filtersSection = document.querySelector('.filters');
const $thead = $table.querySelector('thead');

// Add UI badge for warnings + export button + filters (enhanced)
function injectExtraControls() {
    // warning badge container
    const badge = document.createElement('div');
    badge.id = 'validation-badge';
    badge.style.cssText = 'float:right; margin-top:-48px; font-size:0.9em;';
    document.querySelector('header').appendChild(badge);

    // Create enhanced filters area (Era, Doctor, Companion) and Export button
    const enhanced = document.createElement('div');
    enhanced.className = 'filter-group';
    enhanced.innerHTML = `
        <label for="era-filter">Era:</label>
        <select id="era-filter" aria-label="Filter by era"><option>All</option></select>

        <label for="doctor-filter" style="margin-left:12px">Doctor:</label>
        <select id="doctor-filter" aria-label="Filter by doctor"><option>All</option></select>

        <label for="companion-filter" style="margin-left:12px">Companion:</label>
        <select id="companion-filter" aria-label="Filter by companion"><option>All</option></select>

        <button id="export-csv" style="margin-left:12px">Export CSV</button>
    `;
    $filtersSection.appendChild(enhanced);
}

// Utility: safe text insertion
function text(node, value) {
    node.textContent = value == null ? '' : String(value);
}

// Utility: parse many date formats -> return Date or null. Also return year when possible.
function parseBroadcastDate(raw) {
    if (!raw && raw !== 0) return { date: null, year: null };

    const s = String(raw).trim();

    // YYYY
    if (/^\d{4}$/.test(s)) {
        const year = parseInt(s, 10);
        return { date: new Date(year, 0, 1), year };
    }
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + 'T00:00:00Z');
        if (!isNaN(d)) return { date: d, year: d.getUTCFullYear() };
    }
    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const parts = s.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d)) return { date: d, year: d.getFullYear() };
    }
    // Month DD, YYYY (e.g., January 2, 2000)
    const longMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (longMatch) {
        const d = new Date(s);
        if (!isNaN(d)) return { date: d, year: d.getFullYear() };
    }
    // Try Date.parse fallback
    const d = new Date(s);
    if (!isNaN(d)) return { date: d, year: d.getFullYear() };

    return { date: null, year: null };
}

// Data validation: populate state.validationWarnings and update UI badge
function validateEpisodes(episodes) {
    const warnings = [];
    const rankSet = new Set();
    const now = new Date();

    episodes.forEach((ep, idx) => {
        const prefix = `Item index ${idx}`;
        if (ep.rank == null) warnings.push(`${prefix}: Missing rank`);
        if (!ep.title) warnings.push(`${prefix}: Missing title`);
        if (ep.series != null && typeof ep.series === 'number' && ep.series < 0) warnings.push(`${prefix}: Negative series number`);
        if (ep.rank != null) {
            if (rankSet.has(ep.rank)) warnings.push(`${prefix}: Duplicate rank ${ep.rank}`);
            else rankSet.add(ep.rank);
        }
        if (ep.broadcast_date) {
            const parsed = parseBroadcastDate(ep.broadcast_date);
            if (parsed.date && parsed.date > now) warnings.push(`${prefix}: Future broadcast date (${ep.broadcast_date})`);
            if (!parsed.date) warnings.push(`${prefix}: Unrecognized broadcast_date format (${ep.broadcast_date})`);
        } else {
            warnings.push(`${prefix}: Missing broadcast_date`);
        }
        // Missing required nested fields
        if (!ep.doctor || !ep.doctor.actor) warnings.push(`${prefix}: Missing doctor actor`);
    });

    state.validationWarnings = warnings;
    updateValidationBadge();
    // Log top 20 warnings to console to not spam
    console.warn('Data validation warnings:', warnings.slice(0, 50));
}

function updateValidationBadge() {
    let badge = document.getElementById('validation-badge');
    if (!badge) return;
    const count = state.validationWarnings.length;
    badge.innerHTML = count > 0 ? `⚠️ Warnings: ${count}` : '✅ No validation warnings';
    badge.title = count > 0 ? state.validationWarnings.join('\n') : '';
}

// Load episodes (multiple URLs)
async function loadEpisodes() {
    showLoading(true);
    showError(null);
    try {
        state.loading = true;

        // Fetch all configured URLs in parallel
        const fetches = CONFIG.MULTI_URLS.map(url =>
            fetch(url).then(r => {
                if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
                return r.json();
            })
        );

        const results = await Promise.all(fetches);
        // Flatten - each result might be array or object with episodes
        let episodes = [];
        results.forEach(res => {
            if (Array.isArray(res)) episodes = episodes.concat(res);
            else if (res && Array.isArray(res.episodes)) episodes = episodes.concat(res.episodes);
            else if (res && typeof res === 'object') episodes.push(res);
        });

        // Keep original order but attempt to coerce types
        episodes = episodes.map((ep, i) => {
            // Defensive normalization
            return {
                rank: typeof ep.rank === 'number' ? ep.rank : (ep.rank != null ? Number(ep.rank) : null),
                title: ep.title || '',
                series: ep.series != null ? Number(ep.series) : null,
                era: ep.era || 'Unknown',
                broadcast_date: ep.broadcast_date || '',
                director: ep.director || '',
                writer: ep.writer || '',
                doctor: (ep.doctor && typeof ep.doctor === 'object') ? ep.doctor : { actor: '', incarnation: '' },
                companion: ep.hasOwnProperty('companion') ? ep.companion : null,
                cast: Array.isArray(ep.cast) ? ep.cast : [],
                raw: ep // keep raw reference if needed for debugging/export
            };
        });

        state.episodes = episodes;
        validateEpisodes(episodes);

        populateFilterOptions(); // populate Era/Doctor/Companion selects
        applyFiltersAndDisplay();

    } catch (err) {
        console.error(err);
        showError('Failed to load episodes: ' + err.message);
    } finally {
        state.loading = false;
        showLoading(false);
    }
}

// Apply current filters to state.episodes and update state.filtered
function filterEpisodes() {
    const name = state.filters.name.trim().toLowerCase();
    const era = state.filters.era;
    const doctor = state.filters.doctor;
    const companion = state.filters.companion;

    // Filter
    let filtered = state.episodes.filter(ep => {
        // Era
        if (era && era !== 'All' && String(ep.era) !== era) return false;
        // Doctor
        if (doctor && doctor !== 'All' && ep.doctor && ep.doctor.actor !== doctor) return false;
        // Companion
        if (companion && companion !== 'All') {
            if (!ep.companion || ep.companion.actor !== companion) return false;
        }
        // Name filter - check title or other fields
        if (name) {
            const inTitle = ep.title && ep.title.toLowerCase().includes(name);
            if (!inTitle) {
                // also accept if any field contains the term (smart)
                const inAny = (
                    (ep.director && ep.director.toLowerCase().includes(name)) ||
                    (ep.writer && ep.writer.toLowerCase().includes(name)) ||
                    (ep.doctor && ep.doctor.actor && ep.doctor.actor.toLowerCase().includes(name)) ||
                    (ep.companion && ep.companion.actor && ep.companion.actor.toLowerCase().includes(name))
                );
                if (!inAny) return false;
            }
        }
        return true;
    });

    // Smart relevance sort if name filter present
    if (name) {
        filtered = smartRelevanceSort(filtered, name);
    }

    state.filtered = filtered;
}

// Smart relevance sort when filtering (Tier3 #3)
function smartRelevanceSort(arr, term) {
    const t = term.toLowerCase();
    return arr.slice().sort((a, b) => {
        const score = (ep) => {
            if (!ep.title) return 3;
            const title = ep.title.toLowerCase();
            if (title === t) return 0;
            if (title.includes(t)) return 1;
            // any field contains
            const any =
                (ep.director && ep.director.toLowerCase().includes(t)) ||
                (ep.writer && ep.writer.toLowerCase().includes(t)) ||
                (ep.doctor && ep.doctor.actor && ep.doctor.actor.toLowerCase().includes(t)) ||
                (ep.companion && ep.companion.actor && ep.companion.actor.toLowerCase().includes(t));
            if (any) return 2;
            return 3;
        };
        const sa = score(a), sb = score(b);
        if (sa !== sb) return sa - sb;
        // tie-breaker: rank ascending
        return (a.rank || Infinity) - (b.rank || Infinity);
    });
}

// Sorting: multi-column. state.sort is array of sort descriptors.
function sortEpisodes() {
    const sorts = state.sort; // e.g. [{field, ascending}, ...]
    state.filtered.sort((a, b) => {
        for (let s of sorts) {
            const field = s.field;
            const asc = s.ascending ? 1 : -1;
            let av = getFieldValueForSort(a, field);
            let bv = getFieldValueForSort(b, field);

            // Normalize nulls
            if (av == null && bv == null) continue;
            if (av == null) return 1 * asc;
            if (bv == null) return -1 * asc;

            // Compare numbers
            if (typeof av === 'number' && typeof bv === 'number') {
                if (av !== bv) return (av - bv) * asc;
                continue;
            }

            // Eras: use predefined order
            if (field === 'era') {
                const ia = CONFIG.ERA_ORDER.indexOf(av);
                const ib = CONFIG.ERA_ORDER.indexOf(bv);
                if (ia !== ib) return (ia - ib) * asc;
                continue;
            }

            // Dates: compare timestamp
            if (field === 'broadcast_date') {
                const pa = parseBroadcastDate(av);
                const pb = parseBroadcastDate(bv);
                const da = pa.date ? pa.date.getTime() : null;
                const db = pb.date ? pb.date.getTime() : null;
                if (da == null && db == null) continue;
                if (da == null) return 1 * asc;
                if (db == null) return -1 * asc;
                if (da !== db) return (da - db) * asc;
                continue;
            }

            // Strings (case-insensitive)
            const sa = String(av).toLowerCase();
            const sb = String(bv).toLowerCase();
            if (sa < sb) return -1 * asc;
            if (sa > sb) return 1 * asc;
            // else equal -> next sort key
        }
        return 0;
    });
}

// Map field name to comparable value
function getFieldValueForSort(ep, field) {
    switch (field) {
        case 'rank': return ep.rank;
        case 'title': return ep.title;
        case 'series': return ep.series;
        case 'era': return ep.era;
        case 'broadcast_date': return ep.broadcast_date;
        case 'director': return ep.director;
        case 'writer': return ep.writer;
        case 'doctor': return ep.doctor && ep.doctor.actor ? `${ep.doctor.actor} (${ep.doctor.incarnation || ''})` : '';
        case 'companion': return ep.companion && ep.companion.actor ? `${ep.companion.actor} (${ep.companion.character || ''})` : '';
        case 'cast': return ep.cast ? ep.cast.length : 0;
        default: return ep[field];
    }
}

// Render episodes table with optional decade grouping
function displayEpisodes() {
    // clear body
    $tbody.innerHTML = '';

    if (!state.filtered.length) {
        $table.style.display = 'none';
        $noResults.style.display = 'block';
        return;
    }
    $noResults.style.display = 'none';
    $table.style.display = 'table';

    // We'll group by decade (bonus) into <details> blocks
    const grouped = groupByDecade(state.filtered);

    // Build rows
    for (const decade of Object.keys(grouped).sort((a,b)=>a-b)) {
        const eps = grouped[decade];

        // Create a decade header row as a single <tr> that spans columns and includes a details element
        const trWrap = document.createElement('tr');
        const tdWrap = document.createElement('td');
        tdWrap.colSpan = 10;
        tdWrap.style.background = '#eef3fb';
        tdWrap.style.borderTop = '2px solid #ddd';

        const details = document.createElement('details');
        details.open = true;
        details.style.padding = '6px 0';

        const summary = document.createElement('summary');
        summary.style.fontWeight = '600';
        summary.style.cursor = 'pointer';
        summary.textContent = `${decade}s — ${eps.length} episode${eps.length !== 1 ? 's' : ''}`;
        details.appendChild(summary);

        // Create a container table for decade rows
        const innerTable = document.createElement('table');
        innerTable.style.width = '100%';
        innerTable.style.borderCollapse = 'collapse';
        innerTable.style.marginTop = '8px';

        const innerTbody = document.createElement('tbody');

        eps.forEach(ep => {
            const tr = document.createElement('tr');
            // mark as an interactive data row so keyboard navigation can target it reliably
            tr.setAttribute('data-data-row', '1');
            tr.tabIndex = 0; // make focusable
            tr.setAttribute('role', 'row');

            let td = document.createElement('td');
            text(td, ep.rank != null ? ep.rank : '—');
            tr.appendChild(td);

            td = document.createElement('td');
            text(td, ep.title || 'Untitled');
            tr.appendChild(td);

            td = document.createElement('td');
            text(td, ep.series != null ? ep.series : '—');
            tr.appendChild(td);

            td = document.createElement('td');
            text(td, ep.era || '—');
            tr.appendChild(td);

            td = document.createElement('td');
            const parsed = parseBroadcastDate(ep.broadcast_date);
            text(td, parsed.year != null ? parsed.year : '—');
            tr.appendChild(td);

            td = document.createElement('td');
            text(td, ep.director || '—');
            tr.appendChild(td);

            td = document.createElement('td');
            const writers = formatWriters(ep.writer);
            text(td, writers || '—');
            tr.appendChild(td);

            td = document.createElement('td');
            const doc = (ep.doctor && ep.doctor.actor) ? `${ep.doctor.actor}${ep.doctor.incarnation ? ' (' + ep.doctor.incarnation + ')' : ''}` : '—';
            text(td, doc);
            tr.appendChild(td);

            td = document.createElement('td');
            // Show explicit 'None' when companion is null to match spec guidance
            const comp = (ep.companion === null) ? 'None' : (ep.companion ? (ep.companion.actor ? `${ep.companion.actor}${ep.companion.character ? ' (' + ep.companion.character + ')' : ''}` : '—') : '—');
            text(td, comp);
            tr.appendChild(td);

            // Cast Count
            td = document.createElement('td');
            const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;
            const badge = document.createElement('span');
            badge.className = 'cast-count';
            text(badge, castCount);
            td.appendChild(badge);
            tr.appendChild(td);

            // row click/keyboard: open episode details modal
            tr.addEventListener('click', () => showEpisodeModal(ep));
            tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') showEpisodeModal(ep); });

            innerTbody.appendChild(tr);
        });

        innerTable.appendChild(innerTbody);
        details.appendChild(innerTable);
        tdWrap.appendChild(details);
        trWrap.appendChild(tdWrap);
        $tbody.appendChild(trWrap);
    }
}

// Helper: group by decade (returns object keyed by decade start year)
function groupByDecade(episodes) {
    const map = {};
    for (const ep of episodes) {
        const parsed = parseBroadcastDate(ep.broadcast_date);
        const year = parsed.year || (ep.series ? (2000 + (ep.series % 100)) : 0);
        const decade = year ? Math.floor(year / 10) * 10 : 0;
        if (!map[decade]) map[decade] = [];
        map[decade].push(ep);
    }
    return map;
}

// --- Modal helpers ---
const $episodeModal = document.getElementById('episode-modal');
const $episodeModalBody = document.getElementById('episode-modal-body');
const $validationModal = document.getElementById('validation-modal');
const $validationModalBody = document.getElementById('validation-modal-body');

function openModal($m) {
    if (!$m) return;
    $m.setAttribute('aria-hidden', 'false');
    // focus first close button
    const btn = $m.querySelector('.modal-close');
    if (btn) btn.focus();
}

function closeModal($m) {
    if (!$m) return;
    $m.setAttribute('aria-hidden', 'true');
}

// Close any open modal
function closeAllModals() {
    [ $episodeModal, $validationModal ].forEach(m => { if (m) m.setAttribute('aria-hidden', 'true'); });
}

// Show episode modal with details
function showEpisodeModal(ep) {
    if (!$episodeModalBody) return;
    $episodeModalBody.innerHTML = '';

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    const addRow = (k, v) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th'); th.style.width = '180px'; th.textContent = k;
        const td = document.createElement('td'); td.textContent = v == null ? '—' : v;
        tr.appendChild(th); tr.appendChild(td); tbody.appendChild(tr);
    };

    addRow('Rank', ep.rank != null ? ep.rank : '—');
    addRow('Title', ep.title || 'Untitled');
    addRow('Series', ep.series != null ? ep.series : '—');
    addRow('Era', ep.era || '—');
    const parsed = parseBroadcastDate(ep.broadcast_date);
    addRow('Broadcast Date', ep.broadcast_date || '—');
    addRow('Broadcast Year', parsed.year != null ? parsed.year : '—');
    addRow('Director', ep.director || '—');
    addRow('Writer(s)', formatWriters(ep.writer) || '—');
    addRow('Doctor', (ep.doctor && ep.doctor.actor) ? `${ep.doctor.actor}${ep.doctor.incarnation ? ' (' + ep.doctor.incarnation + ')' : ''}` : '—');
    addRow('Companion', (ep.companion === null) ? 'None' : (ep.companion && ep.companion.actor ? `${ep.companion.actor}${ep.companion.character ? ' (' + ep.companion.character + ')' : ''}` : '—'));
    addRow('Cast Count', Array.isArray(ep.cast) ? ep.cast.length : 0);

    // cast list
    const castHeader = document.createElement('tr');
    const th = document.createElement('th'); th.textContent = 'Cast';
    const td = document.createElement('td');
    if (Array.isArray(ep.cast) && ep.cast.length) {
        const ul = document.createElement('ul');
        ep.cast.forEach(c => {
            const li = document.createElement('li');
            li.textContent = `${c.actor || 'Unknown'}${c.character ? ' — ' + c.character : ''}`;
            ul.appendChild(li);
        });
        td.appendChild(ul);
    } else {
        td.textContent = 'None';
    }
    castHeader.appendChild(th); castHeader.appendChild(td); tbody.appendChild(castHeader);

    table.appendChild(tbody);
    $episodeModalBody.appendChild(table);
    openModal($episodeModal);
}

// Show validation modal
function showValidationModal() {
    if (!$validationModalBody) return;
    $validationModalBody.innerHTML = '';
    if (!state.validationWarnings || !state.validationWarnings.length) {
        $validationModalBody.textContent = 'No validation warnings.';
    } else {
        const ol = document.createElement('ol');
        state.validationWarnings.forEach(w => {
            const li = document.createElement('li'); li.textContent = w; ol.appendChild(li);
        });
        $validationModalBody.appendChild(ol);
    }
    openModal($validationModal);
}

// Global modal click/close wiring
document.addEventListener('click', (e) => {
    const closeAttr = e.target && e.target.getAttribute && e.target.getAttribute('data-close');
    if (closeAttr) {
        // find containing modal
        const modal = e.target.closest('.modal');
        if (modal) closeModal(modal);
    }
});

// Escape to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
});

// Validation badge click opens the validation modal
document.addEventListener('DOMContentLoaded', () => {
    const badge = document.getElementById('validation-badge');
    if (badge) {
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', showValidationModal);
    }
});

// Utility: split/format writer field
function formatWriters(writerRaw) {
    if (!writerRaw) return '';
    // split on " & " or " and " but keep edge cases
    return writerRaw.split(/\s*&\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean).join(', ');
}

// Show/Hide loading & table states
function showLoading(show) {
    $loading.style.display = show ? 'block' : 'none';
    // only show table when not loading and results exist
    if (show) {
        $table.style.display = 'none';
        $noResults.style.display = 'none';
    }
}

// Show errors in error area
function showError(message) {
    if (!message) {
        $error.style.display = 'none';
        $error.textContent = '';
        return;
    }
    $error.style.display = 'block';
    $error.textContent = message;
}

// Handler: apply filters, sort, then display
function applyFiltersAndDisplay() {
    filterEpisodes();
    sortEpisodes();
    displayEpisodes();
    updateTableHeaderSortIndicators();
}

// Setup event listeners
function setupEventListeners() {
    injectExtraControls();

    // Name filter: debounce
    const debouncedFilter = debounce((val) => {
        state.filters.name = val;
        applyFiltersAndDisplay();
    }, CONFIG.DEBOUNCE_MS);

    $nameFilter.addEventListener('input', (e) => {
        debouncedFilter(e.target.value);
    });

    // Enhanced selects
    const eraSelect = document.getElementById('era-filter');
    const doctorSelect = document.getElementById('doctor-filter');
    const companionSelect = document.getElementById('companion-filter');

    eraSelect.addEventListener('change', (e) => {
        state.filters.era = e.target.value;
        applyFiltersAndDisplay();
    });

    doctorSelect.addEventListener('change', (e) => {
        state.filters.doctor = e.target.value;
        applyFiltersAndDisplay();
    });

    companionSelect.addEventListener('change', (e) => {
        state.filters.companion = e.target.value;
        applyFiltersAndDisplay();
    });

    // Export CSV
    document.getElementById('export-csv').addEventListener('click', exportCSV);

    // Column header sorting (supports Shift+click for multi-column)
    $thead.querySelectorAll('th[data-sort]').forEach(th => {
        th.tabIndex = 0; // make focusable
        th.addEventListener('click', (e) => {
            handleHeaderSortClick(th.dataset.sort, e.shiftKey);
        });
        th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleHeaderSortClick(th.dataset.sort, e.shiftKey);
        });
    });

    // Keyboard navigation: arrow keys to move between rows (simple)
    $table.addEventListener('keydown', (e) => {
        if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
        // only consider actual data rows
        const focusableRows = Array.from($tbody.querySelectorAll('tr[data-data-row]'));
        if (!focusableRows.length) return;
        const active = document.activeElement;
        const activeRow = active && active.closest ? active.closest('tr[data-data-row]') : null;
        let idx = activeRow ? focusableRows.indexOf(activeRow) : -1;
        if (idx === -1) {
            focusableRows[0].focus();
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowDown' && idx < focusableRows.length - 1) idx++;
        if (e.key === 'ArrowUp' && idx > 0) idx--;
        focusableRows[idx].focus();
        e.preventDefault();
    }, true);
}

// Handle header click sorting
function handleHeaderSortClick(field, shiftKey) {
    if (!shiftKey) {
        // replace sort array with clicked field toggled
        const existing = state.sort.find(s => s.field === field);
        if (existing) {
            existing.ascending = !existing.ascending;
            state.sort = [existing];
        } else {
            state.sort = [{ field, ascending: true }];
        }
    } else {
        // multi-column: toggle or add
        const idx = state.sort.findIndex(s => s.field === field);
        if (idx === -1) {
            state.sort.push({ field, ascending: true });
        } else {
            state.sort[idx].ascending = !state.sort[idx].ascending;
        }
    }
    applyFiltersAndDisplay();
}

// Update sort indicators on headers
function updateTableHeaderSortIndicators() {
    const ths = $thead.querySelectorAll('th[data-sort]');
    ths.forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    state.sort.forEach((s, i) => {
        const th = $thead.querySelector(`th[data-sort="${s.field}"]`);
        if (th) {
            th.classList.add(s.ascending ? 'sort-asc' : 'sort-desc');
            // show secondary ordering by smaller font - append index
            // (simple visual cue: title attr)
            th.title = `Sort priority ${i + 1}`;
        }
    });
}

// Populate Era, Doctor, Companion selects based on data
function populateFilterOptions() {
    const eraSet = new Set();
    const doctorSet = new Set();
    const companionSet = new Set();

    state.episodes.forEach(ep => {
        if (ep.era) eraSet.add(ep.era);
        if (ep.doctor && ep.doctor.actor) doctorSet.add(ep.doctor.actor);
        if (ep.companion && ep.companion.actor) companionSet.add(ep.companion.actor);
    });

    const eraSelect = document.getElementById('era-filter');
    const doctorSelect = document.getElementById('doctor-filter');
    const companionSelect = document.getElementById('companion-filter');

    // helper to fill
    fillSelect(eraSelect, ['All', ...Array.from(eraSet).sort((a,b) => {
        // keep configured order if possible
        const ia = CONFIG.ERA_ORDER.indexOf(a);
        const ib = CONFIG.ERA_ORDER.indexOf(b);
        if (ia !== -1 || ib !== -1) {
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        }
        return a.localeCompare(b);
    })]);

    fillSelect(doctorSelect, ['All', ...Array.from(doctorSet).sort()]);
    fillSelect(companionSelect, ['All', ...Array.from(companionSet).sort()]);
}

// Helper to fill select preserving selected if possible
function fillSelect(sel, values) {
    const prev = sel.value;
    sel.innerHTML = '';
    values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        text(opt, v);
        sel.appendChild(opt);
    });
    if (values.includes(prev)) sel.value = prev;
}

// Export filtered results to CSV (includes visible columns)
function exportCSV() {
    if (!state.filtered.length) {
        alert('No episodes to export.');
        return;
    }
    const cols = ['Rank','Title','Series','Era','Broadcast Year','Director','Writer','Doctor','Companion','Cast Count'];
    const rows = state.filtered.map(ep => {
        const parsed = parseBroadcastDate(ep.broadcast_date);
        const year = parsed.year || '';
        const writers = formatWriters(ep.writer);
        const doctor = ep.doctor && ep.doctor.actor ? `${ep.doctor.actor}${ep.doctor.incarnation ? ' ('+ep.doctor.incarnation+')' : ''}` : '';
        const companion = ep.companion && ep.companion.actor ? `${ep.companion.actor}${ep.companion.character ? ' ('+ep.companion.character+')' : ''}` : '';
        const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;
        return [
            ep.rank != null ? ep.rank : '',
            ep.title || '',
            ep.series != null ? ep.series : '',
            ep.era || '',
            year,
            ep.director || '',
            writers,
            doctor,
            companion,
            castCount
        ];
    });
    const csv = [cols, ...rows].map(r => r.map(escapeCSV).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'doctor-who-episodes-export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function escapeCSV(val) {
    if (val == null) return '';
    const s = String(val);
    // escape double quotes
    const escaped = s.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
        return `"${escaped}"`;
    }
    return escaped;
}

// Debounce helper
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Initialization
function init() {
    setupEventListeners();
    loadEpisodes().catch(err => {
        console.error('Init load failed:', err);
        showError('Initialization failed: ' + err.message);
    });
}

// Kick off
document.addEventListener('DOMContentLoaded', init);
