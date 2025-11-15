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
        name: '',         // Current filter value
        era: '',          // Era filter
        doctor: '',       // Doctor filter
        companion: ''     // Companion filter
    },
    keyboard: {
        currentRow: -1,    // Currently focused row
        currentCol: 0      // Currently focused column
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Filter input listener
    const nameFilter = document.getElementById('name-filter');
    nameFilter.addEventListener('input', (e) => {
        state.filters.name = e.target.value.toLowerCase();
        filterEpisodes();
    });

    // Era filter listener
    const eraFilter = document.getElementById('era-filter');
    eraFilter.addEventListener('change', (e) => {
        state.filters.era = e.target.value;
        filterEpisodes();
    });

    // Doctor filter listener
    const doctorFilter = document.getElementById('doctor-filter');
    doctorFilter.addEventListener('change', (e) => {
        state.filters.doctor = e.target.value;
        filterEpisodes();
    });

    // Companion filter listener
    const companionFilter = document.getElementById('companion-filter');
    companionFilter.addEventListener('change', (e) => {
        state.filters.companion = e.target.value;
        filterEpisodes();
    });

    // Column header click listeners for sorting
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            sortEpisodes(field);
        });
    });

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clear-filters');
    clearFiltersBtn.addEventListener('click', clearAllFilters);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Clear All Filters
function clearAllFilters() {
    // Reset filter state
    state.filters.name = '';
    state.filters.era = '';
    state.filters.doctor = '';
    state.filters.companion = '';
    
    // Reset UI elements
    document.getElementById('name-filter').value = '';
    document.getElementById('era-filter').value = '';
    document.getElementById('doctor-filter').value = '';
    document.getElementById('companion-filter').value = '';
    
    // Re-filter (will show all episodes)
    filterEpisodes();
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        
        const response = await fetch(CONFIG.DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Store episodes in state
        state.episodes = data.episodes || [];
        state.filtered = [...state.episodes];
        
        // Populate filter dropdowns
        populateFilterDropdowns();
        
        // Initial sort by rank
        sortEpisodes('rank');
        
        // Display episodes
        displayEpisodes(state.filtered);
        
        showError('');
        
    } catch (error) {
        console.error('Failed to load episodes:', error);
        showError('Failed to load episodes. Please check your internet connection and try again.');
    } finally {
        showLoading(false);
    }
}

// Populate Filter Dropdowns - Bonus Feature
function populateFilterDropdowns() {
    // Get unique doctors
    const doctors = new Set();
    state.episodes.forEach(episode => {
        if (episode.doctor && episode.doctor.actor) {
            doctors.add(episode.doctor.actor);
        }
    });
    
    // Sort doctors alphabetically
    const sortedDoctors = Array.from(doctors).sort();
    
    // Populate doctor dropdown
    const doctorFilter = document.getElementById('doctor-filter');
    sortedDoctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor;
        option.textContent = doctor;
        doctorFilter.appendChild(option);
    });
    
    // Get unique companions
    const companions = new Set();
    state.episodes.forEach(episode => {
        if (episode.companion && episode.companion.actor) {
            companions.add(episode.companion.actor);
        }
    });
    
    // Sort companions alphabetically
    const sortedCompanions = Array.from(companions).sort();
    
    // Populate companion dropdown
    const companionFilter = document.getElementById('companion-filter');
    sortedCompanions.forEach(companion => {
        const option = document.createElement('option');
        option.value = companion;
        option.textContent = companion;
        companionFilter.appendChild(option);
    });
}

