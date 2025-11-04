// Configuration
const CONFIG = {
    DATA_URLS: [
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
    ]
};

// State Management
let state = {
    episodes: [],
    filtered: [],
    sort: { field: 'rank', ascending: true },
    filters: { name: '' },
    focusedRowIndex: -1
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadEpisodes();
});

// Event Listeners Setup
function setupEventListeners() {
    document.getElementById('name-filter').addEventListener('input', (e) => {
        state.filters.name = e.target.value;
        applyFiltersAndSort();
    });
    
    // Event listener for the new export button
    document.getElementById('export-csv').addEventListener('click', exportToCSV);

    document.querySelectorAll('#episodes-table thead th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            if (state.sort.field === field) state.sort.ascending = !state.sort.ascending;
            else { state.sort.field = field; state.sort.ascending = true; }
            applyFiltersAndSort();
        });
    });

    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        const promises = CONFIG.DATA_URLS.map(url => fetch(url));
        const responses = await Promise.all(promises);

        for (const response of responses) {
            if (!response.ok) throw new Error(`Failed to fetch from ${response.url} (${response.statusText})`);
        }

        const jsonDataArray = await Promise.all(responses.map(res => res.json()));
        const allEpisodes = jsonDataArray.flatMap(data => data.episodes);
        
        const warnings = validateData(allEpisodes);
        if (warnings.length > 0) {
            warnings.forEach(w => console.warn(w));
            const warningsDiv = document.getElementById('validation-warnings');
            warningsDiv.textContent = `Found ${warnings.length} data validation warning(s). See console for details.`;
            warningsDiv.style.display = 'block';
        }

        state.episodes = allEpisodes;
        applyFiltersAndSort();
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Data Validation Function
function validateData(episodes) {
    const warnings = [];
    const seenRanks = new Set();
    const now = new Date();
    const requiredFields = ['rank', 'title', 'era', 'broadcast_date'];

    episodes.forEach((episode, index) => {
        const id = `Episode "${episode.title || `(Untitled at index ${index}`})"`;
        requiredFields.forEach(field => {
            if (episode[field] == null || episode[field] === '') warnings.push(`Validation Error: ${id} is missing required field '${field}'.`);
        });
        const date = normalizeDate(episode.broadcast_date);
        if (date && date > now) warnings.push(`Validation Error: ${id} has a future broadcast date.`);
        if (typeof episode.rank !== 'number') warnings.push(`Validation Error: ${id} has an invalid rank.`);
        else if (seenRanks.has(episode.rank)) warnings.push(`Validation Error: Duplicate rank '${episode.rank}' found on ${id}.`);
        else seenRanks.add(episode.rank);
        if (typeof episode.series === 'number' && episode.series < 0) warnings.push(`Validation Error: ${id} has a negative series number.`);
    });
    return warnings;
}

// Main function to apply filters and sorting
function applyFiltersAndSort() {
    state.focusedRowIndex = -1;
    const filterText = state.filters.name.toLowerCase();
    let processedData = state.episodes.filter(ep => {
        const title = ep.title?.toLowerCase() || '';
        const doctor = formatDoctor(ep.doctor, false).toLowerCase();
        const companion = formatCompanion(ep.companion, false).toLowerCase();
        const writer = ep.writer?.toLowerCase() || '';
        const director = ep.director?.toLowerCase() || '';
        return title.includes(filterText) || doctor.includes(filterText) || companion.includes(filterText) || writer.includes(filterText) || director.includes(filterText);
    });
    const { field, ascending } = state.sort;
    const direction = ascending ? 1 : -1;
    processedData.sort((a, b) => {
        const valA = getSortValue(a, field);
        const valB = getSortValue(b, field);
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * direction;
    });
    state.filtered = processedData;
    displayEpisodes(state.filtered);
}

// Display Functions
function displayEpisodes(episodes) {
    const tableBody = document.getElementById('episodes-body');
    tableBody.innerHTML = '';
    updateSortHeaders();
    document.getElementById('no-results').style.display = episodes.length === 0 ? 'block' : 'none';

    episodes.forEach((episode, index) => {
        const row = tableBody.insertRow();
        const createCell = text => {
            const cell = row.insertCell();
            cell.textContent = text ?? 'N/A';
        };
        createCell(episode.rank);
        createCell(episode.title);
        createCell(episode.series);
        createCell(episode.era);
        createCell(getYear(episode.broadcast_date));
        createCell(episode.director);
        createCell(episode.writer);
        createCell(formatDoctor(episode.doctor));
        createCell(formatCompanion(episode.companion));
        createCell(episode.cast?.length || 0);
        row.addEventListener('click', () => {
            state.focusedRowIndex = index;
            updateRowFocus();
        });
    });
    updateRowFocus();
}

// Keyboard Navigation
function handleKeyboardNavigation(e) {
    if (e.key === 'Enter' && document.activeElement.tagName === 'TH') {
        e.preventDefault();
        document.activeElement.click();
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const numRows = state.filtered.length;
        if (numRows === 0) return;
        state.focusedRowIndex = Math.max(0, Math.min(numRows - 1, state.focusedRowIndex + direction));
        updateRowFocus();
    }
}

// NEW: EXPORT TO CSV FUNCTIONALITY
function exportToCSV() {
    const headers = ["Rank", "Title", "Series", "Era", "Year", "Director", "Writer", "Doctor", "Companion", "Cast Count"];
    const dataRows = state.filtered.map(ep => [
        ep.rank,
        ep.title,
        ep.series,
        ep.era,
        getYear(ep.broadcast_date),
        ep.director,
        ep.writer,
        formatDoctor(ep.doctor),
        formatCompanion(ep.companion),
        ep.cast?.length || 0
    ]);

    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...dataRows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'doctor_who_episodes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper for proper string escaping in CSV
function escapeCSV(value) {
    const stringValue = String(value ?? '');
    // If the value contains a comma, a double quote, or a newline, wrap it in double quotes.
    if (/[",\n]/.test(stringValue)) {
        // Within a quoted field, any double quote must be escaped by another double quote.
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}


// UTILITY FUNCTIONS
function getSortValue(ep, field) {
    switch (field) {
        case 'doctor': return formatDoctor(ep.doctor, false).toLowerCase();
        case 'companion': return formatCompanion(ep.companion, false).toLowerCase();
        case 'cast_count': return ep.cast?.length || 0;
        case 'broadcast_date': return normalizeDate(ep.broadcast_date)?.getTime() || 0;
        default: return (ep[field] || '').toString().toLowerCase();
    }
}

function updateRowFocus() {
    const rows = document.getElementById('episodes-body').rows;
    for (let i = 0; i < rows.length; i++) {
        rows[i].classList.toggle('focused', i === state.focusedRowIndex);
        if (i === state.focusedRowIndex) rows[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function updateSortHeaders() {
    document.querySelectorAll('#episodes-table thead th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.sort.field) th.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
    });
}

function normalizeDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}$/.test(dateStr)) return new Date(dateStr, 0, 1);
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(y, m - 1, d);
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

function formatDoctor(d, includeInc = true) {
    if (!d?.actor) return 'N/A';
    return includeInc ? `${d.actor} (${d.incarnation || 'N/A'})` : d.actor;
}

function formatCompanion(c, includeChar = true) {
    if (!c?.actor) return 'N/A';
    return includeChar ? `${c.actor} (${c.character || 'N/A'})` : c.actor;
}

function getYear(dateStr) {
    const date = normalizeDate(dateStr);
    return date ? date.getFullYear() : 'N/A';
}

function showLoading(isLoading) {
    document.getElementById('loading').style.display = isLoading ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = isLoading ? 'none' : 'table';
    if (isLoading) document.getElementById('error').style.display = 'none';
}

function showError(details) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = `Error: Could not load episodes. Please check your network connection.\nDetails: ${details}`;
    errorElement.style.display = 'block';
    document.getElementById('episodes-table').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
}