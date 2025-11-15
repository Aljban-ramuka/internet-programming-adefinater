// Configuration
const CONFIG = {
    DATA_URL: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
    DATE_FORMATS: {
        ISO: 'YYYY-MM-DD',
        UK: 'DD/MM/YYYY',
        LONG: 'MMMM DD, YYYY',
        YEAR: 'YYYY'
    },
    ERA_ORDER: ['Classic', 'Modern', 'Recent'],
    FILTER_DEBOUNCE_MS: 180
};

// State Management
let state = {
    episodes: [],          // Original data
    filtered: [],          // Filtered results
    loading: true,         // Loading state
    error: null,           // Error message
    sort: {
        field: 'rank',     // Current sort field
        ascending: true    // Sort direction
    },
    filters: {
        name: '',          // Current filter value
        era: '',           // Era filter
        doctor: '',        // Doctor filter (added)
        companion: ''      // Companion filter (added)
    },
    warnings: 0,
    ui: {
        groupByDecade: false // NEW: UI flag for grouping
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    const nameInput = document.getElementById('name-filter');
    const eraSelect = document.getElementById('era-filter');
    const doctorSelect = document.getElementById('doctor-filter');
    const companionSelect = document.getElementById('companion-filter');
    const exportBtn = document.getElementById('export-csv');
    const groupCheckbox = document.getElementById('group-decade'); // NEW

    // Debounced filter input
    let timer;
    nameInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.filters.name = e.target.value.trim();
            filterEpisodes();
        }, CONFIG.FILTER_DEBOUNCE_MS);
    });

    // Era select change
    if (eraSelect) {
        eraSelect.addEventListener('change', (e) => {
            state.filters.era = e.target.value;
            filterEpisodes();
        });
    }

    // Doctor select change
    if (doctorSelect) {
        doctorSelect.addEventListener('change', (e) => {
            state.filters.doctor = e.target.value;
            filterEpisodes();
        });
    }

    // Companion select change
    if (companionSelect) {
        companionSelect.addEventListener('change', (e) => {
            state.filters.companion = e.target.value;
            filterEpisodes();
        });
    }

    // Export CSV button
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportFilteredToCSV();
        });
    }

    // Group by decade checkbox listener (NEW)
    if (groupCheckbox) {
        groupCheckbox.addEventListener('change', (e) => {
            state.ui.groupByDecade = !!e.target.checked;
            // Re-render current filtered list with/without grouping
            displayEpisodes(state.filtered);
        });
    }

    // Handle click on decade headers (delegated) - toggle collapse
    const tbody = document.getElementById('episodes-body');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const header = e.target.closest('tr.decade-header');
            if (!header) return;
            const decadeKey = header.dataset.decadeKey;
            if (!decadeKey) return;
            const collapsed = header.classList.toggle('collapsed');
            // Toggle hidden class on rows belonging to this decade
            document.querySelectorAll(`tr.decade-row[data-decade-key="${decadeKey}"]`).forEach(r => {
                if (collapsed) r.classList.add('hidden'); else r.classList.remove('hidden');
            });
        });
    }

    // Column header sorting + keyboard support
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.tabIndex = 0; // make header focusable
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortEpisodes(field);
        });
        th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                const field = th.getAttribute('data-sort');
                sortEpisodes(field);
                e.preventDefault();
            }
            if (e.key === 'ArrowDown' || e.keyCode === 40) {
                // focus first row
                const firstRow = document.querySelector('#episodes-body tr');
                if (firstRow) firstRow.focus();
                e.preventDefault();
            }
        });
    });
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        showError('');
        const res = await fetch(CONFIG.DATA_URL);
        if (!res.ok) throw new Error('Network response was not ok: ' + res.statusText);

        let json;
        try {
            json = await res.json();
        } catch (e) {
            throw new Error('Invalid JSON: ' + (e.message || e));
        }

        // Accept either an array or an object that contains an episodes array
        const arr = extractEpisodeArray(json);
        if (!Array.isArray(arr)) throw new Error('Invalid data format: expected array of episodes (top-level array or { "episodes": [...] })');

        state.episodes = arr.map((ep, idx) => normalizeEpisode(ep, idx));
        runValidationChecks(state.episodes);
        state.filtered = [...state.episodes];

        populateEraFilter();
        populateDoctorFilter();      // NEW
        populateCompanionFilter();   // NEW
        renderWarningCount();
        filterEpisodes(); // will sort and display
    } catch (error) {
        showError('Failed to load episodes: ' + (error.message || error));
        console.error('Load error:', error);
    } finally {
        showLoading(false);
    }
}

