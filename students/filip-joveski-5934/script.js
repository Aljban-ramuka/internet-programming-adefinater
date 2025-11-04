// Configuration
const CONFIG = {
    // Data source URL
    DATA_URL: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
    // Supported date formats
    DATE_FORMATS: {
        ISO: 'YYYY-MM-DD',
        UK: 'DD/MM/YYYY',
        LONG: 'MMMM DD, YYYY',
        YEAR: 'YYYY'
    },
    // Era ordering for consistent display
    ERA_ORDER: ['Classic', 'Modern', 'Recent']
};

// State Management
let state = {
    episodes: [],          // Original data
    filtered: [],          // Filtered results
    loading: true,         // Loading state
    error: null,          // Error message
    sort: {
        field: 'rank',     // Current sort field
        ascending: true    // Sort direction
    },
    filters: {
        name: ''          // Current filter value
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // TODO: Implement event listeners for:
    // 1. Filter input changes
    // 2. Column header clicks (sorting)
    // 3. Additional filter changes
    
    // Filter input listener
    const filterInput = document.getElementById('name-filter');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            state.filters.name = e.target.value;
            filterEpisodes();
        });
    }

    // Column header click listeners
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            sortEpisodes(field);
        });
    });
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        // TODO: Implement data fetching
        // 1. Fetch data from CONFIG.DATA_URL
        // 2. Parse response
        // 3. Store in state.episodes
        // 4. Update display
        const response = await fetch(CONFIG.DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received data:', data); // Debug log
        
        // Check if data is in the correct format
        if (!Array.isArray(data)) {
            if (data.episodes && Array.isArray(data.episodes)) {
                state.episodes = data.episodes;
            } else {
                throw new Error('Data received is not in the expected format');
            }
        } else {
                state.episodes = data;
            }
        
        // Normalize episodes (add display and sort-friendly fields)
        state.episodes = normalizeEpisodes(state.episodes);

        // Validate and filter out episodes with missing/invalid critical fields
        const validated = validateEpisodes(state.episodes);
        state.episodes = validated;

        state.filtered = [...state.episodes];
    // Update warnings UI (validateEpisodes populates state.warningCount/state.warnings)
    updateWarningsUI();
        displayEpisodes(state.filtered);
    } catch (error) {
        console.error('Error details:', error); // Debug log
        showError('Failed to load episodes: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Normalize episodes to add _display and _sort helper objects on each episode.
function normalizeEpisodes(episodes) {
    if (!Array.isArray(episodes)) return [];
    return episodes.map(ep => {
        const out = Object.assign({}, ep);

        // Title
        const titleRaw = ep.title;
        out._display = out._display || {};
        out._sort = out._sort || {};
    out._display.title = titleRaw ? titleRaw.toString() : 'N/A';
        out._sort.title = (titleRaw || '').toString().toLowerCase();

        // Rank (numeric)
        const rankRaw = ep.rank;
        out._display.rank = (typeof rankRaw === 'number') ? rankRaw : (rankRaw ? rankRaw : 'N/A');
        out._sort.rank = typeof rankRaw === 'number' ? rankRaw : (parseInt(rankRaw, 10) || 0);

        // Series (numeric)
        const seriesRaw = ep.series;
        out._display.series = (typeof seriesRaw === 'number') ? seriesRaw : (seriesRaw ? seriesRaw : 'N/A');
        out._sort.series = typeof seriesRaw === 'number' ? seriesRaw : (parseInt(seriesRaw, 10) || 0);

        // Era (text)
        const eraRaw = ep.era;
    out._display.era = eraRaw ? eraRaw.toString() : 'N/A';
    out._sort.era = (eraRaw || '').toString().toLowerCase();

        // Broadcast year (numeric) -> use timestamp for sort and year or 'N/A' for display
        const ts = parseDateToTimestamp(ep.broadcast_date || ep.broadcastDate);
        out._sort.broadcast_date = Number.isFinite(ts) ? ts : 0;
        out._display.broadcast_date = Number.isFinite(ts) ? new Date(ts).getFullYear() : 'N/A';

        // Director (text)
    out._display.director = ep.director ? ep.director.toString() : 'N/A';
    out._sort.director = (ep.director || '').toString().toLowerCase();

        // Writer (text) — handle multiple writer credits separated by '&', 'and', or commas
    if (ep.writer) {
        const raw = ep.writer.toString();
        // Split on '&', 'and' (word), or commas, taking care of surrounding spaces
        const parts = raw.split(/\s*(?:&|\band\b|,)\s*/i).map(p => p.trim()).filter(p => p !== '');

        // Format writers: 1 => 'A', 2 => 'A & B', >2 => 'A, B & C'
        let displayWriter = '';
        if (parts.length === 0) {
            displayWriter = raw.trim();
        } else if (parts.length === 1) {
            displayWriter = parts[0];
        } else if (parts.length === 2) {
            displayWriter = parts[0] + ' & ' + parts[1];
        } else {
            // join all but last with commas, then add ' & ' before final
            const head = parts.slice(0, -1).join(', ');
            const last = parts[parts.length - 1];
            displayWriter = head + ' & ' + last;
        }

        out._display.writer = displayWriter;
        out._sort.writer = displayWriter.toLowerCase();
    } else {
        out._display.writer = 'N/A';
        out._sort.writer = '';
    }

        // Doctor (text) - substitute missing actor/incarnation with 'N/A' when present
    let doctorDisplay = 'N/A';
    let doctorSort = '';
        if (ep && ep.doctor) {
            const actor = ep.doctor.actor && ep.doctor.actor.toString().trim();
            const incarnation = ep.doctor.incarnation && ep.doctor.incarnation.toString().trim();
            const actorPart = actor ? actor : 'N/A';
            const incarnationPart = incarnation ? incarnation : 'N/A';
            if (actorPart === 'N/A' && incarnationPart === 'N/A') {
                doctorDisplay = 'N/A';
                doctorSort = '';
            } else {
                doctorDisplay = `${actorPart} (${incarnationPart})`;
                doctorSort = (actor || incarnation) ? (actor || incarnation).toLowerCase() : '';
            }
        }
        out._display.doctor = doctorDisplay;
        out._sort.doctor = doctorSort;

        // Companion (text)
    let companionDisplay = 'None';
    let companionSort = '';
        if (ep && ep.companion) {
            const actor = ep.companion.actor && ep.companion.actor.toString().trim();
            const character = ep.companion.character && ep.companion.character.toString().trim();
            // Replace any missing piece with 'N/A' in the displayed format
            const actorPart = actor ? actor : 'N/A';
            const characterPart = character ? character : 'N/A';
            // If both are 'N/A' then show a single 'N/A'
            if (actorPart === 'N/A' && characterPart === 'N/A') {
                // no companion info provided
                companionDisplay = 'None';
                companionSort = '';
            } else {
                companionDisplay = `${actorPart} (${characterPart})`;
                companionSort = (actor || character) ? (actor || character).toLowerCase() : '';
            }
        }
        out._display.companion = companionDisplay;
        out._sort.companion = companionSort;

        // Cast count (numeric) — display 0 when cast is null/undefined
        const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;
        out._display.cast = castCount;
        out._sort.cast = castCount;

        return out;
    });
}

// Validate episodes and exclude ones that don't meet the required criteria.
// Exclusion criteria (per user request):
// - missing title
// - missing or negative series
// - missing or negative rank
// - duplicate ranks
// - missing year (unparseable broadcast_date)
// - missing director
// - missing writer
// - missing doctor or missing doctor.actor
function validateEpisodes(episodes) {
    if (!Array.isArray(episodes)) return [];

    const kept = [];
    const seenRanks = new Set();
    let excluded = 0;
    const warnings = [];

    episodes.forEach(ep => {
        const reasons = [];

        // Title
        const title = ep.title;
        if (!title || String(title).trim() === '' || String(title) === 'N/A') reasons.push('missing title');

    // Series: allow numeric series >= 0 or the special string 'special' (case-insensitive)
    const seriesRaw = ep.series;
    const isSpecialSeries = typeof seriesRaw === 'string' && seriesRaw.trim().toLowerCase() === 'special';
    const seriesNum = Number(seriesRaw);
    if (!(isSpecialSeries || (Number.isFinite(seriesNum) && seriesNum >= 0))) reasons.push('missing/negative series');

        // Rank
        const rankNum = Number(ep.rank);
        if (!Number.isFinite(rankNum) || rankNum < 0) {
            reasons.push('missing/negative rank');
        } else {
            // Duplicate rank handling: keep the first encountered, exclude later ones
            if (seenRanks.has(rankNum)) {
                reasons.push('duplicate rank');
            }
        }

        // Broadcast year
        const rawDate = ep.broadcast_date || ep.broadcastDate;
        const ts = parseDateToTimestamp(rawDate);
        if (!Number.isFinite(ts)) {
            reasons.push('missing year');
        } else {
            // Future broadcast date warning (do not exclude)
            const now = Date.now();
            if (ts > now) {
                const msg = `Future broadcast date for rank=${ep.rank} title=${ep.title || '<no title>'}: ${rawDate}`;
                console.warn(msg);
                warnings.push(msg);
            }
        }

        // Director
        if (!ep.director || String(ep.director).trim() === '' || (ep._display && ep._display.director === 'N/A')) reasons.push('missing director');

        // Writer
        if (!ep.writer || String(ep.writer).trim() === '' || (ep._display && ep._display.writer === 'N/A')) reasons.push('missing writer');

        // Doctor actor
        if (!ep.doctor || !ep.doctor.actor || String(ep.doctor.actor).trim() === '') reasons.push('missing doctor/actor');

        if (reasons.length > 0) {
            excluded++;
            const warnMsg = `Excluding episode rank=${ep.rank} title=${ep.title || '<no title>'}: ${reasons.join(', ')}`;
            console.warn(warnMsg);
            warnings.push(warnMsg);
        } else {
            // mark seen rank and keep this episode
            seenRanks.add(Number(ep.rank));
            kept.push(ep);
        }
    });

    // Store warnings on state so UI can show a count
    state.warnings = warnings;
    state.warningCount = warnings.length;

    console.info(`validateEpisodes: kept=${kept.length} excluded=${excluded} warnings=${warnings.length}`);
    return kept;
}

// Display Functions
function displayEpisodes(episodes) {
    // TODO: Implement episode display
    // 1. Clear existing rows
    // 2. Create row for each episode
    // 3. Format data properly
    // 4. Handle edge cases
    const tbody = document.querySelector('#episodes-table tbody');
    if (!tbody) {
        console.error('Table body element not found');
        return;
    }
    tbody.innerHTML = '';

    if (!Array.isArray(episodes)) {
        console.error('Episodes is not an array:', episodes);
        showError('Invalid data format received');
        return;
    }

    episodes.forEach(episode => {
        const row = document.createElement('tr');

        // Build cells safely using textContent (auto-escapes HTML characters)
        const cols = [
            episode._display.rank,
            episode._display.title,
            episode._display.series,
            episode._display.era,
            episode._display.broadcast_date,
            episode._display.director,
            episode._display.writer,
            episode._display.doctor,
            episode._display.companion,
            episode._display.cast
        ];

        cols.forEach(value => {
            const td = document.createElement('td');
            // Use textContent to ensure raw text is displayed (prevents HTML from being interpreted)
            td.textContent = (value === null || typeof value === 'undefined') ? 'N/A' : value;
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });

    // Show/hide no-results message
    const noResults = document.getElementById('no-results');
    if (noResults) {
        noResults.style.display = episodes.length === 0 ? 'block' : 'none';
    }
}

// Sorting Functions
function sortEpisodes(field, noToggle = false) {
    // Sorting logic
    // field: the field to sort by
    // noToggle: when true, do not toggle direction if the field is the same (used by programmatic sorts like filtering)
    if (!field) return;

    // Toggle sort direction if clicking the same field (unless noToggle requested)
    if (state.sort.field === field) {
        if (!noToggle) state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }

    state.filtered.sort((a, b) => {
        // Use normalized sort values created during normalization
        const aValue = (a._sort && (typeof a._sort[field] !== 'undefined')) ? a._sort[field] : '';
        const bValue = (b._sort && (typeof b._sort[field] !== 'undefined')) ? b._sort[field] : '';

        // Compare numerically when both values are numbers
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) return state.sort.ascending ? -1 : 1;
            if (aValue > bValue) return state.sort.ascending ? 1 : -1;
            return 0;
        }

        // Fallback string compare
        const aStr = (aValue || '').toString();
        const bStr = (bValue || '').toString();
        if (aStr < bStr) return state.sort.ascending ? -1 : 1;
        if (aStr > bStr) return state.sort.ascending ? 1 : -1;
        return 0;
    });

    displayEpisodes(state.filtered);

    // Update sort indicators in UI
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === field) {
            th.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Filtering Functions
function filterEpisodes() {
    const searchTerm = (state.filters.name || '').toString().trim().toLowerCase();

    // Be defensive: ensure we have an array to iterate
    const source = Array.isArray(state.episodes) ? state.episodes : [];

    if (!searchTerm) {
        state.filtered = source;
        // Just sort by rank when no search
        sortEpisodes('rank', true);
        return;
    }

    // For each episode, determine its relevance score
    const matchingEpisodes = source.map(episode => {
        // Get normalized fields for searching
        const title = ((episode._sort && episode._sort.title) || '').toLowerCase();
        const allFields = [
            title,
            ((episode._sort && episode._sort.doctor) || ''),
            ((episode._sort && episode._sort.companion) || ''),
            ((episode._sort && episode._sort.director) || ''),
            ((episode._sort && episode._sort.writer) || ''),
            ((episode._sort && episode._sort.era) || '')
        ].map(f => f.toLowerCase());

        // Calculate match score (higher is better)
        let score = 0;
        
        // 1. Exact title match (highest priority)
        if (title === searchTerm) {
            score = 4;
        }
        // 2. Title contains search term
        else if (title.includes(searchTerm)) {
            score = 3;
        }
        // 3. Any field contains search term
        else if (allFields.some(f => f.includes(searchTerm))) {
            score = 2;
        }
        // 4. No match
        else {
            score = 0;
        }

        return { episode, score };
    }).filter(item => item.score > 0); // Only keep matches

    // Sort by: score (desc), then rank (asc)
    state.filtered = matchingEpisodes
        .sort((a, b) => {
            // First by score (higher first)
            if (b.score !== a.score) return b.score - a.score;
            // Then by rank
            return (a.episode._sort.rank || 0) - (b.episode._sort.rank || 0);
        })
        .map(item => item.episode);

    displayEpisodes(state.filtered);
}

// Utility Functions
// Parse a variety of date string formats into a timestamp (ms since epoch).
// Supports ISO (YYYY-MM-DD), UK (DD/MM/YYYY), long English dates and falls back to Date.parse.
function parseDateToTimestamp(raw) {
    if (!raw) return NaN;

    // If already a Date
    if (raw instanceof Date) return raw.getTime();

    // If a number (timestamp)
    if (typeof raw === 'number') return raw;

    const s = String(raw).trim();

    // DD/MM/YYYY -> create with year, month-1, day
    const ukMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ukMatch) {
        const day = parseInt(ukMatch[1], 10);
        const month = parseInt(ukMatch[2], 10) - 1;
        const year = parseInt(ukMatch[3], 10);
        return new Date(year, month, day).getTime();
    }

    // ISO-like YYYY-MM-DD (safe in most browsers)
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : NaN;
    }

    // Try letting Date.parse handle long formats like 'January 1, 2000'
    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed : NaN;
}

// Return a displayable year (string) for the given raw date value.
function formatYearFromDate(raw) {
    const ts = parseDateToTimestamp(raw);
    if (!Number.isFinite(ts)) return 'Unknown';
    try {
        return new Date(ts).getFullYear();
    } catch (e) {
        return 'Unknown';
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = show ? 'none' : 'block';
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
}

// Update warnings UI element with the current warning count and details (in title)
function updateWarningsUI() {
    const el = document.getElementById('warnings');
    const detailsContainer = document.getElementById('warnings-details');
    const listEl = document.getElementById('warnings-list');
    if (!el || !detailsContainer || !listEl) return;

    const warnings = Array.isArray(state.warnings) ? state.warnings : [];
    const count = warnings.length;

    if (count > 0) {
        el.textContent = `Warnings: ${count}`;
        // Keep a short tooltip too
        const details = warnings.join('\n');
        el.title = details.length > 2000 ? details.slice(0, 2000) + '...' : details;
        el.style.display = 'inline-block';

        // Populate the warnings list
        listEl.innerHTML = '';
        warnings.forEach((w, idx) => {
            const li = document.createElement('li');
            li.textContent = w;
            li.title = w;
            li.setAttribute('data-warning-index', String(idx));
            listEl.appendChild(li);
        });

        // Hide details by default
        detailsContainer.style.display = 'none';

        // Attach click/keyboard handlers once to toggle details
        if (!el.dataset.warnHandlersAttached) {
            el.tabIndex = 0; // make focusable
            el.style.cursor = 'pointer';

            const toggle = (ev) => {
                // Toggle visibility
                const isHidden = detailsContainer.style.display === 'none' || detailsContainer.style.display === '';
                detailsContainer.style.display = isHidden ? 'block' : 'none';
                // Update aria-expanded for accessibility
                try {
                    el.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
                } catch (e) {
                    // ignore
                }
            };

            el.addEventListener('click', toggle);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });

            el.dataset.warnHandlersAttached = '1';
        }
    } else {
        // No warnings: hide both count and details
        el.textContent = '';
        el.title = '';
        el.style.display = 'none';
        detailsContainer.style.display = 'none';
        listEl.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', init);
