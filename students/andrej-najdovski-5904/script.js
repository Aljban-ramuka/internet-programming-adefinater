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
    sort: {
        field: 'rank',     // Current sort field
        ascending: true    // Sort direction
    },
    filters: {
        name: ''          // Current filter value
    },
    keyboard: {
        focusedRow: -1,    // Currently focused table row
        focusedElement: null // Currently focused element
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Name filter input with debouncing for performance
    const nameFilter = document.getElementById('name-filter');
    let debounceTimer;
    
    nameFilter.addEventListener('input', (e) => {
        // Clear previous timer
        clearTimeout(debounceTimer);
        
        // Set new timer for debounced execution (300ms delay)
        debounceTimer = setTimeout(() => {
            state.filters.name = e.target.value.trim();
            filterEpisodes();
            displayEpisodes(state.filtered);
        }, 300);
    });

    // Table header sorting
    const tableHeaders = document.querySelectorAll('th[data-sort]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            sortEpisodes(field);
        });
    });

    // Keyboard navigation for accessibility
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        const response = await fetch(CONFIG.DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle the JSON structure - episodes are in data.episodes
        let episodes;
        if (Array.isArray(data)) {
            episodes = data;
        } else if (data.episodes && Array.isArray(data.episodes)) {
            episodes = data.episodes;
        } else {
            throw new Error('Data is not in expected format - no episodes array found');
        }
        
        state.episodes = episodes;
        state.filtered = [...episodes];
        state.error = null;
        
        filterEpisodes();
        displayEpisodes(state.filtered);
        
    } catch (error) {
        console.error('Failed to load episodes:', error);
        showError('Failed to load episodes: ' + error.message);
        state.episodes = [];
        state.filtered = [];
    } finally {
        showLoading(false);
    }
}

// Display Functions
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    const table = document.getElementById('episodes-table');
    const noResults = document.getElementById('no-results');
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!episodes || episodes.length === 0) {
        table.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    // Show table and hide no results message
    table.style.display = 'table';
    noResults.style.display = 'none';
    
    // Performance optimization: Use DocumentFragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    
    // Create rows for each episode
    episodes.forEach(episode => {
        const row = document.createElement('tr');
        
        // Handle edge cases and format data
        const rank = episode.rank || 0;
        const title = escapeHtml(episode.title) || 'Unknown Title';
        const series = episode.series || 'Unknown';
        const era = episode.era || 'Unknown';
        const year = formatDate(episode.broadcast_date);
        const director = escapeHtml(episode.director) || 'Unknown';
        const writer = escapeHtml(formatWriter(episode.writer));
        const doctor = escapeHtml(formatDoctor(episode.doctor));
        const companion = escapeHtml(formatCompanion(episode.companion));
        const castCount = episode.cast ? episode.cast.length : 0;
        
        row.innerHTML = `
            <td>${rank}</td>
            <td>${title}</td>
            <td>${series}</td>
            <td>${era}</td>
            <td>${year}</td>
            <td>${director}</td>
            <td>${writer}</td>
            <td>${doctor}</td>
            <td>${companion}</td>
            <td><span class="cast-count">${castCount}</span></td>
        `;
        
        fragment.appendChild(row);
    });
    
    // Batch DOM update for better performance
    tbody.appendChild(fragment);
    
    // Reset keyboard navigation state
    state.keyboard.focusedRow = -1;
    
    // Update sort indicators
    updateSortIndicators();
}

// Sorting Functions
function sortEpisodes(field) {
    // Toggle sort direction if same field, otherwise default to ascending
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }
    
    state.filtered.sort((a, b) => {
        let valueA = getFieldValue(a, field);
        let valueB = getFieldValue(b, field);
        
        // Handle null/undefined values
        if (valueA == null && valueB == null) return 0;
        if (valueA == null) return 1;
        if (valueB == null) return -1;
        
        // Convert to comparable types
        if (field === 'rank' || field === 'series') {
            valueA = Number(valueA) || 0;
            valueB = Number(valueB) || 0;
        } else if (field === 'broadcast_date') {
            valueA = getDateSortValue(a.broadcast_date);
            valueB = getDateSortValue(b.broadcast_date);
        } else if (field === 'cast') {
            valueA = (a.cast || []).length;
            valueB = (b.cast || []).length;
        } else {
            // String comparison (case-insensitive)
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
        }
        
        let result;
        if (valueA < valueB) result = -1;
        else if (valueA > valueB) result = 1;
        else result = 0;
        
        return state.sort.ascending ? result : -result;
    });
    
    displayEpisodes(state.filtered);
}