// Display Functions
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    const table = document.getElementById('episodes-table');
    const noResults = document.getElementById('no-results');
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Show/hide table and no results message
    if (episodes.length === 0) {
        table.style.display = 'none';
        noResults.style.display = 'block';
        return;
    } else {
        table.style.display = 'table';
        noResults.style.display = 'none';
    }
    
    // Create row for each episode
    episodes.forEach(episode => {
        const row = document.createElement('tr');
        
        // Rank
        const rankCell = document.createElement('td');
        rankCell.textContent = episode.rank;
        row.appendChild(rankCell);
        
        // Title - handle special characters
        const titleCell = document.createElement('td');
        titleCell.textContent = episode.title;
        row.appendChild(titleCell);
        
        // Series
        const seriesCell = document.createElement('td');
        seriesCell.textContent = episode.series;
        row.appendChild(seriesCell);
        
        // Era
        const eraCell = document.createElement('td');
        eraCell.textContent = episode.era;
        row.appendChild(eraCell);
        
        // Broadcast Date (full date)
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(episode.broadcast_date);
        dateCell.style.textAlign = 'center';
        row.appendChild(dateCell);
        
        // Director
        const directorCell = document.createElement('td');
        directorCell.textContent = episode.director;
        row.appendChild(directorCell);
        
        // Writer - handle multiple writers
        const writerCell = document.createElement('td');
        writerCell.textContent = episode.writer;
        row.appendChild(writerCell);
        
        // Doctor - format as "Actor (Incarnation)"
        const doctorCell = document.createElement('td');
        if (episode.doctor) {
            doctorCell.textContent = `${episode.doctor.actor} (${episode.doctor.incarnation})`;
        } else {
            doctorCell.textContent = '—';
        }
        row.appendChild(doctorCell);
        
        // Companion - handle null companions
        const companionCell = document.createElement('td');
        if (episode.companion && episode.companion.actor) {
            companionCell.textContent = `${episode.companion.actor} (${episode.companion.character})`;
        } else {
            companionCell.textContent = '—';
        }
        row.appendChild(companionCell);
        
        // Cast Count - handle empty arrays
        const castCell = document.createElement('td');
        const castCount = episode.cast ? episode.cast.length : 0;
        castCell.innerHTML = `<span class="cast-count">${castCount}</span>`;
        row.appendChild(castCell);
        
        tbody.appendChild(row);
    });
}

// Sorting Functions
function sortEpisodes(field) {
    // Update sort state
    if (state.sort.field === field) {
        // Toggle direction if same field
        state.sort.ascending = !state.sort.ascending;
    } else {
        // New field, default to ascending
        state.sort.field = field;
        state.sort.ascending = true;
    }
    
    // Sort the filtered array
    state.filtered.sort((a, b) => {
        let aValue, bValue;
        
        // Get values based on field
        switch (field) {
            case 'rank':
                aValue = a[field];
                bValue = b[field];
                break;
                
            case 'series':
                // Handle "Special" series - put them at the top
                // Then sort numeric series values
                const aIsSpecial = String(a.series).toLowerCase().includes('special');
                const bIsSpecial = String(b.series).toLowerCase().includes('special');
                
                if (aIsSpecial && !bIsSpecial) {
                    aValue = -1;
                    bValue = 1;
                } else if (!aIsSpecial && bIsSpecial) {
                    aValue = 1;
                    bValue = -1;
                } else if (aIsSpecial && bIsSpecial) {
                    // Both special, compare as strings
                    aValue = String(a.series).toLowerCase();
                    bValue = String(b.series).toLowerCase();
                } else {
                    // Both numeric, compare as numbers
                    aValue = parseFloat(a.series) || 0;
                    bValue = parseFloat(b.series) || 0;
                }
                break;
                
            case 'title':
            case 'era':
            case 'director':
            case 'writer':
                aValue = (a[field] || '').toLowerCase();
                bValue = (b[field] || '').toLowerCase();
                break;
                
            case 'broadcast_date':
                aValue = parseDate(a.broadcast_date);
                bValue = parseDate(b.broadcast_date);
                break;
                
            case 'doctor':
                // Sort by doctor actor name, handle null cases
                if (!a.doctor || !a.doctor.actor) {
                    aValue = 'zzzzz'; // Sort nulls to end
                } else {
                    aValue = a.doctor.actor.toLowerCase();
                }
                if (!b.doctor || !b.doctor.actor) {
                    bValue = 'zzzzz'; // Sort nulls to end
                } else {
                    bValue = b.doctor.actor.toLowerCase();
                }
                break;
                
            case 'companion':
                aValue = a.companion ? a.companion.actor.toLowerCase() : 'zzz'; // Put null companions at end
                bValue = b.companion ? b.companion.actor.toLowerCase() : 'zzz';
                break;
                
            case 'cast':
                aValue = a.cast ? a.cast.length : 0;
                bValue = b.cast ? b.cast.length : 0;
                break;
                
            default:
                aValue = a[field];
                bValue = b[field];
        }
        
        // Compare values
        let comparison = 0;
        if (aValue < bValue) {
            comparison = -1;
        } else if (aValue > bValue) {
            comparison = 1;
        }
        
        // Apply sort direction
        return state.sort.ascending ? comparison : -comparison;
    });
    
    // Update sort indicators in headers
    updateSortIndicators();
    
    // Re-display episodes
    displayEpisodes(state.filtered);
}

