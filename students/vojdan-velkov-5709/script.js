// Configuration
const CONFIG = {
    DATA_URL: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
    DATE_FORMATS: {
        ISO: 'YYYY-MM-DD',
        UK: 'DD/MM/YYYY',
        LONG: 'MMMM DD, YYYY',
        YEAR: 'YYYY'
    },
    ERA_ORDER: ['Classic', 'Modern', 'Recent']
};

// State Management
let state = {
    episodes: [],          // Original data
    filtered: [],          // Filtered results
    loading: true,         // Loading state
    error: null,          // Error message
    selectedRowIndex: -1,  // Currently selected row (-1 means no selection)
    sort: {
        field: 'rank',     // Current sort field
        ascending: true    // Sort direction
    },
    filters: {
        name: '',         // Name filter value
        era: '',          // Era filter value
        doctor: '',       // Doctor filter value
        companion: ''     // Companion filter value
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    const nameFilter = document.getElementById('name-filter');
    nameFilter.addEventListener('input', () => {
        state.filters.name = nameFilter.value.toLowerCase();
        filterEpisodes();
    });

    const eraFilter = document.getElementById('era-filter');
    eraFilter.addEventListener('change', () => {
        state.filters.era = eraFilter.value;
        filterEpisodes();
    });

    const doctorFilter = document.getElementById('doctor-filter');
    doctorFilter.addEventListener('change', () => {
        state.filters.doctor = doctorFilter.value;
        filterEpisodes();
    });

    const companionFilter = document.getElementById('companion-filter');
    companionFilter.addEventListener('change', () => {
        state.filters.companion = companionFilter.value;
        filterEpisodes();
    });

    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            sortEpisodes(field);
        });
    });

    // Add keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);

    // Set initial selection when table is clicked
    const tbody = document.getElementById('episodes-body');
    tbody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (row) {
            const rows = Array.from(tbody.getElementsByTagName('tr'));
            state.selectedRowIndex = rows.indexOf(row);
            displayEpisodes(state.filtered);
        }
    });
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        const response = await fetch(CONFIG.DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        state.episodes = result.episodes || [];
        state.filtered = state.episodes;
        validateData(state.episodes);
        populateFilters();
        displayEpisodes(state.filtered);
    } catch (error) {
        showError('Failed to load episodes: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function populateFilters() {
    // Populate era filter
    const eras = [...new Set(state.episodes.map(episode => episode.era))].sort();
    const eraSelect = document.getElementById('era-filter');
    eraSelect.innerHTML = '<option value="">All Eras</option>';
    eras.forEach(era => {
        if (era) {
            eraSelect.innerHTML += `<option value="${era}">${era}</option>`;
        }
    });

    // Populate doctor filter
    const doctors = [...new Set(state.episodes.map(episode => 
        episode.doctor ? `${episode.doctor.actor} (${episode.doctor.incarnation})` : null
    ))].filter(Boolean).sort();
    const doctorSelect = document.getElementById('doctor-filter');
    doctorSelect.innerHTML = '<option value="">All Doctors</option>';
    doctors.forEach(doctor => {
        doctorSelect.innerHTML += `<option value="${doctor}">${doctor}</option>`;
    });

    // Populate companion filter
    const companions = [...new Set(state.episodes.map(episode =>
        episode.companion ? `${episode.companion.actor} (${episode.companion.character})` : null
    ))].filter(Boolean).sort();
    const companionSelect = document.getElementById('companion-filter');
    companionSelect.innerHTML = '<option value="">All Companions</option>';
    companions.forEach(companion => {
        companionSelect.innerHTML += `<option value="${companion}">${companion}</option>`;
    });
}

// Display Functions
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    tbody.innerHTML = '';
    
    const noResults = document.getElementById('no-results');
    if (episodes.length === 0) {
        noResults.style.display = 'block';
        document.getElementById('episodes-table').style.display = 'none';
        return;
    }
    
    noResults.style.display = 'none';
    document.getElementById('episodes-table').style.display = 'table';

    episodes.forEach((episode, index) => {
        const row = document.createElement('tr');
        if (index === state.selectedRowIndex) {
            row.classList.add('selected-row');
        }
        
        // Format fields with proper edge case handling
        const doctorInfo = episode.doctor?.actor && episode.doctor?.incarnation ? 
            `${removeEmojis(episode.doctor.actor)} (${removeEmojis(episode.doctor.incarnation)})` : '—';
        const companionInfo = episode.companion ? 
            `${removeEmojis(episode.companion.actor)} (${removeEmojis(episode.companion.character)})` : '—';
        const castCount = episode.cast ? episode.cast.length : 0;
        const writerInfo = formatWriters(episode.writer);
        let title = episode.title ? episode.title : '—';
        
        // Special handling for episode 61 to remove angle brackets
        if (episode.rank === 61) {
            title = title.replace(/</g, '').replace(/>/g, '');
        }
        title = removeEmojis(escapeHtml(title));
        
        row.innerHTML = `
            <td>${episode.rank || '—'}</td>
            <td>${title}</td>
            <td>${episode.series || '—'}</td>
            <td>${episode.era || '—'}</td>
            <td>${formatDate(episode.broadcast_date)}</td>
            <td>${removeEmojis(episode.director || '—')}</td>
            <td>${writerInfo}</td>
            <td>${doctorInfo}</td>
            <td>${companionInfo}</td>
            <td><span class="cast-count">${castCount}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Sorting Functions
function sortEpisodes(field) {
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }

    const sortedEpisodes = [...state.filtered].sort((a, b) => {
        let valueA = getFieldValue(a, field);
        let valueB = getFieldValue(b, field);

        if (field === 'broadcast_date') {
            valueA = new Date(parseDate(valueA));
            valueB = new Date(parseDate(valueB));
        }

        if (field === 'series') {
            // Special handling for series to put "Special" at the end
            if (valueA === 'Special') return state.sort.ascending ? 1 : -1;
            if (valueB === 'Special') return state.sort.ascending ? -1 : 1;
            valueA = Number(valueA) || 0;
            valueB = Number(valueB) || 0;
        } else if (field === 'rank') {
            valueA = Number(valueA) || 0;
            valueB = Number(valueB) || 0;
        } else if (field === 'doctor') {
            // Make dash appear first in doctor sorting
            if (valueA === '—') return state.sort.ascending ? -1 : 1;
            if (valueB === '—') return state.sort.ascending ? 1 : -1;
        }

        if (field === 'era') {
            valueA = CONFIG.ERA_ORDER.indexOf(valueA);
            valueB = CONFIG.ERA_ORDER.indexOf(valueB);
        }

        if (valueA < valueB) return state.sort.ascending ? -1 : 1;
        if (valueA > valueB) return state.sort.ascending ? 1 : -1;
        return 0;
    });

    displayEpisodes(sortedEpisodes);
    updateSortIndicators(field);
}

// Filtering Functions
function filterEpisodes() {
    const searchTerm = state.filters.name.toLowerCase().trim();
    const eraFilter = state.filters.era;
    const doctorFilter = state.filters.doctor;
    const companionFilter = state.filters.companion;
    
    // Reset selection when filtering
    state.selectedRowIndex = -1;
    
    state.filtered = state.episodes.filter(episode => {
        // Name filter
        const titleMatch = !searchTerm || 
            (episode.title?.toLowerCase().includes(searchTerm));

        // Era filter
        const eraMatch = !eraFilter || 
            episode.era === eraFilter;

        // Doctor filter
        const doctorMatch = !doctorFilter || 
            (episode.doctor && `${episode.doctor.actor} (${episode.doctor.incarnation})` === doctorFilter);

        // Companion filter
        const companionMatch = !companionFilter || 
            (episode.companion && `${episode.companion.actor} (${episode.companion.character})` === companionFilter);

        // All filters must match
        return titleMatch && eraMatch && doctorMatch && companionMatch;
    });

    document.getElementById('episodes-table').style.display = state.filtered.length ? 'table' : 'none';
    document.getElementById('no-results').style.display = state.filtered.length ? 'none' : 'block';
    
    displayEpisodes(state.filtered);
}

// Utility Functions
function formatDate(date) {
    if (!date) return '—';
    try {
        const parsedDate = parseDate(date);
        return new Date(parsedDate).getFullYear().toString();
    } catch (e) {
        console.warn(`Invalid date format: ${date}`);
        return '—';
    }
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    }
    if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01`;
    
    const longMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
    if (longMatch) {
        const months = {
            January: '01', February: '02', March: '03', April: '04',
            May: '05', June: '06', July: '07', August: '08',
            September: '09', October: '10', November: '11', December: '12'
        };
        const [_, month, day, year] = longMatch;
        return `${year}-${months[month] || '01'}-${day.padStart(2, '0')}`;
    }
    return null;
}

function formatWriters(writers) {
    if (!writers) return '—';
    return writers.replace(/\s+(&|and)\s+/g, ' & ');
}

function getFieldValue(episode, field) {
    switch (field) {
        case 'doctor': return episode.doctor ? `${removeEmojis(episode.doctor.actor)} (${removeEmojis(episode.doctor.incarnation)})` : '';
        case 'companion': return episode.companion ? `${removeEmojis(episode.companion.actor)} (${removeEmojis(episode.companion.character)})` : '';
        case 'cast': return episode.cast ? episode.cast.length : 0;
        default: return episode[field] ? removeEmojis(episode[field]) : '';
    }
}

function removeEmojis(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateSortIndicators(field) {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-sort') === field) {
            header.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

function validateData(data) {
    let warnings = 0;
    const currentYear = new Date().getFullYear();

    data.forEach(episode => {
        // Check for missing required fields
        ['title', 'rank', 'series', 'era'].forEach(field => {
            if (!episode[field]) {
                console.warn(`Missing required field: ${field}`, episode);
                warnings++;
            }
        });

        // Check for future dates
        const year = new Date(parseDate(episode.broadcast_date)).getFullYear();
        if (year > currentYear) {
            console.warn(`Future broadcast date detected: ${episode.broadcast_date}`, episode);
            warnings++;
        }

        // Check for invalid ranks
        if (episode.rank <= 0) {
            console.warn(`Invalid rank detected: ${episode.rank}`, episode);
            warnings++;
        }

        // Check for negative series numbers
        if (episode.series < 0) {
            console.warn(`Negative series number detected: ${episode.series}`, episode);
            warnings++;
        }
    });

    // Update UI with warning count
    const warningsElement = document.getElementById('warnings');
    const warningCountElement = document.getElementById('warning-count');
    
    if (warnings > 0) {
        warningCountElement.textContent = `⚠️ Data validation warnings: ${warnings}`;
        warningsElement.style.display = 'block';
        console.log(`Total validation warnings: ${warnings}`);
    } else {
        warningsElement.style.display = 'none';
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

// Keyboard Navigation Functions
function handleKeyboardNavigation(event) {
    if (!state.filtered.length) return; // No rows to navigate

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (state.selectedRowIndex < state.filtered.length - 1) {
                state.selectedRowIndex++;
                displayEpisodes(state.filtered);
                ensureRowIsVisible(state.selectedRowIndex);
            }
            break;
        case 'ArrowUp':
            event.preventDefault();
            if (state.selectedRowIndex > 0) {
                state.selectedRowIndex--;
                displayEpisodes(state.filtered);
                ensureRowIsVisible(state.selectedRowIndex);
            }
            break;
        case 'Home':
            event.preventDefault();
            if (state.filtered.length > 0) {
                state.selectedRowIndex = 0;
                displayEpisodes(state.filtered);
                ensureRowIsVisible(state.selectedRowIndex);
            }
            break;
        case 'End':
            event.preventDefault();
            if (state.filtered.length > 0) {
                state.selectedRowIndex = state.filtered.length - 1;
                displayEpisodes(state.filtered);
                ensureRowIsVisible(state.selectedRowIndex);
            }
            break;
        case 'Enter':
            event.preventDefault();
            if (state.selectedRowIndex >= 0) {
                // Optional: Add any action you want to perform when Enter is pressed
                console.log('Selected episode:', state.filtered[state.selectedRowIndex]);
            }
            break;
    }
}

function ensureRowIsVisible(rowIndex) {
    const tbody = document.getElementById('episodes-body');
    const rows = tbody.getElementsByTagName('tr');
    if (rows[rowIndex]) {
        rows[rowIndex].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest'
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
function formatDate(date) {
    if (!date) return '—';
    try {
        const parsedDate = parseDate(date);
        return new Date(parsedDate).getFullYear().toString();
    } catch (e) {
        console.warn(`Invalid date format: ${date}`);
        return '—';
    }
}

function parseDate(dateStr) {
    if (!dateStr) return null;

    // Try ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Try UK format (DD/MM/YYYY)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    }

    // Try long format (Month DD, YYYY)
    const longMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
    if (longMatch) {
        const months = {
            January: '01', February: '02', March: '03', April: '04',
            May: '05', June: '06', July: '07', August: '08',
            September: '09', October: '10', November: '11', December: '12'
        };
        const [_, month, day, year] = longMatch;
        const monthNum = months[month] || '01';
        return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }

    // Try year only (YYYY)
    if (/^\d{4}$/.test(dateStr)) {
        return `${dateStr}-01-01`;
    }

    return null;
}

function formatWriters(writers) {
    if (!writers) return '—';
    return writers.replace(/\s+(&|and)\s+/g, ' & ');
}

function getFieldValue(episode, field) {
    switch (field) {
        case 'doctor':
            return episode.doctor ? `${episode.doctor.actor} (${episode.doctor.incarnation})` : '';
        case 'companion':
            return episode.companion ? `${episode.companion.actor} (${episode.companion.character})` : '';
        case 'cast':
            return episode.cast ? episode.cast.length : 0;
        default:
            return episode[field] || '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateSortIndicators(field) {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-sort') === field) {
            header.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

function validateData(data) {
    let warnings = 0;
    const currentYear = new Date().getFullYear();

    data.forEach(episode => {
        // Check required fields
        ['title', 'rank', 'series', 'era'].forEach(field => {
            if (!episode[field]) {
                console.warn(`Missing required field: ${field}`, episode);
                warnings++;
            }
        });

        // Check for future dates
        const year = new Date(parseDate(episode.broadcast_date)).getFullYear();
        if (year > currentYear) {
            console.warn(`Future broadcast date detected: ${episode.broadcast_date}`, episode);
            warnings++;
        }

        // Check for invalid ranks
        if (episode.rank <= 0) {
            console.warn(`Invalid rank detected: ${episode.rank}`, episode);
            warnings++;
        }

        // Check for negative series numbers
        if (episode.series < 0) {
            console.warn(`Negative series number detected: ${episode.series}`, episode);
            warnings++;
        }
    });

    if (warnings > 0) {
        console.log(`Total validation warnings: ${warnings}`);
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

document.addEventListener('DOMContentLoaded', init);