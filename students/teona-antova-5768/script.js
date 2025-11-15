// Configuration
const CONFIG = {
    DATA_URLS: {
        FULL: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/main/data/doctor-who-episodes-full.json',
        CHUNKS: [
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/main/data/doctor-who-episodes-01-10.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/main/data/doctor-who-episodes-11-20.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/main/data/doctor-who-episodes-21-30.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/main/data/doctor-who-episodes-31-40.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/main/data/doctor-who-episodes-41-50.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/main/data/doctor-who-episodes-51-65.json'
        ],
        LOCAL: './doctor-who-episodes-full.json'
    },
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
    sort: {
        field: 'rank',     // Current sort field
        ascending: true    // Sort direction
    },
    filters: {
        name: ''          // Current filter value
    },
    warnings: []          // Data validation warnings
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Filter input
    const nameFilter = document.getElementById('name-filter');
    nameFilter.addEventListener('input', (e) => {
        state.filters.name = e.target.value;
        updateDisplay();
    });

    // Column sorting
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', (e) => {
            const field = header.dataset.sort;
            if (state.sort.field === field) {
                state.sort.ascending = !state.sort.ascending;
            } else {
                state.sort.field = field;
                state.sort.ascending = true;
            }
            updateSortIndicators();
            updateDisplay();
        });
    });

    // Export to CSV
    const exportButton = document.getElementById('export-csv');
    exportButton.addEventListener('click', exportToCsv);

    // Keyboard navigation
    setupKeyboardNavigation();
}

// Keyboard Navigation
function setupKeyboardNavigation() {
    const table = document.getElementById('episodes-table');
    table.addEventListener('keydown', (e) => {
        const current = document.activeElement;
        if (!current.closest('table')) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                moveFocus('down', current);
                break;
            case 'ArrowUp':
                e.preventDefault();
                moveFocus('up', current);
                break;
            case 'Enter':
                if (current.tagName === 'TH') {
                    current.click();
                }
                break;
        }
    });
}

function moveFocus(direction, current) {
    const row = current.closest('tr');
    const cellIndex = Array.from(row.cells).indexOf(current);
    const targetRow = direction === 'down' ? row.nextElementSibling : row.previousElementSibling;
    
    if (targetRow) {
        const targetCell = targetRow.cells[cellIndex];
        if (targetCell) {
            targetCell.tabIndex = 0;
            targetCell.focus();
        }
    }
}

