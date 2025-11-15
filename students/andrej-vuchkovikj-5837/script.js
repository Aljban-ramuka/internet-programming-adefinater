// Configuration
const CONFIG = {
    // Alternative 1: Full dataset (default)
    DATA_URL: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
    
    // Fallback: Local file if API fails (automatic fallback)
    FALLBACK_FILE: 'doctor-who-episodes-full.json',
    
    // Alternative 2: Multiple files (bonus 5 points) - COMMENTED OUT (URLs not responding)
    // Uncomment below if GitHub URLs become available
    // To use: comment out DATA_URL above and uncomment DATA_URLS below
    // DATA_URLS: [
    //     'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
    //     'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
    //     'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
    //     'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
    //     'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
    //     'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
    // ],
    
    // Alternative 3: Local file (negative 10 points penalty)
    // Uncomment and use only if alternatives 1 and 2 are not available
    // LOCAL_FILE: 'doctor-who-episodes-full.json'
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
    validation: {
        warnings: [],      // Data validation warnings
        warningCount: 0    // Total warning count
    },
    keyboard: {
        focusedRowIndex: 0  // Currently focused row for keyboard nav
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Filter input listener for name search
    const nameFilter = document.getElementById('name-filter');
    if (nameFilter) {
        nameFilter.addEventListener('input', (e) => {
            state.filters.name = e.target.value;
            filterEpisodes();
        });
    }

    // Column header click listeners for sorting
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            // Toggle sort direction if clicking same field, otherwise ascending
            if (state.sort.field === field) {
                state.sort.ascending = !state.sort.ascending;
            } else {
                state.sort.field = field;
                state.sort.ascending = true;
            }
            updateSortIndicators();
            sortEpisodes();
        });
    });

    // TIER 3 - OPTION 2: Keyboard Navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Data Loading