// Helper: try to extract an array of episodes from various JSON shapes
function extractEpisodeArray(json) {
    if (!json) return null;
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.episodes)) return json.episodes;
    // fallback: find first property that is an array (useful for wrapped payloads)
    for (const key of Object.keys(json)) {
        if (Array.isArray(json[key])) {
            console.warn(`Using array found at property "${key}" as episodes array`);
            return json[key];
        }
    }
    return null;
}

// Normalize episode (ensure fields exist, parse dates)
function normalizeEpisode(raw, idx) {
    const ep = Object.assign({}, raw);
    // Ensure rank and series are numbers where possible
    if(ep.rank < 0){
        ep.rank = ep.rank * -1;
    }
    else{
        ep.rank = Number(ep.rank);
        }
    
    
    if(ep.series < 0){
        ep.series = ep.series * -1;
    }
    else{
        ep.series = Number(ep.series);
        }
    
    ep._parsedDate = parseDate(ep.broadcast_date);
    ep._year = ep._parsedDate ? (new Date(ep._parsedDate)).getFullYear() : deriveYearFromString(ep.broadcast_date);
    // Ensure cast is array
    if (!Array.isArray(ep.cast)) ep.cast = [];
    // Safety: ensure doctor object
    ep.doctor = ep.doctor || { actor: '', incarnation: '' };
    // companion may be null - keep as null for display logic
    return ep;
}

