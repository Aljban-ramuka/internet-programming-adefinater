const CONFIG = {
    DATA_URLS: [
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
    ],
    ERA_ORDER: ['Classic', 'Modern', 'Recent']
};

let state = {
    episodes: [],        
    filtered: [],       
    loading: true,       
    error: null,         
    sort: {
        field: 'rank',   
        ascending: true  
    },
    filters: {
        name: ''       
    }
};

async function init() {
    setupEventListeners();
    await loadEpisodes();
}

function setupEventListeners() {
    const nameFilter = document.getElementById('name-filter');
    if (nameFilter) {
        nameFilter.addEventListener('input', (e) => {
            state.filters.name = e.target.value;
            debounceFilter();
        });
    }

    const headers = document.querySelectorAll('th[data-field]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-field');
            sortEpisodes(field);
        });
    });
}


let _debounceTimer = null;
function debounceFilter() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
        filterEpisodes();
    }, 180);
}

async function loadEpisodes() {
    try {
        showLoading(true);
        showError(''); 

        console.log('Starting to fetch data from multiple URLs...');

        const settled = await Promise.allSettled(
            CONFIG.DATA_URLS.map(url =>
                fetch(url, { cache: 'no-store' })
                    .then(resp => {
                        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
                        return resp.json();
                    })
            )
        );

        let combinedEpisodes = [];
        let failedCount = 0;

        settled.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                const value = result.value;
                if (Array.isArray(value)) {
                    combinedEpisodes = combinedEpisodes.concat(value);
                    console.log(`Loaded array from file ${idx + 1} (length ${value.length})`);
                } else if (value && Array.isArray(value.episodes)) {
                    combinedEpisodes = combinedEpisodes.concat(value.episodes);
                    console.log(`Loaded object->episodes from file ${idx + 1} (length ${value.episodes.length})`);
                } else {
                    console.warn(`File ${idx + 1} returned unexpected JSON shape — skipping`, value);
                    failedCount++;
                }
            } else {
                console.warn(`Failed to fetch file ${idx + 1}:`, result.reason);
                failedCount++;
            }
        });

        if (combinedEpisodes.length === 0) {
            throw new Error('No episode data could be loaded.');
        }

        console.log(`✓ All fetches processed. Total episodes combined: ${combinedEpisodes.length}`);
        if (failedCount > 0) console.warn(`${failedCount} file(s) failed or had unexpected format.`);

        state.episodes = combinedEpisodes.map(normalizeEpisode);
        state.filtered = [...state.episodes];

        // 🟢 NEW FEATURE: Validate data before showing
        validateEpisodeData(state.episodes);

        applySorting();
        displayEpisodes(state.filtered);

        // 🟢 NEW FEATURE: Enable keyboard navigation after rendering
        enableKeyboardNavigation();

    } catch (error) {
        console.error('Error loading episodes:', error);
        showError(`Failed to load episodes: ${error.message}`);
        const tbody = document.getElementById('episodes-tbody');
        if (tbody) tbody.innerHTML = '';
        const noResults = document.getElementById('no-results');
        if (noResults) noResults.style.display = 'block';
    } finally {
        showLoading(false);
    }
}

function normalizeEpisode(raw) {
    return {
        rank: (raw.rank !== undefined) ? raw.rank : (raw.Rank ?? null),
        title: raw.title ?? raw.Title ?? '',
        series: raw.series ?? raw.Series ?? null,
        era: raw.era ?? raw.Era ?? '',
        broadcast_date: raw.broadcast_date ?? raw.broadcast ?? raw.date ?? '',
        director: raw.director ?? raw.Director ?? '',
        writer: raw.writer ?? raw.writers ?? raw.Writer ?? '',
        doctor: raw.doctor ?? null,
        companion: raw.companion ?? null,
        cast: Array.isArray(raw.cast) ? raw.cast : (Array.isArray(raw.CAST) ? raw.CAST : []),
        _raw: raw
    };
}