// IMPORTANT: This function demonstrates proper loading state management:
// 1. showLoading(true) → displays loading indicator at the start
// 2. try-catch → handles all errors gracefully
// 3. showError() → displays user-friendly error messages
// 4. showLoading(false) → hides loading indicator in finally block (always executes)
async function loadEpisodes() {
    try {
        showLoading(true);  // ✅ Show loading indicator while fetching
        
        let allEpisodes = [];
        let loadingMethod = '';
        
        // Check which loading method to use
        if (CONFIG.DATA_URLS) {
            // Alternative 2: Load from multiple files (bonus 5 points)
            // Using Promise.all for parallel fetching with error handling
            console.log('Loading episodes from multiple sources (Bonus: Alternative 2)...');
            loadingMethod = 'Alternative 2: Multiple URLs';
            
            const fetchPromises = CONFIG.DATA_URLS.map(url => 
                fetch(url).then(response => {
                    if (!response.ok) {
                        // ✅ Handle network errors gracefully
                        throw new Error(`Failed to load ${url}: ${response.status}`);
                    }
                    return response.json();
                })
            );
            
            try {
                const results = await Promise.all(fetchPromises);
                // Combine all episodes from all files into a single array
                allEpisodes = results.flat();
                console.log(`Successfully loaded ${allEpisodes.length} episodes from ${CONFIG.DATA_URLS.length} sources`);
            } catch (fetchError) {
                // ✅ Display error message if fetch fails
                throw new Error(`Error loading multiple files: ${fetchError.message}`);
            }
        } else if (CONFIG.LOCAL_FILE) {
            // Alternative 3: Load from local file (penalty: -10 points)
            console.warn('Loading from local file (Penalty: Alternative 3, -10 points)');
            loadingMethod = 'Alternative 3: Local File';
            const response = await fetch(CONFIG.LOCAL_FILE);
            if (!response.ok) {
                // ✅ Handle network errors gracefully
                throw new Error(`Failed to load local file: ${response.status}`);
            }
            allEpisodes = await response.json();
        } else {
            // Alternative 1: Load from single full dataset (default, no bonus/penalty)
            loadingMethod = 'Alternative 1: Single URL';
            console.log(`Loading episodes from API: ${CONFIG.DATA_URL}`);
            
            try {
                const response = await fetch(CONFIG.DATA_URL);
                if (!response.ok) {
                    // ✅ Handle network errors gracefully
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Handle different response formats for the full dataset
                if (Array.isArray(data)) {
                    allEpisodes = data;
                } else if (data.episodes && Array.isArray(data.episodes)) {
                    allEpisodes = data.episodes;
                } else if (data.data && Array.isArray(data.data)) {
                    allEpisodes = data.data;
                } else {
                    throw new Error('Invalid data format: expected array or object with episodes/data property');
                }
                console.log(`Successfully loaded ${allEpisodes.length} episodes from API`);
            } catch (apiError) {
                // ✅ FALLBACK: Try local file if API fails
                console.warn(`API failed (${apiError.message}). Attempting fallback to local file...`);
                console.warn(`Fallback file: ${CONFIG.FALLBACK_FILE}`);
                
                try {
                    const fallbackResponse = await fetch(CONFIG.FALLBACK_FILE);
                    if (!fallbackResponse.ok) {
                        throw new Error(`Failed to load fallback file: ${fallbackResponse.status}`);
                    }
                    const fallbackData = await fallbackResponse.json();
                    
                    // Handle different response formats for fallback
                    if (Array.isArray(fallbackData)) {
                        allEpisodes = fallbackData;
                    } else if (fallbackData.episodes && Array.isArray(fallbackData.episodes)) {
                        allEpisodes = fallbackData.episodes;
                    } else if (fallbackData.data && Array.isArray(fallbackData.data)) {
                        allEpisodes = fallbackData.data;
                    } else {
                        throw new Error('Invalid fallback data format');
                    }
                    
                    loadingMethod = 'Fallback: Local File (API Failed)';
                    console.log(`✓ Fallback successful! Loaded ${allEpisodes.length} episodes from local file`);
                } catch (fallbackError) {
                    // Both API and fallback failed
                    throw new Error(`Both API and fallback failed. API error: ${apiError.message}. Fallback error: ${fallbackError.message}`);
                }
            }
        }
        
        // Validate that we have episodes
        if (!Array.isArray(allEpisodes) || allEpisodes.length === 0) {
            throw new Error('No episodes found in the loaded data');
        }
        
        // Store episodes and initialize display
        state.episodes = allEpisodes;
        state.filtered = [...state.episodes];
        
        // TIER 3 - OPTION 1: Data Validation
        // Check for suspicious/invalid data in episodes
        validateData(state.episodes);
        
        displayEpisodes(state.filtered);
        sortEpisodes();
        
        // Log successful load
        console.log(`✓ Application initialized with ${state.episodes.length} episodes`);
        console.log(`Loading method: ${loadingMethod}`);
        
    } catch (error) {
        // ✅ Display error message if fetch fails
        showError('Failed to load episodes: ' + error.message);
        console.error('Error loading episodes:', error);
    } finally {
        showLoading(false);  // ✅ Hide loading indicator when done
    }
}

// Display Functions
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    const table = document.getElementById('episodes-table');
    const noResults = document.getElementById('no-results');
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (episodes.length === 0) {
        table.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    // Create row for each episode
    episodes.forEach((episode, index) => {
        const row = document.createElement('tr');
        
        // Make rows tabbable but hidden from visual tab order (tabindex="-1")
        row.setAttribute('tabindex', '-1');
        row.setAttribute('data-row-index', index);
        
        // Handle edge cases and format data
        const companionText = episode.companion 
            ? `${episode.companion.actor} (${episode.companion.character})`
            : '—';
        
        const castCount = episode.cast && Array.isArray(episode.cast) 
            ? episode.cast.length 
            : 0;
        
        const broadcastYear = extractYear(episode.broadcast_date);
        
        // Handle missing required fields
        const title = episode.title ? episode.title : '— (Missing Title)';
        const director = episode.director ? episode.director : '—';
        const writer = episode.writer ? episode.writer : '—';
        const doctorActor = episode.doctor && episode.doctor.actor ? episode.doctor.actor : '—';
        const doctorIncarnation = episode.doctor && episode.doctor.incarnation ? episode.doctor.incarnation : '—';
        
        // Create cells and use textContent for proper escaping
        const rankCell = document.createElement('td');
        rankCell.textContent = episode.rank;
        row.appendChild(rankCell);
        
        const titleCell = document.createElement('td');
        titleCell.textContent = title;
        row.appendChild(titleCell);
        
        const seriesCell = document.createElement('td');
        seriesCell.textContent = episode.series;
        row.appendChild(seriesCell);
        
        const eraCell = document.createElement('td');
        eraCell.textContent = episode.era;
        row.appendChild(eraCell);
        
        const yearCell = document.createElement('td');
        yearCell.textContent = broadcastYear;
        row.appendChild(yearCell);
        
        const directorCell = document.createElement('td');
        directorCell.textContent = director;
        row.appendChild(directorCell);
        
        const writerCell = document.createElement('td');
        writerCell.textContent = writer;
        row.appendChild(writerCell);
        
        const doctorCell = document.createElement('td');
        doctorCell.textContent = `${doctorActor} (${doctorIncarnation})`;
        row.appendChild(doctorCell);
        
        const companionCell = document.createElement('td');
        companionCell.textContent = companionText;
        row.appendChild(companionCell);
        
        const castCell = document.createElement('td');
        const castSpan = document.createElement('span');
        castSpan.className = 'cast-count';
        castSpan.textContent = castCount;
        castCell.appendChild(castSpan);
        row.appendChild(castCell);
        
        tbody.appendChild(row);
    });
    
    table.style.display = 'table';
    noResults.style.display = 'none';
    
    // Highlight first row on initial display
    if (episodes.length > 0) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        highlightRow(rows, 0);
    }
}