// Display Functions
function displayEpisodes(episodes) {
    if (state.ui.groupByDecade) {
        renderGroupedEpisodes(episodes);
        // ensure table visible/no-results logic
        document.getElementById('episodes-table').style.display = episodes.length ? 'table' : 'none';
        document.getElementById('no-results').style.display = episodes.length ? 'none' : 'block';
        return;
    }

    const tbody = document.getElementById('episodes-body');
    tbody.innerHTML = '';
    if (!episodes || episodes.length === 0) {
        document.getElementById('episodes-table').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
        return;
    }
    document.getElementById('no-results').style.display = 'none';
    document.getElementById('episodes-table').style.display = 'table';

    const frag = document.createDocumentFragment();
    episodes.forEach((ep, idx) => {
        const tr = document.createElement('tr');
        tr.tabIndex = 0; // make row focusable

        // Focus visual feedback
        tr.addEventListener('focus', () => tr.classList.add('row-focused'));
        tr.addEventListener('blur', () => tr.classList.remove('row-focused'));

        // Keyboard navigation for rows
        tr.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.keyCode === 40) {
                // focus next row if any
                const next = tr.nextElementSibling;
                if (next) next.focus();
                e.preventDefault();
            } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
                const prev = tr.previousElementSibling;
                if (prev) prev.focus();
                else {
                    // move focus back to header (first sortable header)
                    const firstHeader = document.querySelector('th[data-sort]');
                    if (firstHeader) firstHeader.focus();
                }
                e.preventDefault();
            } else if (e.key === 'Enter' || e.keyCode === 13) {
                // Toggle sorting on current sort field (useful quick action)
                sortEpisodes(state.sort.field);
                e.preventDefault();
            }
        });

        // Rank
        const tdRank = document.createElement('td');
        tdRank.textContent = Number.isFinite(ep.rank) ? ep.rank : '—';
        tr.appendChild(tdRank);

        // Title
        const tdTitle = document.createElement('td');
        tdTitle.textContent = ep.title || 'Untitled';
        tr.appendChild(tdTitle);

        // Series
        const tdSeries = document.createElement('td');
        tdSeries.textContent = Number.isFinite(ep.series) ? ep.series : '—';
        tr.appendChild(tdSeries);

        // Era
        const tdEra = document.createElement('td');
        tdEra.textContent = ep.era || '—';
        tr.appendChild(tdEra);

        // Broadcast Year
        const tdYear = document.createElement('td');
        tdYear.textContent = ep._year || '—';
        tr.appendChild(tdYear);

        // Director
        const tdDirector = document.createElement('td');
        tdDirector.textContent = ep.director || '—';
        tr.appendChild(tdDirector);

        // Writer
        const tdWriter = document.createElement('td');
        tdWriter.textContent = ep.writer || '—';
        tr.appendChild(tdWriter);

        // Doctor
        const tdDoctor = document.createElement('td');
        const doctorText = (ep.doctor && (ep.doctor.actor || ep.doctor.incarnation))
            ? `${ep.doctor.actor || ''}${ep.doctor.incarnation ? ` (${ep.doctor.incarnation})` : ''}`.trim()
            : '—';
        tdDoctor.textContent = doctorText;
        tr.appendChild(tdDoctor);

        // Companion
        const tdComp = document.createElement('td');
        if (ep.companion === null || ep.companion === undefined) {
            tdComp.textContent = '—';
        } else {
            const c = ep.companion;
            const compText = (c && (c.actor || c.character))
                ? `${c.actor || ''}${c.character ? ` (${c.character})` : ''}`.trim()
                : '—';
            tdComp.textContent = compText;
        }
        tr.appendChild(tdComp);

        // Cast Count
        const tdCast = document.createElement('td');
        const count = Array.isArray(ep.cast) ? ep.cast.length : 0;
        const span = document.createElement('span');
        span.className = 'cast-count';
        span.textContent = String(count);
        tdCast.appendChild(span);
        tr.appendChild(tdCast);

        frag.appendChild(tr);
    });
    tbody.appendChild(frag);
}

// Helper to render grouped by decade
function renderGroupedEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    tbody.innerHTML = '';

    // Group by decade key "1960s", "1970s", or "Unknown"
    const groups = new Map();
    episodes.forEach(ep => {
        const year = ep._year;
        const key = Number.isFinite(year) ? (Math.floor(year / 10) * 10) : 'unknown';
        const label = key === 'unknown' ? 'Unknown' : `${key}s`;
        const mapKey = (key === 'unknown') ? 'unknown' : String(key);
        if (!groups.has(mapKey)) groups.set(mapKey, { label, items: [] });
        groups.get(mapKey).items.push(ep);
    });

    // Sort decades ascending (unknown last)
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
        if (a === 'unknown') return 1;
        if (b === 'unknown') return -1;
        return Number(a) - Number(b);
    });

    const frag = document.createDocumentFragment();
    sortedKeys.forEach(mapKey => {
        const group = groups.get(mapKey);
        const count = group.items.length;
        // decade header row
        const hdr = document.createElement('tr');
        hdr.className = 'decade-header collapsed'; // start collapsed for brevity
        hdr.dataset.decadeKey = mapKey;
        const td = document.createElement('td');
        td.colSpan = 10; // full width
        td.textContent = `${group.label} — ${count} episode${count !== 1 ? 's' : ''}`;
        hdr.appendChild(td);
        frag.appendChild(hdr);

        // episode rows (initially hidden because header has 'collapsed')
        group.items.forEach(ep => {
            const tr = document.createElement('tr');
            tr.className = 'decade-row hidden';
            tr.dataset.decadeKey = mapKey;
            tr.tabIndex = 0;

            // Build cells quickly (same order as table headers)
            const cells = [
                Number.isFinite(ep.rank) ? ep.rank : '—',
                ep.title || 'Untitled',
                Number.isFinite(ep.series) ? ep.series : '—',
                ep.era || '—',
                ep._year || '—',
                ep.director || '—',
                ep.writer || '—',
                (ep.doctor && (ep.doctor.actor || ep.doctor.incarnation)) ? `${ep.doctor.actor || ''}${ep.doctor.incarnation ? ` (${ep.doctor.incarnation})` : ''}`.trim() : '—',
                (ep.companion === null || ep.companion === undefined) ? '—' : ((ep.companion.actor || '') + (ep.companion.character ? ` (${ep.companion.character})` : '')),
                Array.isArray(ep.cast) ? ep.cast.length : 0
            ];

            cells.forEach(val => {
                const td = document.createElement('td');
                td.tabIndex = -1;
                td.textContent = val;
                tr.appendChild(td);
            });

            frag.appendChild(tr);
        });
    });

    tbody.appendChild(frag);
}

