// Configuration
const DATA_URL = 'doctor-who-episodes-exam.json';  // Use local file in same directory

// State management
let episodes = [];
const state = {
    filter: '',
    sortColumn: 'rank',
    sortAscending: true,
    warnings: []
};

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    // Handle different date formats
    let date;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // ISO format: YYYY-MM-DD
        date = new Date(dateStr);
    } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // UK format: DD/MM/YYYY
        const [day, month, year] = dateStr.split('/');
        date = new Date(year, month - 1, day);
    } else if (dateStr.match(/^\w+ \d{1,2}, \d{4}$/)) {
        // US format: Month DD, YYYY
        date = new Date(dateStr);
    } else if (dateStr.match(/^\d{4}$/)) {
        // Year only: YYYY
        return dateStr;
    }
    
    return date && !isNaN(date) ? date.getFullYear().toString() : dateStr;
}

function formatDoctor(doctor) {
    return doctor ? `${doctor.actor} (${doctor.incarnation})` : '—';
}

function formatCompanion(companion) {
    return companion ? `${companion.actor} (${companion.character})` : '—';
}

function getCastCount(cast) {
    return Array.isArray(cast) ? cast.length : 0;
}

// Data loading
async function loadData() {
    showLoading(true);
    clearError();
    
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const allEpisodes = await response.json();

        if (allEpisodes.length === 0) {
            throw new Error('No episodes could be loaded from the source');
        }

        episodes = allEpisodes;
        validateData(episodes);
        renderTable();
        updateWarningDisplay();

    } catch (error) {
        console.error('Error loading data:', error);
        showError(`Failed to load episodes: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Data validation
function validateData(data) {
    state.warnings = [];
    const currentDate = new Date();
    const ranks = new Set();
    
    data.forEach(episode => {
        if (!episode) return;
        
        // Required fields
        if (!episode.title?.trim()) {
            state.warnings.push(`Episode with rank ${episode.rank} is missing title`);
        }
        
        // Future dates
        if (episode.broadcast_date) {
            const broadcastDate = new Date(episode.broadcast_date);
            if (broadcastDate > currentDate) {
                state.warnings.push(`Episode "${episode.title}" has future broadcast date: ${episode.broadcast_date}`);
            }
        }
        
        // Invalid ranks
        if (typeof episode.rank !== 'number' || episode.rank <= 0) {
            state.warnings.push(`Episode "${episode.title}" has invalid rank: ${episode.rank}`);
        } else if (ranks.has(episode.rank)) {
            state.warnings.push(`Duplicate rank ${episode.rank} found for episode "${episode.title}"`);
        } else {
            ranks.add(episode.rank);
        }
        
        // Negative series
        if (typeof episode.series === 'number' && episode.series < 0) {
            state.warnings.push(`Episode "${episode.title}" has negative series number: ${episode.series}`);
        }
    });
}

// UI state management
function showLoading(show) {
    document.getElementById('loadingIndicator').classList.toggle('hidden', !show);
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = errorElement.querySelector('.error-text');
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
}

function clearError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.classList.add('hidden');
}

function updateWarningDisplay() {
    const warningsElement = document.getElementById('validationWarnings');
    const countElement = warningsElement.querySelector('.warning-count');
    const detailsElement = warningsElement.querySelector('.warning-details');
    
    if (state.warnings.length > 0) {
        countElement.textContent = `${state.warnings.length} validation warning${state.warnings.length === 1 ? '' : 's'}`;
        detailsElement.innerHTML = state.warnings.map(w => `<div>${w}</div>`).join('');
        warningsElement.classList.remove('hidden');
    } else {
        warningsElement.classList.add('hidden');
    }
}

// Sorting
function sortEpisodes(episodes, column, ascending) {
    return [...episodes].sort((a, b) => {
        let valueA = getComparisonValue(a, column);
        let valueB = getComparisonValue(b, column);
        
        if (valueA === valueB) return 0;
        if (valueA == null) return ascending ? 1 : -1;
        if (valueB == null) return ascending ? -1 : 1;
        
        return ascending ? 
            (valueA < valueB ? -1 : 1) : 
            (valueA < valueB ? 1 : -1);
    });
}

function getComparisonValue(episode, column) {
    if (!episode) return null;
    
    switch(column) {
        case 'rank':
        case 'series':
            return Number(episode[column]) || 0;
        case 'broadcast_date':
            return episode.broadcast_date ? new Date(episode.broadcast_date) : null;
        case 'doctor':
            return episode.doctor?.actor?.toLowerCase();
        case 'companion':
            return episode.companion?.actor?.toLowerCase();
        case 'cast':
            return getCastCount(episode.cast);
        default:
            return episode[column]?.toString().toLowerCase();
    }
}

// Filtering
function filterEpisodes(episodes, filter) {
    if (!filter) return episodes;
    if (!Array.isArray(episodes)) return [];
    
    const searchTerm = filter.toLowerCase();
    return episodes.filter(episode => {
        if (!episode) return false;
        
        // Safely check each field with optional chaining and nullish coalescing
        const title = episode.title?.toLowerCase() ?? '';
        const director = episode.director?.toLowerCase() ?? '';
        const writer = episode.writer?.toLowerCase() ?? '';
        const doctorName = episode.doctor?.actor?.toLowerCase() ?? '';
        const companionName = episode.companion?.actor?.toLowerCase() ?? '';
        
        return title.includes(searchTerm) ||
               director.includes(searchTerm) ||
               writer.includes(searchTerm) ||
               doctorName.includes(searchTerm) ||
               companionName.includes(searchTerm);
    });
}

// Rendering
function renderTable() {
    const tbody = document.getElementById('episodesTableBody');
    const filtered = filterEpisodes(episodes, state.filter);
    const sorted = sortEpisodes(filtered, state.sortColumn, state.sortAscending);
    
    tbody.innerHTML = '';
    
    sorted.forEach(episode => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${episode.rank || ''}</td>
            <td>${episode.title || ''}</td>
            <td>${episode.series || ''}</td>
            <td>${episode.era || ''}</td>
            <td>${formatDate(episode.broadcast_date)}</td>
            <td>${episode.director || ''}</td>
            <td>${episode.writer || ''}</td>
            <td>${formatDoctor(episode.doctor)}</td>
            <td>${formatCompanion(episode.companion)}</td>
            <td>${getCastCount(episode.cast)}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Update sort indicators
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sort === state.sortColumn) {
            th.classList.add(state.sortAscending ? 'asc' : 'desc');
        }
    });
}

// Event handlers
function retryLoad() {
    loadData();
}

function toggleWarningDetails() {
    const details = document.querySelector('.warning-details');
    details.classList.toggle('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set up sort handlers
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (state.sortColumn === column) {
                state.sortAscending = !state.sortAscending;
            } else {
                state.sortColumn = column;
                state.sortAscending = true;
            }
            renderTable();
        });
    });
    
    // Set up filter handler
    const filterInput = document.getElementById('nameFilter');
    filterInput.addEventListener('input', (e) => {
        state.filter = e.target.value;
        renderTable();
    });
    
    // Load initial data
    loadData();
});