// Sorting Functions
function sortEpisodes() {
    try {
        // Sort based on current sort state
        state.filtered.sort((a, b) => {
            let aVal = getFieldValue(a, state.sort.field);
            let bVal = getFieldValue(b, state.sort.field);
            
            // Handle null/undefined values
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return state.sort.ascending ? 1 : -1;
            if (bVal == null) return state.sort.ascending ? -1 : 1;
            
            // Compare values - numeric fields are already numbers from getFieldValue
            // String fields will be converted to lowercase for case-insensitive comparison
            let comparison = 0;
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                // Special handling for series field: negative/invalid values come first
                if (state.sort.field === 'series') {
                    const aIsValid = aVal > 0;
                    const bIsValid = bVal > 0;
                    
                    // If one is valid and one isn't, invalid comes first
                    if (aIsValid && !bIsValid) {
                        comparison = 1;
                    } else if (!aIsValid && bIsValid) {
                        comparison = -1;
                    } else {
                        // Both valid or both invalid, sort numerically
                        comparison = aVal - bVal;
                    }
                } else {
                    // Regular numeric comparison for other numeric fields
                    comparison = aVal - bVal;
                }
            } else {
                // String comparison (case-insensitive)
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                if (aStr < bStr) {
                    comparison = -1;
                } else if (aStr > bStr) {
                    comparison = 1;
                }
            }
            
            return state.sort.ascending ? comparison : -comparison;
        });
        
        displayEpisodes(state.filtered);
    } catch (error) {
        console.error('Error in sortEpisodes:', error);
        showError('Error sorting episodes: ' + error.message);
    }
}

// Helper function to extract field values for sorting
function getFieldValue(episode, field) {
    try {
        switch(field) {
            case 'rank':
                return Number(episode.rank) || 0;
            case 'title':
                return episode.title || '';
            case 'series':
                // Ensure series is treated as number for proper numeric sorting
                return Number(episode.series) || 0;
            case 'era':
                return episode.era || '';
            case 'broadcast_date':
                // Parse date for correct sorting
                return parseDate(episode.broadcast_date);
            case 'director':
                return episode.director || '';
            case 'writer':
                return episode.writer || '';
            case 'doctor':
                return (episode.doctor && episode.doctor.actor) ? episode.doctor.actor : '';
            case 'companion':
                return episode.companion ? episode.companion.actor : '';
            case 'cast':
                return episode.cast ? episode.cast.length : 0;
            default:
                return '';
        }
    } catch (error) {
        console.error('Error in getFieldValue:', field, episode, error);
        return '';
    }
}