// Sorting Functions
function sortEpisodes(field) {
    if (!field) return;
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }

    // Update header classes
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-sort') === state.sort.field) {
            th.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });

    const dir = state.sort.ascending ? 1 : -1;
    state.filtered.sort((a, b) => {
        let av, bv;
        switch (state.sort.field) {
            case 'broadcast_date':
                av = a._parsedDate ? a._parsedDate : (a._year ? new Date(a._year,0,1).getTime() : -Infinity);
                bv = b._parsedDate ? b._parsedDate : (b._year ? new Date(b._year,0,1).getTime() : -Infinity);
                return (av - bv) * dir;
            case 'title':
                av = (a.title || '').toLowerCase();
                bv = (b.title || '').toLowerCase();
                return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
            case 'doctor':
                av = (a.doctor && a.doctor.actor) ? a.doctor.actor.toLowerCase() : '';
                bv = (b.doctor && b.doctor.actor) ? b.doctor.actor.toLowerCase() : '';
                return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
            case 'companion':
                av = (a.companion && a.companion.actor) ? a.companion.actor.toLowerCase() : '';
                bv = (b.companion && b.companion.actor) ? b.companion.actor.toLowerCase() : '';
                return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
            case 'cast':
                av = Array.isArray(a.cast) ? a.cast.length : 0;
                bv = Array.isArray(b.cast) ? b.cast.length : 0;
                return (av - bv) * dir;
            case 'rank':
            case 'series':
                av = Number.isFinite(a[state.sort.field]) ? a[state.sort.field] : Infinity;
                bv = Number.isFinite(b[state.sort.field]) ? b[state.sort.field] : Infinity;
                return (av - bv) * dir;
            default:
                av = (a[state.sort.field] || '').toString().toLowerCase();
                bv = (b[state.sort.field] || '').toString().toLowerCase();
                return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
        }
    });

    displayEpisodes(state.filtered);
}

// Populate era dropdown using CONFIG.ERA_ORDER, falling back to discovered eras
function populateEraFilter() {
    const select = document.getElementById('era-filter');
    if (!select) return;

    // Collect distinct eras from data
    const found = new Set(state.episodes.map(e => e.era).filter(Boolean));
    // Use CONFIG.ERA_ORDER for consistent ordering, include any extras at the end
    const ordered = [];
    CONFIG.ERA_ORDER.forEach(era => { if (found.has(era)) { ordered.push(era); found.delete(era); }});
    Array.from(found).sort().forEach(e => ordered.push(e));

    // Clear existing options (keep "All" first option)
    select.innerHTML = '<option value="">All</option>';
    ordered.forEach(era => {
        const opt = document.createElement('option');
        opt.value = era;
        opt.textContent = era;
        select.appendChild(opt);
    });
}