// Update sort indicators in table headers
function updateSortIndicators() {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-sort') === state.sort.field) {
            header.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Filtering Functions
function filterEpisodes() {
    const searchTerm = state.filters.name;
    const eraFilter = state.filters.era;
    const doctorFilter = state.filters.doctor;
    const companionFilter = state.filters.companion;
    
    // Start with all episodes
    state.filtered = state.episodes.filter(episode => {
        // Apply era filter
        if (eraFilter && episode.era !== eraFilter) {
            return false;
        }
        
        // Apply doctor filter
        if (doctorFilter && (!episode.doctor || episode.doctor.actor !== doctorFilter)) {
            return false;
        }
        
        // Apply companion filter
        if (companionFilter && (!episode.companion || episode.companion.actor !== companionFilter)) {
            return false;
        }
        
        // Apply search term filter with relevance scoring
        if (searchTerm) {
            episode.relevanceScore = 0;
            
            // Check title - highest priority
            if (episode.title && episode.title.toLowerCase() === searchTerm) {
                episode.relevanceScore = 1000; // Exact title match
                return true;
            } else if (episode.title && episode.title.toLowerCase().includes(searchTerm)) {
                episode.relevanceScore = 500; // Title contains search term
                return true;
            }
            
            // Check other fields - lower priority
            let matched = false;
            
            // Check doctor name
            if (episode.doctor && episode.doctor.actor && 
                episode.doctor.actor.toLowerCase().includes(searchTerm)) {
                episode.relevanceScore = 100;
                matched = true;
            }
            
            // Check companion name
            if (episode.companion && episode.companion.actor && 
                episode.companion.actor.toLowerCase().includes(searchTerm)) {
                episode.relevanceScore = Math.max(episode.relevanceScore, 100);
                matched = true;
            }
            
            // Check writer
            if (episode.writer && episode.writer.toLowerCase().includes(searchTerm)) {
                episode.relevanceScore = Math.max(episode.relevanceScore, 100);
                matched = true;
            }
            
            // Check director
            if (episode.director && episode.director.toLowerCase().includes(searchTerm)) {
                episode.relevanceScore = Math.max(episode.relevanceScore, 100);
                matched = true;
            }
            
            return matched;
        }
        
        // No search term, include all episodes that passed other filters
        return true;
    });
    
    // Apply smart relevance sort if there's a search term
    if (searchTerm) {
        applySmartSort();
    } else {
        // Re-sort filtered results with current sort
        sortEpisodes(state.sort.field);
    }
}

// Smart Relevance Sort - Tier 3 Feature
function applySmartSort() {
    state.filtered.sort((a, b) => {
        // First, sort by relevance score (higher score first)
        if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
        }
        
        // Then by rank (default order)
        return a.rank - b.rank;
    });
    
    // Update display
    displayEpisodes(state.filtered);
}