function getFieldValue(episode, field) {
    switch (field) {
        case 'rank': return episode.rank;
        case 'title': return episode.title;
        case 'series': return episode.series;
        case 'era': return episode.era;
        case 'broadcast_date': return episode.broadcast_date;
        case 'director': return episode.director;
        case 'writer': return formatWriter(episode.writer);
        case 'doctor': return formatDoctor(episode.doctor);
        case 'companion': return formatCompanion(episode.companion);
        case 'cast': return (episode.cast || []).length;
        default: return '';
    }
}

function getDateSortValue(date) {
    if (!date) return 0;
    
    try {
        // Extract year and convert to number for proper sorting
        const year = formatDate(date);
        return year === 'Unknown' ? 0 : Number(year);
    } catch (error) {
        return 0;
    }
}

function updateSortIndicators() {
    // Remove existing sort classes
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Add appropriate class to current sort field
    const currentHeader = document.querySelector(`th[data-sort="${state.sort.field}"]`);
    if (currentHeader) {
        currentHeader.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
    }
}

// Filtering Functions
function filterEpisodes() {
    const nameFilter = state.filters.name.toLowerCase();
    
    if (!nameFilter) {
        // No filter applied, show all episodes
        state.filtered = [...state.episodes];
    } else {
        // Apply case-insensitive name filter
        state.filtered = state.episodes.filter(episode => {
            // Search in title primarily, but also in other fields for better UX
            const title = (episode.title || '').toLowerCase();
            const director = (episode.director || '').toLowerCase();
            const writer = (formatWriter(episode.writer) || '').toLowerCase();
            const doctor = (formatDoctor(episode.doctor) || '').toLowerCase();
            const companion = (formatCompanion(episode.companion) || '').toLowerCase();
            
            return title.includes(nameFilter) ||
                   director.includes(nameFilter) ||
                   writer.includes(nameFilter) ||
                   doctor.includes(nameFilter) ||
                   companion.includes(nameFilter);
        });
    }
    
    // Re-apply current sort to filtered results
    if (state.sort.field) {
        const currentField = state.sort.field;
        const currentDirection = state.sort.ascending;
        
        // Temporarily reset to avoid toggling in sortEpisodes
        state.sort.field = null;
        sortEpisodes(currentField);
        
        // Restore the direction if it got toggled
        if (state.sort.ascending !== currentDirection) {
            state.sort.ascending = currentDirection;
            state.filtered.reverse();
        }
    }
}

// Utility Functions
function formatDate(date) {
    if (!date) return 'Unknown';
    
    // Handle different date formats and extract year
    try {
        // If it's already just a year (YYYY)
        if (/^\d{4}$/.test(date)) {
            return date;
        }
        
        // ISO format: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date.split('-')[0];
        }
        
        // UK format: DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            return date.split('/')[2];
        }
        
        // Long format: Month DD, YYYY or Month YYYY
        const longFormatMatch = date.match(/\b(\d{4})\b/);
        if (longFormatMatch) {
            return longFormatMatch[1];
        }
        
        // Fallback: try to parse as Date and extract year
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed.getFullYear().toString();
        }
        
        return 'Unknown';
    } catch (error) {
        console.warn('Failed to parse date:', date, error);
        return 'Unknown';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDoctor(doctor) {
    if (!doctor || !doctor.actor) return 'Unknown';
    return `${doctor.actor} (${doctor.incarnation || 'Unknown'})`;
}

function formatCompanion(companion) {
    if (!companion || !companion.actor) return 'None';
    return `${companion.actor} (${companion.character || 'Unknown'})`;
}

function formatWriter(writer) {
    if (!writer) return 'Unknown';
    // Handle multiple writers separated by & or "and"
    return writer.replace(/\s+&\s+/g, ' & ').replace(/\s+and\s+/g, ' & ');
}

// Keyboard Navigation (Advanced Feature)
function handleKeyboardNavigation(event) {
    const table = document.getElementById('episodes-table');
    const rows = table.querySelectorAll('tbody tr');
    
    if (rows.length === 0) return;
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (state.keyboard.focusedRow < rows.length - 1) {
                state.keyboard.focusedRow++;
                updateRowFocus(rows);
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            if (state.keyboard.focusedRow > 0) {
                state.keyboard.focusedRow--;
                updateRowFocus(rows);
            } else if (state.keyboard.focusedRow === 0) {
                // Move focus to filter input
                document.getElementById('name-filter').focus();
                state.keyboard.focusedRow = -1;
                updateRowFocus(rows);
            }
            break;
            
        case 'Enter':
            // If focused on table headers, sort by that column
            if (event.target.tagName === 'TH' && event.target.dataset.sort) {
                event.preventDefault();
                sortEpisodes(event.target.dataset.sort);
            }
            break;
            
        case 'Tab':
            // Let default tab behavior work for filter navigation
            break;
    }
}

function updateRowFocus(rows) {
    // Remove focus from all rows
    rows.forEach((row, index) => {
        row.classList.remove('focused-row');
        if (index === state.keyboard.focusedRow) {
            row.classList.add('focused-row');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
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