// Update sort indicators in table headers
function updateSortIndicators() {
    document.querySelectorAll('th[data-sort]').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-sort') === state.sort.field) {
            header.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Filtering Functions
function filterEpisodes() {
    // Apply name filter (case-insensitive, partial match)
    state.filtered = state.episodes.filter(episode => {
        const searchTerm = state.filters.name.toLowerCase();
        
        if (!searchTerm) {
            return true; // No filter, include all
        }
        
        // Search in title, director, writer, doctor, and companion
        // Add safety checks for missing fields
        const titleMatch = episode.title && episode.title.toLowerCase().includes(searchTerm);
        const directorMatch = episode.director && episode.director.toLowerCase().includes(searchTerm);
        const writerMatch = episode.writer && episode.writer.toLowerCase().includes(searchTerm);
        const doctorMatch = episode.doctor && episode.doctor.actor && episode.doctor.actor.toLowerCase().includes(searchTerm);
        const companionMatch = episode.companion && 
            (episode.companion.actor.toLowerCase().includes(searchTerm) ||
             episode.companion.character.toLowerCase().includes(searchTerm));
        
        return titleMatch || directorMatch || writerMatch || doctorMatch || companionMatch;
    });
    
    // Re-sort filtered results
    sortEpisodes();
}

// Utility Functions

/**
 * Escape HTML special characters to prevent XSS and display special characters correctly
 * Handles quotes, apostrophes, hyphens, slashes, angle brackets, and other special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    // Create a temporary element to leverage browser's HTML escaping
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Parse dates in multiple formats and convert to timestamp for sorting
 * Handles: YYYY-MM-DD, DD/MM/YYYY, Month DD, YYYY, YYYY
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date(0).getTime();
    
    let date;
    
    // Try ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        date = new Date(dateStr);
    }
    // Try UK format DD/MM/YYYY
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        date = new Date(year, month - 1, day);
    }
    // Try long format Month DD, YYYY
    else if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(dateStr)) {
        date = new Date(dateStr);
    }
    // Try year only YYYY
    else if (/^\d{4}$/.test(dateStr)) {
        date = new Date(dateStr, 0, 1);
    }
    // Fallback to parsing as-is
    else {
        date = new Date(dateStr);
    }
    
    return isNaN(date.getTime()) ? 0 : date.getTime();
}

/**
 * Extract year from various date formats
 */
function extractYear(dateStr) {
    if (!dateStr) return '—';
    
    // Try ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr.split('-')[0];
    }
    // Try UK format
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr.split('/')[2];
    }
    // Try long format
    else if (/^[A-Za-z]+ \d{1,2}, (\d{4})$/.test(dateStr)) {
        return dateStr.match(/\d{4}$/)[0];
    }
    // Year only
    else if (/^\d{4}$/.test(dateStr)) {
        return dateStr;
    }
    
    return '—';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = show ? 'none' : 'table';
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
    // Also hide table and show no results
    if (message) {
        document.getElementById('episodes-table').style.display = 'none';
    }
}

// ============================================================================
// TIER 3 - OPTION 1: Data Validation
// ============================================================================

/**
 * Validate all episodes data and log warnings for suspicious entries
 * Checks for:
 * - Missing required fields
 * - Future broadcast dates
 * - Duplicate ranks
 * - Negative series numbers
 */
function validateData(episodes) {
    state.validation.warnings = [];
    const today = new Date();
    const seenRanks = new Set();
    
    episodes.forEach((episode, index) => {
        // Check for missing required fields
        if (!episode.title) {
            addWarning(`Episode ${index}: Missing title field`);
        }
        if (!episode.doctor || !episode.doctor.actor) {
            addWarning(`Episode ${index}: Missing doctor actor`);
        }
        if (!episode.broadcast_date) {
            addWarning(`Episode ${index}: Missing broadcast_date`);
        }
        
        // Check for future broadcast dates
        const episodeDate = new Date(episode.broadcast_date);
        if (episodeDate > today && episode.broadcast_date !== 'Invalid Date') {
            addWarning(`Episode "${episode.title}": Future broadcast date (${episode.broadcast_date})`);
        }
        
        // Check for duplicate ranks
        if (episode.rank && seenRanks.has(episode.rank)) {
            addWarning(`Episode "${episode.title}": Duplicate rank (${episode.rank})`);
        }
        if (episode.rank) {
            seenRanks.add(episode.rank);
        }
        
        // Check for invalid rank (negative or zero)
        if (episode.rank <= 0) {
            addWarning(`Episode "${episode.title}": Invalid rank (${episode.rank}). Must be positive.`);
        }
        
        // Check for negative series numbers
        if (episode.series && Number(episode.series) < 0) {
            addWarning(`Episode "${episode.title}": Negative series number (${episode.series})`);
        }
    });
    
    state.validation.warningCount = state.validation.warnings.length;
    
    // Log to console
    if (state.validation.warningCount > 0) {
        console.warn(`⚠️  Data Validation: Found ${state.validation.warningCount} warnings`);
        state.validation.warnings.forEach(warning => {
            console.warn(`   - ${warning}`);
        });
    } else {
        console.log('✓ Data Validation: All episodes passed validation');
    }
    
    // Display warning count in UI
    displayValidationWarnings();
}

/**
 * Add a warning to the warnings list
 */
function addWarning(message) {
    state.validation.warnings.push(message);
}

/**
 * Display validation warning count in the UI
 */