function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-tbody');
    const noResults = document.getElementById('no-results');

    if (!tbody) {
        console.error('Table body element not found');
        return;
    }

    tbody.innerHTML = '';

    if (!episodes || episodes.length === 0) {
        if (noResults) noResults.style.display = 'block';
        const tableWrap = document.getElementById('episodes-table');
        if (tableWrap) tableWrap.style.display = 'none';
        return;
    }

    if (noResults) noResults.style.display = 'none';

    const tableWrap = document.getElementById('episodes-table');
    if (tableWrap) tableWrap.style.display = 'block';

    const fragment = document.createDocumentFragment();
    episodes.forEach(episode => {
        const row = document.createElement('tr');

        const tdRank = document.createElement('td');
        tdRank.textContent = (episode.rank !== null && episode.rank !== undefined) ? episode.rank : 'N/A';
        row.appendChild(tdRank);

        const tdTitle = document.createElement('td');
        tdTitle.textContent = episode.title || 'Unknown';
        row.appendChild(tdTitle);

        const tdSeries = document.createElement('td');
        tdSeries.textContent = (episode.series !== null && episode.series !== undefined) ? episode.series : 'N/A';
        row.appendChild(tdSeries);

        const tdEra = document.createElement('td');
        tdEra.textContent = episode.era || 'Unknown';
        row.appendChild(tdEra);

        const tdBroadcast = document.createElement('td');
        tdBroadcast.textContent = extractYear(episode.broadcast_date) || 'N/A';
        row.appendChild(tdBroadcast);

        const tdDirector = document.createElement('td');
        tdDirector.textContent = episode.director || 'Unknown';
        row.appendChild(tdDirector);

        const tdWriter = document.createElement('td');
        tdWriter.textContent = formatWriters(episode.writer);
        row.appendChild(tdWriter);

        const tdDoctor = document.createElement('td');
        tdDoctor.textContent = formatDoctor(episode.doctor);
        row.appendChild(tdDoctor);

        const tdComp = document.createElement('td');
        tdComp.textContent = formatCompanion(episode.companion);
        row.appendChild(tdComp);

        const tdCast = document.createElement('td');
        const spanBadge = document.createElement('span');
        spanBadge.className = 'cast-count';
        spanBadge.textContent = (episode.cast?.length ?? 0);
        tdCast.appendChild(spanBadge);
        row.appendChild(tdCast);

        fragment.appendChild(row);
    });

    tbody.appendChild(fragment);

    updateSortIndicators();
}

function sortEpisodes(field) {
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }

    applySorting();
    displayEpisodes(state.filtered);
}

function applySorting() {
    const { field, ascending } = state.sort;

    state.filtered.sort((a, b) => {
        let aVal = valueForField(a, field);
        let bVal = valueForField(b, field);

        const aNull = (aVal === null || aVal === undefined || aVal === '');
        const bNull = (bVal === null || bVal === undefined || bVal === '');

        if (aNull && bNull) return 0;
        if (aNull) return 1;
        if (bNull) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return ascending ? aVal - bVal : bVal - aVal;
        }

        if (field === 'era') {
            const ia = CONFIG.ERA_ORDER.indexOf(String(aVal));
            const ib = CONFIG.ERA_ORDER.indexOf(String(bVal));
            const va = ia === -1 ? 999 : ia;
            const vb = ib === -1 ? 999 : ib;
            return ascending ? va - vb : vb - va;
        }

        const sa = String(aVal).toLowerCase();
        const sb = String(bVal).toLowerCase();
        if (sa < sb) return ascending ? -1 : 1;
        if (sa > sb) return ascending ? 1 : -1;
        return 0;
    });
}

function valueForField(item, field) {
    switch (field) {
        case 'rank': return Number.isFinite(Number(item.rank)) ? Number(item.rank) : null;
        case 'title': return item.title ?? '';
        case 'series': return Number.isFinite(Number(item.series)) ? Number(item.series) : null;
        case 'era': return item.era ?? '';
        case 'broadcast_year': return extractYearAsNumber(item.broadcast_date);
        case 'director': return item.director ?? '';
        case 'writer': return formatWriters(item.writer) ?? '';
        case 'doctor': return formatDoctor(item.doctor) ?? '';
        case 'companion': return formatCompanion(item.companion) ?? '';
        case 'cast_count': return item.cast?.length ?? 0;
        default: return item[field] ?? '';
    }
}