// Utility Functions

// Parse date from various formats and return Date object for comparison
function parseDate(dateString) {
    if (!dateString) return new Date(0);
    
    // Try ISO format first (YYYY-MM-DD)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    // Try DD/MM/YYYY format
    const ukMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ukMatch) {
        const [, day, month, year] = ukMatch;
        return new Date(year, month - 1, day);
    }
    
    // Try "Month DD, YYYY" format
    const longMatch = dateString.match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (longMatch) {
        date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    // Try year only
    const yearMatch = dateString.match(/^(\d{4})$/);
    if (yearMatch) {
        return new Date(yearMatch[1], 0, 1);
    }
    
    // Default fallback
    return new Date(0);
}

// Format date string for display
function formatDate(dateString) {
    if (!dateString) return '—';
    
    const date = parseDate(dateString);
    
    // Format as DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Extract year from date string
function extractYear(dateString) {
    if (!dateString) return '—';
    
    const date = parseDate(dateString);
    return date.getFullYear();
}

// Keyboard Navigation - Tier 3 Feature
function handleKeyboardNavigation(e) {
    const tbody = document.getElementById('episodes-body');
    const rows = tbody.querySelectorAll('tr');
    const headers = document.querySelectorAll('th[data-sort]');
    
    if (rows.length === 0) return;
    
    // Don't interfere with typing in input fields
    if (e.target.tagName === 'INPUT') {
        // Allow Tab and Shift+Tab for filter navigation
        if (e.key === 'Tab') {
            return; // Let default tab behavior work
        }
        return;
    }
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            state.keyboard.currentRow = Math.min(state.keyboard.currentRow + 1, rows.length - 1);
            highlightRow(rows);
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            state.keyboard.currentRow = Math.max(state.keyboard.currentRow - 1, 0);
            highlightRow(rows);
            break;
            
        case 'ArrowRight':
            e.preventDefault();
            state.keyboard.currentCol = Math.min(state.keyboard.currentCol + 1, headers.length - 1);
            updateColumnHighlight();
            break;
            
        case 'ArrowLeft':
            e.preventDefault();
            state.keyboard.currentCol = Math.max(state.keyboard.currentCol - 1, 0);
            updateColumnHighlight();
            break;
            
        case 'Enter':
            e.preventDefault();
            // Sort by the currently focused column
            const field = headers[state.keyboard.currentCol].getAttribute('data-sort');
            sortEpisodes(field);
            break;
            
        case 'Home':
            e.preventDefault();
            state.keyboard.currentRow = 0;
            highlightRow(rows);
            break;
            
        case 'End':
            e.preventDefault();
            state.keyboard.currentRow = rows.length - 1;
            highlightRow(rows);
            break;
    }
}

function highlightRow(rows) {
    // Remove previous highlights
    rows.forEach(row => row.classList.remove('keyboard-focus'));
    
    // Add highlight to current row
    if (state.keyboard.currentRow >= 0 && state.keyboard.currentRow < rows.length) {
        const currentRow = rows[state.keyboard.currentRow];
        currentRow.classList.add('keyboard-focus');
        
        // Scroll into view if needed
        currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function updateColumnHighlight() {
    const headers = document.querySelectorAll('th[data-sort]');
    
    // Remove previous highlights
    headers.forEach(header => header.classList.remove('keyboard-col-focus'));
    
    // Add highlight to current column
    if (state.keyboard.currentCol >= 0 && state.keyboard.currentCol < headers.length) {
        headers[state.keyboard.currentCol].classList.add('keyboard-col-focus');
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const table = document.getElementById('episodes-table');
    const noResults = document.getElementById('no-results');
    
    if (show) {
        loading.style.display = 'block';
        table.style.display = 'none';
        noResults.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', init);
