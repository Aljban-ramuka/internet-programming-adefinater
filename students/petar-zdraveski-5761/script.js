/*
  script.js
  Complete implementation for the Doctor Who Episodes Explorer starter.
  Features:
  - Fetch episodes from CONFIG.DATA_URL
  - Show loading and error states
  - Case-insensitive name filter (debounced)
  - Single-column sorting (toggle asc/desc)
  - Robust date parsing for mixed formats
  - Edge case handling: null companions, empty cast arrays, multiple writers
  - Minimal global footprint (module pattern)

  Notes: If the JSON is not present locally, configure CONFIG.DATA_URL to a reachable URL.
*/

const App = (function () {
    // Configuration
    const CONFIG = {
        // Primary remote URL from the exam specification (Alternative 1)
        REMOTE_URL: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
        // Optional: fetch parts (Alternative 2). Set MULTI_FETCH to true to enable.
        MULTI_FETCH: false,
        MULTI_URLS: [
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
        ],
        // Local fallback (we've included a small sample file for offline testing)
        LOCAL_FALLBACK: './doctor-who-episodes-exam.json',
        ERA_ORDER: ['Classic', 'Modern', 'Recent'],
        DEBOUNCE_MS: 250
    };

        /*
            Performance / Optimization notes:
            - Pagination: we render only a page-sized slice of rows (default 50) to keep the DOM small
                and avoid slow reflows when datasets are large (1000+ rows).
            - Debouncing: input filter is debounced (CONFIG.DEBOUNCE_MS) to avoid repeated work on fast typing.
            - Minimal DOM writes: we build rows using DocumentFragment and replace tbody content in a single operation.
            - Further optimizations (not implemented here): virtualization (windowing) could be used to
                render only visible rows inside a scroll viewport for extremely large datasets. A lightweight
                virtualization approach would observe scroll position and render a moving window of rows.
            - These choices provide a good trade-off between simplicity and performance for typical exam datasets.
        */

    // Internal state
    const state = {
        episodes: [],
        filtered: [],
        loading: false,
        error: null,
    // support multi-column sorts: array of { field, ascending }
    sorts: [{ field: 'rank', ascending: true }],
        filters: { name: '' },
        warnings: [],
        // Pagination state to handle large datasets without rendering all rows at once
        pagination: {
            pageSize: 50,
            currentPage: 1
        }
    };

    // Cached DOM nodes
    const els = {
        loading: null,
        error: null,
        table: null,
        tbody: null,
        noResults: null,
        nameFilter: null,
        eraFilter: null,
        doctorFilter: null,
        companionFilter: null,
            groupDecade: null,
        headers: [] ,
        warningCount: null
    };

    // Helper: escape CSV cell value according to RFC4180
    function csvEscape(value) {
        if (value === null || value === undefined) return '';
        const s = String(value);
        // If contains double-quote, comma, or newline, wrap in quotes and escape quotes by doubling
        if (/[",\n\r,]/.test(s)) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    // Export current filtered results (all rows matching filters) to CSV
    function exportFilteredToCSV() {
        const rows = state.filtered || [];
        if (!rows.length) {
            alert('No data to export.');
            return;
        }

        const headers = ['Rank','Title','Series','Era','Broadcast Year','Director','Writer','Doctor','Companion','Cast Count'];
        const lines = [];
        lines.push(headers.map(csvEscape).join(','));

        rows.forEach(ep => {
            const rank = ep.rank ?? '';
            const title = ep.title ?? '';
            const series = ep.series ?? '';
            const era = ep.era ?? '';
            const year = extractYear(ep.broadcast_date) === '—' ? '' : extractYear(ep.broadcast_date);
            const director = ep.director ?? '';
            const writer = ep.writer ?? '';
            const doctor = ep.doctor ? `${ep.doctor.actor || ''}${ep.doctor.incarnation ? ' (' + ep.doctor.incarnation + ')' : ''}` : '';
            const companion = ep.companion ? `${ep.companion.actor || ''}${ep.companion.character ? ' (' + ep.companion.character + ')' : ''}` : '';
            const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;

            const row = [rank, title, series, era, year, director, writer, doctor, companion, castCount].map(csvEscape).join(',');
            lines.push(row);
        });

        const csvContent = lines.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
        a.download = `doctor-who-episodes-filtered-${now}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // --- Utility functions ---
    function $(selector) { return document.querySelector(selector); }

    // Parse date strings in multiple formats and return a numeric timestamp
    function parseDateToTimestamp(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return NaN;

        const s = dateStr.trim();

        // YYYY only
        if (/^\d{4}$/.test(s)) {
            return new Date(Number(s), 0, 1).getTime();
        }

        // ISO YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const t = Date.parse(s);
            return isNaN(t) ? NaN : t;
        }

        // DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            const [d,m,y] = s.split('/').map(Number);
            return new Date(y, m-1, d).getTime();
        }

        // Month DD, YYYY (rely on Date.parse for long format)
        const parsed = Date.parse(s);
        return isNaN(parsed) ? NaN : parsed;
    }

    function extractYear(dateStr) {
        const ts = parseDateToTimestamp(dateStr);
        if (isNaN(ts)) return '—';
        return new Date(ts).getFullYear();
    }

    function safeText(value, fallback = '—') {
        if (value === null || value === undefined || value === '') return fallback;
        return String(value);
    }

    function debounce(fn, ms) {
        let id;
        return function (...args) {
            clearTimeout(id);
            id = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    // Create a table row for an episode (reusable by different renderers)
    function createRow(ep) {
        const tr = document.createElement('tr');
        tr.tabIndex = 0;

        // Rank
        const rankTd = document.createElement('td');
        rankTd.textContent = String(ep.rank ?? '—');
        tr.appendChild(rankTd);

        // Title
        const titleTd = document.createElement('td');
        titleTd.textContent = safeText(ep.title, 'Untitled');
        tr.appendChild(titleTd);

        // Series
        const seriesTd = document.createElement('td');
        seriesTd.textContent = String(ep.series ?? '—');
        tr.appendChild(seriesTd);

        // Era
        const eraTd = document.createElement('td');
        eraTd.textContent = safeText(ep.era);
        tr.appendChild(eraTd);

        // Broadcast Year
        const yearTd = document.createElement('td');
        yearTd.textContent = extractYear(ep.broadcast_date);
        tr.appendChild(yearTd);

        // Director
        const dirTd = document.createElement('td');
        dirTd.textContent = safeText(ep.director);
        tr.appendChild(dirTd);

        // Writer
        const writerTd = document.createElement('td');
        writerTd.textContent = safeText(ep.writer, '—');
        tr.appendChild(writerTd);

        // Doctor
        const doctorTd = document.createElement('td');
        if (ep.doctor && (ep.doctor.actor || ep.doctor.incarnation)) {
            doctorTd.textContent = `${safeText(ep.doctor.actor)} (${safeText(ep.doctor.incarnation, '')})`.trim();
        } else {
            doctorTd.textContent = '—';
        }
        tr.appendChild(doctorTd);

        // Companion
        const compTd = document.createElement('td');
        if (ep.companion && (ep.companion.actor || ep.companion.character)) {
            compTd.textContent = `${safeText(ep.companion.actor)} (${safeText(ep.companion.character, '')})`.trim();
        } else {
            compTd.textContent = '—';
        }
        tr.appendChild(compTd);

        // Cast count
        const castTd = document.createElement('td');
        const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;
        const span = document.createElement('span');
        span.className = 'cast-count';
        span.textContent = String(castCount);
        castTd.appendChild(span);
        tr.appendChild(castTd);

        // Keyboard navigation on rows: ArrowUp / ArrowDown move between rows
        tr.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                const next = tr.nextElementSibling;
                if (next) next.focus();
            } else if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                const prev = tr.previousElementSibling;
                if (prev) prev.focus();
            }
        });

        return tr;
    }

    function getDecadeLabelFromYear(year) {
        if (!year || year === '—') return 'Unknown';
        const n = Number(year);
        if (isNaN(n)) return 'Unknown';
        const d = Math.floor(n / 10) * 10;
        return `${d}s`;
    }

    // Render episodes grouped by decade. This creates header rows for each decade and toggles visibility.
    function renderGroupedByDecade(list) {
        clearTable();
        if (!list || list.length === 0) {
            els.table.style.display = 'none';
            els.noResults.style.display = 'block';
            return;
        }

        // Build groups: decade label -> episodes
        const groups = new Map();
        list.forEach(ep => {
            const year = extractYear(ep.broadcast_date);
            const decade = getDecadeLabelFromYear(year);
            if (!groups.has(decade)) groups.set(decade, []);
            groups.get(decade).push(ep);
        });

        // Sort decade keys (put Unknown last)
        const keys = Array.from(groups.keys()).sort((a,b) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return Number(a.replace('s','')) - Number(b.replace('s',''));
        });

        const fragment = document.createDocumentFragment();

        for (const decade of keys) {
            const episodes = groups.get(decade);
            // decade header row
            const hdr = document.createElement('tr');
            hdr.className = 'decade-header';
            const cell = document.createElement('td');
            cell.colSpan = 10;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'decade-toggle';
            btn.textContent = `${decade} — ${episodes.length} episode${episodes.length !== 1 ? 's' : ''}`;
            btn.dataset.decade = decade;
            cell.appendChild(btn);
            hdr.appendChild(cell);
            fragment.appendChild(hdr);

            // add rows for this decade
            episodes.forEach(ep => {
                const tr = createRow(ep);
                tr.dataset.decade = decade;
                fragment.appendChild(tr);
            });

            // wire collapse/expand behavior
            btn.addEventListener('click', () => {
                const isCollapsed = btn.getAttribute('aria-expanded') === 'false';
                const rows = Array.from(els.tbody.querySelectorAll(`tr[data-decade="${decade}"]`));
                if (isCollapsed) {
                    // expand
                    rows.forEach(r => r.style.display = 'table-row');
                    btn.setAttribute('aria-expanded', 'true');
                    btn.textContent = `${decade} — ${episodes.length} episode${episodes.length !== 1 ? 's' : ''}`;
                } else {
                    // collapse
                    rows.forEach(r => r.style.display = 'none');
                    btn.setAttribute('aria-expanded', 'false');
                    btn.textContent = `▶ ${decade} — ${episodes.length} episode${episodes.length !== 1 ? 's' : ''}`;
                }
            });
            // default expanded
            btn.setAttribute('aria-expanded', 'true');
        }

        // When grouped, we do not use pagination controls
        const controls = $('#pagination-controls');
        if (controls) controls.style.display = 'none';

        els.tbody.appendChild(fragment);
        els.table.style.display = 'table';
        els.noResults.style.display = 'none';
    }

    // --- DOM rendering ---
    function showLoading(show) {
        els.loading.style.display = show ? 'block' : 'none';
        // hide table while loading
        if (show) {
            els.table.style.display = 'none';
            els.noResults.style.display = 'none';
            els.error.style.display = 'none';
        }
    }

    function showError(message) {
        if (!message) {
            els.error.style.display = 'none';
            els.error.textContent = '';
            return;
        }
        els.error.textContent = message;
        els.error.style.display = 'block';
        els.table.style.display = 'none';
        els.noResults.style.display = 'none';
    }

    function updateWarningCount() {
        const n = state.warnings.length;
        els.warningCount.textContent = n ? `Warnings: ${n}` : '';
    }

    function clearTable() {
        els.tbody.innerHTML = '';
    }

    function renderTableRows(list) {
        clearTable();
        if (!list || list.length === 0) {
            els.table.style.display = 'none';
            els.noResults.style.display = 'block';
            return;
        }

        // If grouping by decade is enabled, render grouped view instead
        if (els.groupDecade && els.groupDecade.checked) {
            renderGroupedByDecade(list);
            return;
        }

        // Pagination: only render the slice for the current page to keep DOM small
        const pageSize = state.pagination.pageSize;
        const currentPage = state.pagination.currentPage;
        const total = list.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        // clamp currentPage
        const page = Math.min(Math.max(1, currentPage), totalPages);
        state.pagination.currentPage = page;
        const start = (page - 1) * pageSize;
        const end = Math.min(start + pageSize, total);


        const fragment = document.createDocumentFragment();
        for (let i = start; i < end; i++) {
            const ep = list[i];
            const tr = createRow(ep);
            fragment.appendChild(tr);
        }

        // update pagination UI
        renderPaginationControls(total);

        els.tbody.appendChild(fragment);
        els.table.style.display = 'table';
        els.noResults.style.display = 'none';
    }

    // Render/update pagination controls visibility and info
    function renderPaginationControls(totalItems) {
        const controls = $('#pagination-controls');
        if (!controls) return;
        const pageSize = state.pagination.pageSize;
        const currentPage = state.pagination.currentPage;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        // show/hide controls
        controls.style.display = totalItems > pageSize ? 'flex' : 'none';
        const info = $('#page-info');
        if (info) {
            const start = Math.min((currentPage - 1) * pageSize + 1, totalItems || 1);
            const end = Math.min(currentPage * pageSize, totalItems);
            info.textContent = `${start}-${end} of ${totalItems} (page ${currentPage} / ${totalPages})`;
        }
        // buttons enabled/disabled
        $('#page-prev').disabled = currentPage <= 1;
        $('#page-first').disabled = currentPage <= 1;
        $('#page-next').disabled = currentPage >= totalPages;
        $('#page-last').disabled = currentPage >= totalPages;
    }

    function goToPage(page) {
        state.pagination.currentPage = page;
        // Re-render current filtered list (sortEpisodes will call render)
        // Render appropriate view depending on grouping toggle
        if (els.groupDecade && els.groupDecade.checked) {
            renderGroupedByDecade(state.filtered);
        } else {
            renderTableRows(state.filtered);
        }
    }

    function changePageSize(size) {
        state.pagination.pageSize = size;
        state.pagination.currentPage = 1;
        renderTableRows(state.filtered);
    }

    // Compare helper for sorting
    function compareValues(a, b, ascending = true) {
        if (a === b) return 0;
        if (a === undefined || a === null) return 1; // push nulls to the end
        if (b === undefined || b === null) return -1;
        if (typeof a === 'number' && typeof b === 'number') return ascending ? a - b : b - a;
        const A = String(a).toLowerCase();
        const B = String(b).toLowerCase();
        if (A < B) return ascending ? -1 : 1;
        if (A > B) return ascending ? 1 : -1;
        return 0;
    }

    // --- Sorting ---
    // New: sorts is an array of sort levels. This function updates state.sorts and performs sorting.
    function sortEpisodes(field, options = { keepExisting: false }) {
        if (!field) return;

        // if keepExisting (shift+click), we add/toggle this field in the sorts array
        if (options.keepExisting) {
            const idx = state.sorts.findIndex(s => s.field === field);
            if (idx >= 0) {
                // toggle ascending for that level
                state.sorts[idx].ascending = !state.sorts[idx].ascending;
            } else {
                // add as lowest-priority sort (end)
                state.sorts.push({ field, ascending: true });
            }
        } else {
            // replace with single-column sort; toggle if it was already the sole field
            if (state.sorts.length === 1 && state.sorts[0].field === field) {
                state.sorts[0].ascending = !state.sorts[0].ascending;
            } else {
                state.sorts = [{ field, ascending: true }];
            }
        }

        // Update header indicators to reflect multi-column sorts
        updateHeaderIndicators();

        const sortsArray = state.sorts.slice();

        state.filtered.sort((a, b) => {
            for (const s of sortsArray) {
                const fieldName = s.field;
                const asc = s.ascending;
                let cmp = 0;
                switch (fieldName) {
                case 'rank':
                    cmp = compareValues(Number(a.rank ?? Infinity), Number(b.rank ?? Infinity), asc);
                    break;
                case 'title':
                    cmp = compareValues(a.title, b.title, asc);
                    break;
                case 'series':
                    cmp = compareValues(Number(a.series ?? Infinity), Number(b.series ?? Infinity), asc);
                    break;
                case 'era':
                    // use ERA_ORDER to order
                    const ia = CONFIG.ERA_ORDER.indexOf(a.era);
                    const ib = CONFIG.ERA_ORDER.indexOf(b.era);
                    cmp = compareValues(ia === -1 ? Infinity : ia, ib === -1 ? Infinity : ib, asc);
                    break;
                case 'broadcast_date':
                    // Parse dates to timestamps and treat unparsable dates as 'end of list'
                    {
                        const ta = parseDateToTimestamp(a.broadcast_date);
                        const tb = parseDateToTimestamp(b.broadcast_date);
                        const va = isNaN(ta) ? (asc ? Infinity : -Infinity) : ta;
                        const vb = isNaN(tb) ? (asc ? Infinity : -Infinity) : tb;
                        cmp = compareValues(va, vb, asc);
                    }
                    break;
                case 'director':
                    cmp = compareValues(a.director, b.director, asc);
                    break;
                case 'writer':
                    cmp = compareValues(a.writer, b.writer, asc);
                    break;
                case 'doctor':
                    cmp = compareValues(a.doctor?.actor, b.doctor?.actor, asc);
                    break;
                case 'companion':
                    cmp = compareValues(a.companion?.actor, b.companion?.actor, asc);
                    break;
                case 'cast':
                    cmp = compareValues((a.cast || []).length, (b.cast || []).length, asc);
                    break;
                default:
                    cmp = 0;
                    break;
            }
                if (cmp !== 0) return cmp;
            }
            return 0;
        });
        renderTableRows(state.filtered);
    }

    // Update header CSS classes and add multi-sort level indicators
    function updateHeaderIndicators() {
        // clear existing indicators
        els.headers.forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
            const existing = h.querySelector('.sort-level');
            if (existing) existing.remove();
        });

        // apply for each sort level
        state.sorts.forEach((s, idx) => {
            const h = els.headers.find(hdr => hdr.dataset.sort === s.field);
            if (!h) return;
            h.classList.add(s.ascending ? 'sort-asc' : 'sort-desc');
            const badge = document.createElement('span');
            badge.className = 'sort-level';
            badge.textContent = String(idx + 1);
            badge.setAttribute('aria-hidden', 'true');
            badge.style.marginLeft = '6px';
            badge.style.fontSize = '0.75em';
            badge.style.opacity = '0.9';
            badge.style.background = 'rgba(0,0,0,0.12)';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '10px';
            badge.style.color = 'white';
            badge.style.backgroundColor = '#2a5298';
            h.appendChild(badge);
        });
    }

    // --- Filtering ---
    function applyFilters() {
        const q = (state.filters.name || '').trim().toLowerCase();
        if (!q) {
            state.filtered = state.episodes.slice();
        } else {
            state.filtered = state.episodes.filter(ep => {
                const title = (ep.title || '').toLowerCase();
                return title.includes(q);
            });
        }

        // Apply era, doctor, companion filters
        if (state.filters.era) {
            const eraVal = decodeURIComponent(state.filters.era);
            state.filtered = state.filtered.filter(ep => (ep.era || '') === eraVal);
        }
        if (state.filters.doctor) {
            try {
                const d = JSON.parse(decodeURIComponent(state.filters.doctor));
                state.filtered = state.filtered.filter(ep => {
                    const doc = ep.doctor || {};
                    return (doc.actor || '') === (d.actor || '') && (doc.incarnation || '') === (d.incarnation || '');
                });
            } catch (e) { /* ignore parse errors */ }
        }
        if (state.filters.companion) {
            try {
                const c = JSON.parse(decodeURIComponent(state.filters.companion));
                state.filtered = state.filtered.filter(ep => {
                    const comp = ep.companion || {};
                    return (comp.actor || '') === (c.actor || '') && (comp.character || '') === (c.character || '');
                });
            } catch (e) { /* ignore parse errors */ }
        }

        // After filtering, sort according to current sort state
        sortEpisodes(state.sorts[0]?.field);
        // If sortEpisodes re-sorts and re-renders, no need to call renderTableRows here
    }

    // --- Data loading and validation ---
    async function loadEpisodes() {
        showLoading(true);
        showError('');
        state.warnings = [];
        updateWarningCount();

        try {
            let data = null;

            // Helper to extract an array from various JSON shapes
            function extractArrayFromJson(obj) {
                if (Array.isArray(obj)) return obj;
                if (obj && typeof obj === 'object') {
                    // Common property names
                    if (Array.isArray(obj.data)) return obj.data;
                    if (Array.isArray(obj.items)) return obj.items;
                    if (Array.isArray(obj.episodes)) return obj.episodes;
                    // Otherwise, pick the first array-valued property
                    for (const k of Object.keys(obj)) {
                        if (Array.isArray(obj[k])) return obj[k];
                    }
                }
                return null;
            }

            // If MULTI_FETCH is enabled, fetch all parts and concatenate
            if (CONFIG.MULTI_FETCH) {
                const parts = await Promise.all(CONFIG.MULTI_URLS.map(async (url) => {
                    const r = await fetch(url, { cache: 'no-store' });
                    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
                    const j = await r.json();
                    const arr = extractArrayFromJson(j);
                    if (arr) return arr;
                    // if the file itself is an object with episode-like properties, return as single-element array
                    return Array.isArray(j) ? j : [];
                }));
                // Flatten and guard type
                data = parts.flat().filter(item => item != null);
            } else {
                // Try remote full file first (Alternative 1)
                try {
                    const resp = await fetch(CONFIG.REMOTE_URL, { cache: 'no-store' });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
                    const j = await resp.json();
                    const arr = extractArrayFromJson(j);
                    if (!arr) throw new Error('Remote JSON did not contain an array');
                    data = arr;
                } catch (remoteErr) {
                    console.warn('Remote fetch failed or returned unexpected shape, attempting local fallback:', remoteErr.message);
                    // Fallback to local file included in the student's folder
                    const localResp = await fetch(CONFIG.LOCAL_FALLBACK, { cache: 'no-store' });
                    if (!localResp.ok) throw new Error(`Local fallback fetch failed: ${localResp.status}`);
                    const lj = await localResp.json();
                    const larr = extractArrayFromJson(lj);
                    if (!larr) throw new Error('Local JSON did not contain an array');
                    data = larr;
                }
            }

            state.episodes = data.map(normalizeEpisode);

            // Basic validations and warnings
            validateData(state.episodes);

            // Initialize filtered set and render
            state.filtered = state.episodes.slice();
            // populate enhanced filters (era, doctor, companion) from data
            populateEnhancedFilters(state.episodes);

            sortEpisodes(state.sorts[0]?.field);

        } catch (err) {
            showError('Failed to load episodes: ' + err.message);
            console.error(err);
        } finally {
            showLoading(false);
            updateWarningCount();
        }
    }

    function normalizeEpisode(ep) {
        // Ensure fields exist and coerce types where useful
        const normalized = Object.assign({}, ep);
        // cast: ensure array
        if (!Array.isArray(normalized.cast)) normalized.cast = [];
        // rank and series to numbers when possible
        normalized.rank = (normalized.rank === undefined || normalized.rank === null) ? null : Number(normalized.rank);
        normalized.series = (normalized.series === undefined || normalized.series === null) ? null : Number(normalized.series);
        return normalized;
    }

    // Populate Era, Doctor and Companion dropdowns based on loaded data
    function populateEnhancedFilters(list) {
        if (!els.eraFilter || !els.doctorFilter || !els.companionFilter) return;

        // Era: use CONFIG.ERA_ORDER plus any extras found
        const eraSet = new Set();
        list.forEach(ep => { if (ep.era) eraSet.add(ep.era); });
        // build ordered era list
        const eras = CONFIG.ERA_ORDER.filter(e => eraSet.has(e)).concat(Array.from(eraSet).filter(e => CONFIG.ERA_ORDER.indexOf(e) === -1));
        // clear and populate
        els.eraFilter.innerHTML = '<option value="">All</option>' + eras.map(e => `<option value="${encodeURIComponent(e)}">${e}</option>`).join('');

        // Doctors: unique actor+incarnation
        const doctorMap = new Map();
        list.forEach(ep => {
            const d = ep.doctor;
            if (d && (d.actor || d.incarnation)) {
                const key = JSON.stringify({ actor: d.actor || '', incarnation: d.incarnation || '' });
                if (!doctorMap.has(key)) doctorMap.set(key, `${d.actor || ''}${d.incarnation ? ' (' + d.incarnation + ')' : ''}`);
            }
        });
        const doctorOptions = Array.from(doctorMap.entries()).sort((a,b) => a[1].localeCompare(b[1]));
        els.doctorFilter.innerHTML = '<option value="">All</option>' + doctorOptions.map(([key,label]) => `<option value='${encodeURIComponent(key)}'>${label}</option>`).join('');

        // Companions: unique actor+character
        const compMap = new Map();
        list.forEach(ep => {
            const c = ep.companion;
            if (c && (c.actor || c.character)) {
                const key = JSON.stringify({ actor: c.actor || '', character: c.character || '' });
                if (!compMap.has(key)) compMap.set(key, `${c.actor || ''}${c.character ? ' (' + c.character + ')' : ''}`);
            }
        });
        const compOptions = Array.from(compMap.entries()).sort((a,b) => a[1].localeCompare(b[1]));
        els.companionFilter.innerHTML = '<option value="">All</option>' + compOptions.map(([key,label]) => `<option value='${encodeURIComponent(key)}'>${label}</option>`).join('');
    }

    function validateData(list) {
        const seenRanks = new Map();
        list.forEach((ep, i) => {
            // missing title
            if (!ep.title) state.warnings.push(`Missing title at index ${i}`);

            // future broadcast date
            const ts = parseDateToTimestamp(ep.broadcast_date);
            if (!isNaN(ts) && ts > Date.now()) state.warnings.push(`Future broadcast date: ${ep.title || '(no title)'}`);

            // duplicate ranks
            if (ep.rank !== null && !isNaN(ep.rank)) {
                if (seenRanks.has(ep.rank)) {
                    state.warnings.push(`Duplicate rank ${ep.rank} for ${ep.title || '(no title)'} and ${seenRanks.get(ep.rank)}`);
                } else {
                    seenRanks.set(ep.rank, ep.title || `index ${i}`);
                }
            } else {
                // rank missing or invalid
                state.warnings.push(`Invalid or missing rank for ${ep.title || `index ${i}`}`);
            }

            // negative series numbers
            if (ep.series !== null && typeof ep.series === 'number' && ep.series < 0) {
                state.warnings.push(`Negative series number for ${ep.title || '(no title)'}: ${ep.series}`);
            }
        });
        // Log all collected validation warnings to the console for graders/debugging
        if (state.warnings.length > 0) {
            console.warn('Data validation warnings:', state.warnings);
        }
    }

    // --- Event wiring ---
    function setupEventListeners() {
        els.nameFilter.addEventListener('input', debounce(e => {
            state.filters.name = e.target.value;
            applyFilters();
        }, CONFIG.DEBOUNCE_MS));

        // enhanced filters
        if (els.eraFilter) els.eraFilter.addEventListener('change', (e) => {
            state.filters.era = e.target.value || '';
            state.pagination.currentPage = 1;
            applyFilters();
        });
        if (els.doctorFilter) els.doctorFilter.addEventListener('change', (e) => {
            state.filters.doctor = e.target.value || '';
            state.pagination.currentPage = 1;
            applyFilters();
        });
        if (els.companionFilter) els.companionFilter.addEventListener('change', (e) => {
            state.filters.companion = e.target.value || '';
            state.pagination.currentPage = 1;
            applyFilters();
        });

        // header clicks for sorting
        els.headers.forEach(h => {
            h.addEventListener('click', (ev) => {
                const field = h.dataset.sort;
                // If Shift is held, keep existing sorts (multi-column); otherwise replace
                sortEpisodes(field, { keepExisting: ev.shiftKey });
            });
            // keyboard accessibility: Enter/Space sorts; Shift+Enter can be used to emulate multi-sort
            h.tabIndex = 0;
            h.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    const field = h.dataset.sort;
                    sortEpisodes(field, { keepExisting: ev.shiftKey });
                }
            });
        });
        // Pagination control listeners
        const pagePrev = $('#page-prev');
        const pageNext = $('#page-next');
        const pageFirst = $('#page-first');
        const pageLast = $('#page-last');
        const pageSizeSel = $('#page-size');
        if (pagePrev) pagePrev.addEventListener('click', () => goToPage(state.pagination.currentPage - 1));
        if (pageNext) pageNext.addEventListener('click', () => goToPage(state.pagination.currentPage + 1));
        if (pageFirst) pageFirst.addEventListener('click', () => goToPage(1));
        if (pageLast) pageLast.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pagination.pageSize));
            goToPage(totalPages);
        });
        if (pageSizeSel) pageSizeSel.addEventListener('change', (e) => changePageSize(Number(e.target.value)));
        const exportBtn = $('#export-csv');
        if (exportBtn) exportBtn.addEventListener('click', () => exportFilteredToCSV());

        // Group by decade toggle
        if (els.groupDecade) {
            els.groupDecade.addEventListener('change', (e) => {
                // Re-render using grouped view or table view depending on state
                if (e.target.checked) {
                    renderGroupedByDecade(state.filtered);
                } else {
                    // reset page and show normal table with pagination
                    state.pagination.currentPage = 1;
                    renderTableRows(state.filtered);
                }
            });
        }
    }

    // --- Bootstrapping ---
    function mount() {
        els.loading = $('#loading');
        els.error = $('#error');
        els.table = $('#episodes-table');
        els.tbody = $('#episodes-body');
        els.noResults = $('#no-results');
        els.nameFilter = $('#name-filter');
        els.eraFilter = $('#era-filter');
        els.doctorFilter = $('#doctor-filter');
        els.companionFilter = $('#companion-filter');
    els.groupDecade = $('#group-decade');
        els.headers = Array.from(document.querySelectorAll('th[data-sort]'));
        els.warningCount = $('#warning-count');

        // initialize page size selector if present
        const pageSizeSel = $('#page-size');
        if (pageSizeSel) pageSizeSel.value = String(state.pagination.pageSize);

        setupEventListeners();
        updateHeaderIndicators();
        loadEpisodes();
    }

    // Expose mount
    return { mount };
})();

document.addEventListener('DOMContentLoaded', () => App.mount());