// Data Loading
async function loadEpisodes() {
    showLoading(true);
    let data = null;

    // Try loading methods in sequence
    try {
        // Try loading chunked data first (bonus points)
        console.log('Trying to load chunked data...');
        data = await loadChunkedData();
    } catch (chunkError) {
        console.log('Chunked loading failed, trying full data...');
        try {
            // Try loading full data
            const response = await fetch(CONFIG.DATA_URLS.FULL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            data = await response.json();
        } catch (fullError) {
            console.log('Full data loading failed, trying local file...');
            try {
                // Try loading local file
                const response = await fetch(CONFIG.DATA_URLS.LOCAL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                data = await response.json();
            } catch (localError) {
                showError('Failed to load episodes. Please ensure you have access to the data file.');
                console.error('All loading attempts failed:', { chunkError, fullError, localError });
                showLoading(false);
                return;
            }
        }
    }

    if (data) {
        try {
            state.episodes = processData(data);
            state.filtered = [...state.episodes];
            validateData();
            updateDisplay();
            console.log(`Successfully loaded ${state.episodes.length} episodes`);
        } catch (processError) {
            showError('Error processing episode data: ' + processError.message);
            console.error('Data processing error:', processError);
        }
    }
    
    showLoading(false);
}

async function loadChunkedData() {
    const responses = await Promise.all(
        CONFIG.DATA_URLS.CHUNKS.map(url => 
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
        )
    );
    return responses.flat();
}

// Data Processing
function processData(data) {
    return data.map(episode => ({
        ...episode,
        broadcastYear: extractYear(episode.broadcast_date),
        doctorFormatted: formatDoctor(episode.doctor),
        companionFormatted: formatCompanion(episode.companion),
        castCount: episode.cast?.length || 0
    }));
}

// Data Validation
function validateData() {
    state.warnings = [];
    const currentYear = new Date().getFullYear();
    
    state.episodes.forEach(episode => {
        // Check required fields
        if (!episode.title) {
            state.warnings.push(`Episode with rank ${episode.rank} is missing title`);
        }
        
        // Check future dates
        if (episode.broadcastYear > currentYear) {
            state.warnings.push(`Episode "${episode.title}" has future broadcast date: ${episode.broadcastYear}`);
        }
        
        // Check invalid ranks
        if (episode.rank <= 0) {
            state.warnings.push(`Episode "${episode.title}" has invalid rank: ${episode.rank}`);
        }
        
        // Check negative series
        if (episode.series < 0) {
            state.warnings.push(`Episode "${episode.title}" has negative series number: ${episode.series}`);
        }
    });

    // Update UI with warning count
    updateWarningCount();
}

function updateWarningCount() {
    // Assuming we add a warnings-count element to the HTML
    const warningsElement = document.getElementById('warnings-count');
    if (warningsElement && state.warnings.length > 0) {
        warningsElement.textContent = `⚠️ ${state.warnings.length} warning(s)`;
        warningsElement.style.display = 'block';
        // Log warnings to console
        state.warnings.forEach(warning => console.warn(warning));
    }
}

// Display Functions
function updateDisplay() {
    const filtered = filterEpisodes();
    const sorted = sortEpisodes(filtered);
    displayEpisodes(sorted);
}

function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    const noResults = document.getElementById('no-results');
    
    if (episodes.length === 0) {
        tbody.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    tbody.innerHTML = episodes.map(episode => `
        <tr>
            <td tabindex="0">${episode.rank}</td>
            <td tabindex="0">${escapeHtml(episode.title)}</td>
            <td tabindex="0">${episode.series}</td>
            <td tabindex="0">${episode.era}</td>
            <td tabindex="0">${episode.broadcastYear}</td>
            <td tabindex="0">${escapeHtml(episode.director)}</td>
            <td tabindex="0">${formatWriters(episode.writer)}</td>
            <td tabindex="0">${episode.doctorFormatted}</td>
            <td tabindex="0">${episode.companionFormatted}</td>
            <td tabindex="0">${episode.castCount}</td>
        </tr>
    `).join('');
}

// Sorting Functions
function sortEpisodes(episodes) {
    return [...episodes].sort((a, b) => {
        let valueA = getSortValue(a, state.sort.field);
        let valueB = getSortValue(b, state.sort.field);
        
        if (valueA === valueB) return 0;
        
        const direction = state.sort.ascending ? 1 : -1;
        return valueA > valueB ? direction : -direction;
    });
}

function getSortValue(episode, field) {
    switch (field) {
        case 'rank':
        case 'series':
        case 'castCount':
            return Number(episode[field]) || 0;
        case 'broadcast_date':
            return episode.broadcastYear;
        default:
            return String(episode[field] || '').toLowerCase();
    }
}

function updateSortIndicators() {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === state.sort.field) {
            header.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Filtering Functions
function filterEpisodes() {
    let filtered = state.episodes;

    const searchTerm = state.filters.name.toLowerCase();
    if (searchTerm) {
        filtered = smartFilter(filtered, searchTerm);
    }

    return filtered;
}

// Smart Filtering with Relevance Sort
function smartFilter(episodes, searchTerm) {
    // Create categories for different match types
    const exactMatches = [];
    const titleContains = [];
    const anyFieldContains = [];

    episodes.forEach(episode => {
        const title = episode.title.toLowerCase();
        
        if (title === searchTerm) {
            exactMatches.push(episode);
        } else if (title.includes(searchTerm)) {
            titleContains.push(episode);
        } else if (containsInAnyField(episode, searchTerm)) {
            anyFieldContains.push(episode);
        }
    });

    // Combine all matches in order of relevance
    return [...exactMatches, ...titleContains, ...anyFieldContains];
}

function containsInAnyField(episode, searchTerm) {
    const searchableFields = [
        episode.title,
        episode.director,
        episode.writer,
        episode.doctorFormatted,
        episode.companionFormatted,
        episode.era
    ];

    return searchableFields.some(field => 
        String(field).toLowerCase().includes(searchTerm)
    );
}

// Utility Functions
function extractYear(dateString) {
    if (!dateString) return '';
    const yearMatch = dateString.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : '';
}

function formatDoctor(doctor) {
    if (!doctor) return '—';
    return `${doctor.actor} (${doctor.incarnation})`;
}

function formatCompanion(companion) {
    if (!companion) return '—';
    return `${companion.actor} (${companion.character})`;
}

function formatWriters(writer) {
    if (!writer) return '—';
    return writer.replace(/\s+(?:&|and)\s+/g, ' & ');
}

function escapeHtml(str) {
    if (!str) return '—';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = show ? 'none' : 'table';
    document.getElementById('error').style.display = 'none';
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('episodes-table').style.display = 'none';
}

// CSV Export Function
function exportToCsv() {
    // Get currently filtered and sorted data
    const episodes = filterEpisodes();
    const sortedEpisodes = sortEpisodes(episodes);

    // Define CSV headers
    const headers = [
        'Rank',
        'Title',
        'Series',
        'Era',
        'Broadcast Year',
        'Director',
        'Writer',
        'Doctor',
        'Companion',
        'Cast Count'
    ];

    // Convert episodes to CSV rows
    const rows = sortedEpisodes.map(episode => [
        episode.rank,
        episode.title,
        episode.series,
        episode.era,
        episode.broadcastYear,
        episode.director,
        episode.writer,
        episode.doctorFormatted,
        episode.companionFormatted,
        episode.castCount
    ]);

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => 
            row.map(cell => 
                // Escape cells that contain commas or quotes
                typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
                    ? `"${cell.replace(/"/g, '""')}"` 
                    : cell
            ).join(',')
        )
    ].join('\\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'doctor-who-episodes.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