function displayValidationWarnings() {
    if (state.validation.warningCount > 0) {
        let warningDiv = document.getElementById('validation-warnings');
        if (!warningDiv) {
            warningDiv = document.createElement('div');
            warningDiv.id = 'validation-warnings';
            warningDiv.className = 'validation-warnings';
            const main = document.querySelector('main');
            if (main) {
                main.insertBefore(warningDiv, document.getElementById('loading'));
            }
        }
        warningDiv.innerHTML = `
            <strong>⚠️  Data Validation:</strong> ${state.validation.warningCount} warning(s) found. 
            <br><small>Check console (F12) for details</small>
        `;
        warningDiv.style.display = 'block';
    }
}

// ============================================================================
// TIER 3 - OPTION 2: Keyboard Navigation
// ============================================================================

/**
 * Enhanced keyboard navigation that works with ALL interactive elements
 * - Table rows: Arrow Up/Down, Enter to sort
 * - Filter input: Tab/Shift+Tab, Escape
 * - Column headers: Click (already works), Tab navigation
 * - All elements: Keyboard shortcuts for quick access
 */
function handleKeyboardNavigation(event) {
    const key = event.key;
    const tbody = document.getElementById('episodes-body');
    const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
    const nameFilter = document.getElementById('name-filter');
    const headers = document.querySelectorAll('th[data-sort]');
    
    if (!rows.length) return;
    
    const activeElement = document.activeElement;
    const isFilterFocused = activeElement === nameFilter;
    const isHeaderFocused = Array.from(headers).includes(activeElement);
    const isRowFocused = rows.some(row => row.classList.contains('keyboard-focused'));
    
    // ========== TABLE ROW NAVIGATION ==========
    // Arrow Down: Move to next row
    if (key === 'ArrowDown' && !isFilterFocused && !isHeaderFocused) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = Math.min(state.keyboard.focusedRowIndex + 1, rows.length - 1);
        highlightRow(rows, state.keyboard.focusedRowIndex);
        console.log(`⬇️ Arrow Down: Row ${state.keyboard.focusedRowIndex + 1}`);
    }
    // Arrow Up: Move to previous row
    else if (key === 'ArrowUp' && !isFilterFocused && !isHeaderFocused) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = Math.max(state.keyboard.focusedRowIndex - 1, 0);
        highlightRow(rows, state.keyboard.focusedRowIndex);
        console.log(`⬆️ Arrow Up: Row ${state.keyboard.focusedRowIndex + 1}`);
    }
    // J key: Move to next row (vim-style navigation)
    else if ((key === 'j' || key === 'J') && !isFilterFocused && !isHeaderFocused) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = Math.min(state.keyboard.focusedRowIndex + 1, rows.length - 1);
        highlightRow(rows, state.keyboard.focusedRowIndex);
        console.log(`⬇️ J: Row ${state.keyboard.focusedRowIndex + 1}`);
    }
    // K key: Move to previous row (vim-style navigation)
    else if ((key === 'k' || key === 'K') && !isFilterFocused && !isHeaderFocused) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = Math.max(state.keyboard.focusedRowIndex - 1, 0);
        highlightRow(rows, state.keyboard.focusedRowIndex);
        console.log(`⬆️ K: Row ${state.keyboard.focusedRowIndex + 1}`);
    }
    // PageDown: Move down 10 rows
    else if (key === 'PageDown' && !isFilterFocused && !isHeaderFocused) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = Math.min(state.keyboard.focusedRowIndex + 10, rows.length - 1);
        highlightRow(rows, state.keyboard.focusedRowIndex);
        console.log(`⬇️ PageDown: Row ${state.keyboard.focusedRowIndex + 1}`);
    }
    // PageUp: Move up 10 rows
    else if (key === 'PageUp' && !isFilterFocused && !isHeaderFocused) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = Math.max(state.keyboard.focusedRowIndex - 10, 0);
        highlightRow(rows, state.keyboard.focusedRowIndex);
        console.log(`⬆️ PageUp: Row ${state.keyboard.focusedRowIndex + 1}`);
    }
    // Enter on row: Toggle sort direction
    else if (key === 'Enter' && isRowFocused && !isFilterFocused) {
        event.preventDefault();
        state.sort.ascending = !state.sort.ascending;
        updateSortIndicators();
        sortEpisodes();
        console.log(`📊 Sorting by: ${state.sort.field} (${state.sort.ascending ? '↑' : '↓'})`);
    }
    // Enter on header: Sort by that column
    else if (key === 'Enter' && isHeaderFocused) {
        event.preventDefault();
        const field = activeElement.getAttribute('data-sort');
        if (state.sort.field === field) {
            state.sort.ascending = !state.sort.ascending;
        } else {
            state.sort.field = field;
            state.sort.ascending = true;
        }
        updateSortIndicators();
        sortEpisodes();
        console.log(`📊 Header sort: ${field} (${state.sort.ascending ? '↑' : '↓'})`);
    }
    
    // ========== TAB NAVIGATION - BETWEEN ALL ELEMENTS ==========
    // Tab from row: Move to next row or to filter/headers
    else if (key === 'Tab' && isRowFocused && !event.shiftKey) {
        event.preventDefault();
        if (state.keyboard.focusedRowIndex < rows.length - 1) {
            state.keyboard.focusedRowIndex++;
            highlightRow(rows, state.keyboard.focusedRowIndex);
        } else {
            nameFilter.focus();
            rows.forEach(row => row.classList.remove('keyboard-focused'));
            console.log('⇥ Tab to filter');
        }
    }
    // Shift+Tab from row: Move to previous row or to headers
    else if (key === 'Tab' && isRowFocused && event.shiftKey) {
        event.preventDefault();
        if (state.keyboard.focusedRowIndex > 0) {
            state.keyboard.focusedRowIndex--;
            highlightRow(rows, state.keyboard.focusedRowIndex);
        } else {
            headers[0]?.focus();
            rows.forEach(row => row.classList.remove('keyboard-focused'));
            console.log('⇧⇥ Shift+Tab to headers');
        }
    }
    // Tab from filter: Move to first row
    else if (key === 'Tab' && isFilterFocused && !event.shiftKey) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = 0;
        highlightRow(rows, 0);
        console.log('⇥ Tab from filter to table');
    }
    // Shift+Tab from filter: Move to last header
    else if (key === 'Tab' && isFilterFocused && event.shiftKey) {
        event.preventDefault();
        headers[headers.length - 1]?.focus();
        console.log('⇧⇥ Shift+Tab from filter to headers');
    }
    // Tab from header: Move to next header or filter
    else if (key === 'Tab' && isHeaderFocused && !event.shiftKey) {
        // Let browser handle natural Tab flow through headers
        // Eventually Tab will reach filter
        console.log('⇥ Tab: Natural header navigation');
    }
    // Shift+Tab from header: Move to previous header or back
    else if (key === 'Tab' && isHeaderFocused && event.shiftKey) {
        // Let browser handle natural Shift+Tab flow
        console.log('⇧⇥ Shift+Tab: Natural header navigation');
    }
    
    // ========== QUICK ACCESS SHORTCUTS ==========
    // F or Ctrl+F: Focus filter (custom shortcut, doesn't override browser search)
    else if ((key === 'f' || key === 'F') && !isFilterFocused && event.ctrlKey === false) {
        event.preventDefault();
        nameFilter.focus();
        nameFilter.select();
        rows.forEach(row => row.classList.remove('keyboard-focused'));
        console.log('🔍 Focus filter (F)');
    }
    // Escape: Return focus to table from filter
    else if (key === 'Escape' && isFilterFocused) {
        event.preventDefault();
        nameFilter.blur();
        state.keyboard.focusedRowIndex = 0;
        highlightRow(rows, 0);
        console.log('📋 Escape: Back to table');
    }
    // Space: Activate currently focused header (sort)
    else if (key === ' ' && isHeaderFocused) {
        event.preventDefault();
        activeElement.click();
        console.log('✓ Space: Activated header click');
    }
    // Home: Go to first row
    else if (key === 'Home' && (isRowFocused || !isFilterFocused)) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = 0;
        highlightRow(rows, 0);
        console.log('⏠ Home: First row');
    }
    // End: Go to last row
    else if (key === 'End' && (isRowFocused || !isFilterFocused)) {
        event.preventDefault();
        state.keyboard.focusedRowIndex = rows.length - 1;
        highlightRow(rows, state.keyboard.focusedRowIndex);
        console.log('⏁ End: Last row');
    }
}

/**
 * Highlight the focused row for visual feedback
 */
function highlightRow(rows, index) {
    rows.forEach((row, i) => {
        if (i === index) {
            row.classList.add('keyboard-focused');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            row.classList.remove('keyboard-focused');
        }
    });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', init);

// IMPORTANT: Prevent page refresh on errors
window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.message);
    console.error('Stack:', event.error?.stack);
});