// Populate doctor dropdown
function populateDoctorFilter() {
    const select = document.getElementById('doctor-filter');
    if (!select) return;
    const names = new Set();
    state.episodes.forEach(e => {
        const actor = e.doctor && e.doctor.actor;
        if (actor) names.add(actor);
    });
    const ordered = Array.from(names).sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All</option>';
    ordered.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

// Populate companion dropdown (includes "None" option for null companions)
function populateCompanionFilter() {
    const select = document.getElementById('companion-filter');
    if (!select) return;
    const names = new Set();
    let hasNone = false;
    state.episodes.forEach(e => {
        if (e.companion === null || e.companion === undefined) {
            hasNone = true;
        } else {
            const label = (e.companion.actor && e.companion.actor.trim()) ? e.companion.actor.trim()
                        : (e.companion.character && e.companion.character.trim()) ? e.companion.character.trim()
                        : null;
            if (label) names.add(label);
        }
    });
    const ordered = Array.from(names).sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All</option>';
    if (hasNone) {
        const optNone = document.createElement('option');
        optNone.value = '__none__';
        optNone.textContent = 'None';
        select.appendChild(optNone);
    }
    ordered.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

// Filtering Functions
function filterEpisodes() {
    const q = (state.filters.name || '').toLowerCase();
    const eraFilter = (state.filters.era || '').trim();
    const doctorFilter = (state.filters.doctor || '').trim();
    const companionFilter = (state.filters.companion || '').trim();

    if (!q && !eraFilter && !doctorFilter && !companionFilter) {
        state.filtered = [...state.episodes];
    } else {
        state.filtered = state.episodes.filter(ep => {
            // Era filter
            if (eraFilter && ep.era !== eraFilter) return false;

            // Doctor filter
            if (doctorFilter) {
                const docActor = ep.doctor && ep.doctor.actor ? ep.doctor.actor : '';
                if (docActor !== doctorFilter) return false;
            }

            // Companion filter
            if (companionFilter) {
                if (companionFilter === '__none__') {
                    if (ep.companion !== null && ep.companion !== undefined) return false;
                } else {
                    const compActor = ep.companion && ep.companion.actor ? ep.companion.actor : '';
                    const compChar = ep.companion && ep.companion.character ? ep.companion.character : '';
                    if (compActor !== companionFilter && compChar !== companionFilter) return false;
                }
            }

            if (!q) return true;

            // check title, writer, director, doctor actor/incarnation, companion actor/character
            const checks = [];
            checks.push((ep.title || '').toLowerCase());
            checks.push((ep.writer || '').toLowerCase());
            checks.push((ep.director || '').toLowerCase());
            checks.push((ep.doctor && ep.doctor.actor) ? ep.doctor.actor.toLowerCase() : '');
            checks.push((ep.doctor && ep.doctor.incarnation) ? ep.doctor.incarnation.toLowerCase() : '');
            if (ep.companion) {
                checks.push((ep.companion.actor || '').toLowerCase());
                checks.push((ep.companion.character || '').toLowerCase());
            }
            return checks.some(field => field.includes(q));
        });
    }
    // After filtering, apply current sort for predictable order
    sortEpisodes(state.sort.field);
    displayEpisodes(state.filtered);
}

// CSV helpers (NEW)
function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    // If value contains double quotes/newlines/commas, wrap in quotes and escape quotes
    if (/[",\n\r]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function exportFilteredToCSV() {
    // Columns: rank,title,series,era,broadcast_year,director,writer,doctor,companion,cast_count
    const header = ['Rank','Title','Series','Era','Year','Director','Writer','Doctor','Companion','CastCount'];
    const rows = [ header.map(h => csvEscape(h)) ]; // escape header too

    state.filtered.forEach(ep => {
        const rank = Number.isFinite(ep.rank) ? ep.rank : '';
        const title = ep.title || '';
        const series = Number.isFinite(ep.series) ? ep.series : '';
        const era = ep.era || '';
        const year = ep._year || '';
        const director = ep.director || '';
        const writer = ep.writer || '';
        const doctorText = (ep.doctor && (ep.doctor.actor || ep.doctor.incarnation))
            ? `${ep.doctor.actor || ''}${ep.doctor.incarnation ? ` (${ep.doctor.incarnation})` : ''}`.trim()
            : '';
        let companionText = '';
        if (ep.companion === null || ep.companion === undefined) {
            companionText = '';
        } else {
            const c = ep.companion;
            companionText = (c && (c.actor || c.character))
                ? `${c.actor || ''}${c.character ? ` (${c.character})` : ''}`.trim()
                : '';
        }
        const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;

        rows.push([
            csvEscape(rank),
            csvEscape(title),
            csvEscape(series),
            csvEscape(era),
            csvEscape(year),
            csvEscape(director),
            csvEscape(writer),
            csvEscape(doctorText),
            csvEscape(companionText),
            csvEscape(castCount)
        ]);
    });

    // Join rows with CRLF; prefix with UTF-8 BOM to help Excel detect encoding and separators
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const time = new Date().toISOString().replace(/[:.]/g,'-');
    a.download = `doctor-who-filtered-${time}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Utility Functions
function parseDate(dateStr) {
    if (!dateStr) return null;
    // ISO YYYY-MM-DD
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    if (isoMatch) {
        const d = new Date(dateStr + 'T00:00:00Z');
        if (!isNaN(d)) return d.getTime();
    }
    // UK DD/MM/YYYY
    const ukMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr);
    if (ukMatch) {
        const day = Number(ukMatch[1]), month = Number(ukMatch[2]) - 1, year = Number(ukMatch[3]);
        const d = new Date(Date.UTC(year, month, day));
        if (!isNaN(d)) return d.getTime();
    }
    // Long format Month DD, YYYY - rely on Date.parse for common locale names
    const longParsed = Date.parse(dateStr);
    if (!isNaN(longParsed)) return longParsed;
    // Year only YYYY
    const yearOnly = /^(\d{4})$/.exec(dateStr);
    if (yearOnly) {
        const y = Number(yearOnly[1]);
        return new Date(Date.UTC(y, 0, 1)).getTime();
    }
    return null;
}

function deriveYearFromString(s) {
    if (!s) return null;
    const y = (s.match(/(\d{4})/g) || []).map(Number)[0];
    return y || null;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    // keep table hidden until data arrives
    if (show) {
        document.getElementById('episodes-table').style.display = 'none';
        document.getElementById('no-results').style.display = 'none';
    }
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
}

// Validation checks produce console warnings and update UI count
function runValidationChecks(episodes) {
    let warnings = 0;
    const ranks = new Map();
    const now = Date.now();
    episodes.forEach((ep, i) => {
        if (!ep.title) {
            console.warn(`Episode index ${i} missing title`, ep);
            warnings++;
        }
        if (!Number.isFinite(ep.rank)) {
            console.warn(`Episode "${ep.title || 'unknown'}" has invalid rank:`, ep.rank);
            warnings++;
        } else {
            if (ranks.has(ep.rank)) {
                console.warn(`Duplicate rank detected: ${ep.rank}`, ep, ranks.get(ep.rank));
                warnings++;
            } else {
                ranks.set(ep.rank, ep);
            }
            if (ep.rank <= 0) {
                console.warn(`Suspicious rank (<=0): ${ep.rank} for "${ep.title || 'unknown'}"`);
                warnings++;
            }
        }
        if (ep._parsedDate && ep._parsedDate > now) {
            console.warn(`Future broadcast date for "${ep.title || 'unknown'}":`, ep.broadcast_date);
            warnings++;
        }
        if (ep.series < 0) {
            console.warn(`Negative series number for "${ep.title || 'unknown'}":`, ep.series);
            warnings++;
        }
    });
    state.warnings = warnings;
}

// Render warning count UI
function renderWarningCount() {
    const el = document.getElementById('warning-count');
    if (!el) return;
    if (state.warnings > 0) {
        el.style.display = 'inline-block';
        el.textContent = `${state.warnings} warning${state.warnings > 1 ? 's' : ''}`;
    } else {
        el.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', init);