function updateSortIndicators() {
    const headers = document.querySelectorAll('th[data-field]');
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-field') === state.sort.field) {
            header.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

function filterEpisodes() {
    const searchTerm = (state.filters.name || '').toLowerCase().trim();

    if (!searchTerm) {
        state.filtered = [...state.episodes];
    } else {
        state.filtered = state.episodes.filter(episode => {
            const title = (episode.title || '').toLowerCase();
            const director = (episode.director || '').toLowerCase();
            const writers = formatWriters(episode.writer).toLowerCase();
            const doctorA = (episode.doctor?.actor || '').toLowerCase();
            const doctorInc = (episode.doctor?.incarnation || '').toLowerCase();
            const companionA = (episode.companion?.actor || '').toLowerCase();
            const companionChar = (episode.companion?.character || '').toLowerCase();
            const era = (episode.era || '').toLowerCase();

            return (
                title.includes(searchTerm) ||
                director.includes(searchTerm) ||
                writers.includes(searchTerm) ||
                doctorA.includes(searchTerm) ||
                doctorInc.includes(searchTerm) ||
                companionA.includes(searchTerm) ||
                companionChar.includes(searchTerm) ||
                era.includes(searchTerm)
            );
        });
    }

    applySorting();
    displayEpisodes(state.filtered);
}

function extractYear(date) {
    if (!date) return 'N/A';
    const s = String(date);
    const m = s.match(/(19|20)\d{2}/);
    return m ? m[0] : 'N/A';
}

function extractYearAsNumber(date) {
    if (!date) return 0;
    const s = String(date);
    const m = s.match(/(19|20)\d{2}/);
    return m ? parseInt(m[0], 10) : 0;
}

function formatDoctor(doctor) {
    if (!doctor) return 'Unknown';
    if (typeof doctor === 'string') return doctor;
    if (doctor.actor) {
        const incarnation = doctor.incarnation || doctor.Incarnation || 'Unknown';
        return `${doctor.actor} (${incarnation})`;
    }
    try { return JSON.stringify(doctor); } catch { return 'Unknown'; }
}

function formatCompanion(companion) {
    if (!companion) return 'None';
    if (typeof companion === 'string') return companion;
    if (companion.actor) {
        const character = companion.character || companion.Character || 'Unknown';
        return `${companion.actor} (${character})`;
    }
    try { return JSON.stringify(companion); } catch { return 'None'; }
}

function formatWriters(writer) {
    if (!writer) return 'Unknown';
    if (Array.isArray(writer)) return writer.join(', ');
    if (typeof writer === 'string') {
        const parts = writer.split(/\s*(?:,|&|and)\s*/i).map(s => s.trim()).filter(Boolean);
        return parts.join(', ');
    }
    try { return String(writer); } catch { return 'Unknown'; }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const tableWrap = document.getElementById('episodes-table');
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (tableWrap) tableWrap.style.display = show ? 'none' : (state.filtered && state.filtered.length ? 'block' : 'none');
}

function showError(message) {
    const errorElement = document.getElementById('error');
    if (!errorElement) return;
    errorElement.textContent = message || '';
    errorElement.style.display = message ? 'block' : 'none';
}

let focusedRowIndex = -1;

function enableKeyboardNavigation() {
    const style = document.createElement("style");
    style.textContent = `
        tr.focused-row {
            outline: 2px solid #4fa3ff;
            box-shadow: 0 0 10px rgba(79,163,255,0.6);
            transition: all 0.2s ease-in-out;
        }
    `;
    document.head.appendChild(style);

    document.addEventListener("keydown", (e) => {
        const active = document.activeElement;
        if (active.tagName === "INPUT") return;

        const rows = Array.from(document.querySelectorAll("tbody tr"));
        if (!rows.length) return;

        if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            if (focusedRowIndex === -1) focusedRowIndex = 0;
            else if (e.key === "ArrowDown" && focusedRowIndex < rows.length - 1)
                focusedRowIndex++;
            else if (e.key === "ArrowUp" && focusedRowIndex > 0)
                focusedRowIndex--;

            rows.forEach((r) => r.classList.remove("focused-row"));
            rows[focusedRowIndex].classList.add("focused-row");
            rows[focusedRowIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
        }

        if (e.key === "Enter") {
            const headerCells = document.querySelectorAll("th");
            if (headerCells.length > 0) headerCells[0].click();
        }
    });
}

function validateEpisodeData(episodes) {
    let warnings = [];
    const seenRanks = new Set();
    const currentYear = new Date().getFullYear();

    episodes.forEach((ep, i) => {
        if (!ep.title || !ep.rank) {
            warnings.push(`Episode ${i + 1}: Missing title or rank`);
        }

        if (seenRanks.has(ep.rank)) {
            warnings.push(`Duplicate rank detected: ${ep.rank}`);
        } else {
            seenRanks.add(ep.rank);
        }

        if (ep.series < 0) {
            warnings.push(`Negative series number in "${ep.title}"`);
        }

        const year = extractYearAsNumber(ep.broadcast_date);
        if (year > currentYear) {
            warnings.push(`Future broadcast date in "${ep.title}" (${year})`);
        }
    });

    if (warnings.length > 0) {
        console.groupCollapsed(`⚠️ Data Validation: ${warnings.length} warning(s)`);
        warnings.forEach((w) => console.warn(w));
        console.groupEnd();
        showValidationCount(warnings.length);
    }
}

function showValidationCount(count) {
    let existing = document.getElementById("validation-warning");
    if (!existing) {
        existing = document.createElement("div");
        existing.id = "validation-warning";
        existing.style = `
            margin: 15px 0;
            padding: 10px;
            border: 1px solid rgba(255, 193, 7, 0.5);
            border-radius: 6px;
            background: rgba(255, 193, 7, 0.1);
            color: #ffd966;
            font-weight: 600;
            text-align: center;
        `;
        document.querySelector(".container").prepend(existing);
    }
    existing.textContent = `⚠️ ${count} data validation warning${count > 1 ? "s" : ""} found (see console)`;
}

document.addEventListener('DOMContentLoaded', init);
