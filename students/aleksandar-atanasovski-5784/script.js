// Configuration
const CONFIG = {
    DATA_URL_SINGLE: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
    DATA_URLS_MULTI: [
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
    ],
    DATE_FORMATS: {
        ISO: 'YYYY-MM-DD',
        UK: 'DD/MM/YYYY',
        LONG: 'MMMM DD, YYYY',
        YEAR: 'YYYY'
    },
    ERA_ORDER: ['Classic', 'Modern', 'Recent'],
    USE_MULTI_LOAD: true // Set to true for bonus points
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
        name: '',         // Name filter value
        era: '',          // Era filter value
        doctor: '',       // Doctor filter value
        companion: ''     // Companion filter value
    },
    warnings: {           // Data validation warnings
        items: [],
        count: 0
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Filter input handler with debugging
    const nameFilter = document.getElementById('name-filter');
    if (nameFilter) {
        nameFilter.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value;
            console.log('Search term:', searchTerm); // Debug log
            state.filters.name = searchTerm;
            applyFilters();
        }, 300));
    }

    // Era filter handler
    const eraFilter = document.getElementById('era-filter');
    if (eraFilter) {
        eraFilter.addEventListener('change', (e) => {
            state.filters.era = e.target.value;
            applyFilters();
        });
    }

    // Doctor filter handler
    const doctorFilter = document.getElementById('doctor-filter');
    if (doctorFilter) {
        doctorFilter.addEventListener('change', (e) => {
            state.filters.doctor = e.target.value;
            applyFilters();
        });
    }

    // Companion filter handler
    const companionFilter = document.getElementById('companion-filter');
    if (companionFilter) {
        companionFilter.addEventListener('change', (e) => {
            state.filters.companion = e.target.value;
            applyFilters();
        });
    }

    // Column header click handler for sorting
    const tableHeaders = document.querySelectorAll('th[data-sort]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            sortEpisodes(field);
        });
    });
}

// Populate filter dropdowns from data
function populateFilterDropdowns() {
    const doctors = new Set();
    const companions = new Set();

    state.episodes.forEach(episode => {
        if (episode.doctor) {
            doctors.add(`${episode.doctor.actor} (${episode.doctor.incarnation})`);
        }
        if (episode.companion) {
            companions.add(`${episode.companion.actor} (${episode.companion.character})`);
        }
    });

    // Populate doctor filter
    const doctorFilter = document.getElementById('doctor-filter');
    [...doctors].sort().forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor;
        option.textContent = doctor;
        doctorFilter.appendChild(option);
    });

    // Populate companion filter
    const companionFilter = document.getElementById('companion-filter');
    [...companions].sort().forEach(companion => {
        const option = document.createElement('option');
        option.value = companion;
        option.textContent = companion;
        companionFilter.appendChild(option);
    });
}

// Debounce helper function for better search performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Call init when document is ready
document.addEventListener('DOMContentLoaded', init);

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        
        if (CONFIG.USE_MULTI_LOAD) {
            // Load from multiple URLs for bonus points
            const promises = CONFIG.DATA_URLS_MULTI.map(url => 
                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
            );

            const results = await Promise.all(promises);
            // Combine all episodes from different files
            state.episodes = results.flatMap(result => result.episodes);
        } else {
            // Load from single URL
            const response = await fetch(CONFIG.DATA_URL_SINGLE);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            state.episodes = data.episodes;
        }

        // Validate data
        validateData(state.episodes);

        // Sort episodes by rank initially
        state.episodes.sort((a, b) => a.rank - b.rank);
        state.filtered = [...state.episodes];
        
        // Populate filter dropdowns
        populateFilterDropdowns();
        
        // Update display
        displayEpisodes(state.filtered);
        updateWarningsDisplay();
        
    } catch (error) {
        showError(`Failed to load episodes: ${error.message}`);
        console.error('Loading error:', error);
    } finally {
        showLoading(false);
    }
}

// Display Functions
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    const table = document.getElementById('episodes-table');
    const noResults = document.getElementById('no-results');

    // Clear existing content
    tbody.innerHTML = '';

    if (!episodes || episodes.length === 0) {
        table.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    noResults.style.display = 'none';

    episodes.forEach(episode => {
        const row = document.createElement('tr');
        
        // Format all the data
        const companionText = episode.companion 
            ? `${episode.companion.actor} (${episode.companion.character})`
            : '—';
        
        const doctorText = `${episode.doctor.actor} (${episode.doctor.incarnation})`;
        
        const castCount = episode.cast ? episode.cast.length : 0;
        
        const broadcastYear = extractYear(episode.broadcast_date);

        // Format writer credits
        const writerText = formatWriterCredits(episode.writer);

        // Create all cells
        row.innerHTML = `
            <td>${episode.rank ?? '—'}</td>
            <td>${escapeHtml(episode.title) || '—'}</td>
            <td>${episode.series ?? '—'}</td>
            <td>${episode.era || '—'}</td>
            <td>${broadcastYear}</td>
            <td>${episode.director || '—'}</td>
            <td>${writerText}</td>
            <td>${doctorText}</td>
            <td>${companionText}</td>
            <td>${castCount}</td>
        `;

        tbody.appendChild(row);
    });
}

// Helper function to format writer credits
function formatWriterCredits(writer) {
    if (!writer) return '—';
    
    // Split on common separators and clean up
    const writers = writer
        .split(/\s*(?:&|and)\s*/i)
        .map(w => w.trim())
        .filter(w => w.length > 0);
    
    if (writers.length === 1) return writers[0];
    return writers.join(' & ');
}

// Helper function to parse dates for sorting
function parseDateForSorting(dateString) {
    if (!dateString) return 0;
    
    // Handle year-only format
    if (dateString.match(/^\d{4}$/)) {
        return new Date(dateString + '-01-01').getTime();
    }
    
    // Handle ISO format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateString).getTime();
    }
    
    // Handle UK format (DD/MM/YYYY)
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateString.split('/');
        return new Date(`${year}-${month}-${day}`).getTime();
    }
    
    // Handle long format (Month DD, YYYY)
    if (dateString.includes(',')) {
        return new Date(dateString).getTime();
    }
    
    // Default case: try to find a year and use January 1st of that year
    const yearMatch = dateString.match(/\d{4}/);
    if (yearMatch) {
        return new Date(`${yearMatch[0]}-01-01`).getTime();
    }
    
    return 0; // Invalid date
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to extract year from different date formats
function extractYear(dateString) {
    if (!dateString) return '—';
    
    // Handle different date formats
    if (dateString.match(/^\d{4}$/)) {
        // Year only format (e.g., "2024")
        return dateString;
    }
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // ISO format (e.g., "2024-01-01")
        return dateString.split('-')[0];
    }
    
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // UK format (e.g., "01/01/2024")
        return dateString.split('/')[2];
    }
    
    if (dateString.includes(',')) {
        // Long format (e.g., "January 1, 2024")
        return dateString.split(',')[1].trim().split(' ')[0];
    }
    
    // If no format matches, try to find a 4-digit year
    const yearMatch = dateString.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : '—';
}

// Sorting Functions
function sortEpisodes(field) {
    // Toggle sort direction if same column is clicked
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }

    // Update sort indicators in UI
    updateSortIndicators(field);

    // Sort the filtered episodes
    state.filtered.sort((a, b) => {
        let valueA = getSortValue(a, field);
        let valueB = getSortValue(b, field);
        
        const multiplier = state.sort.ascending ? 1 : -1;
        
        if (valueA < valueB) return -1 * multiplier;
        if (valueA > valueB) return 1 * multiplier;
        return 0;
    });

    // Re-display the sorted episodes
    displayEpisodes(state.filtered);
}

function getSortValue(episode, field) {
    switch(field) {
        case 'rank':
        case 'series':
            return Number(episode[field]) || 0;
        
        case 'title':
        case 'director':
            return episode[field]?.toLowerCase() || '';
        
        case 'era':
            return CONFIG.ERA_ORDER.indexOf(episode.era);
        
        case 'broadcast_date':
            return parseDateForSorting(episode.broadcast_date);
        
        case 'writer':
            return episode.writer?.toLowerCase() || '';
        
        case 'doctor':
            return episode.doctor?.actor?.toLowerCase() || '';
        
        case 'companion':
            return episode.companion?.actor?.toLowerCase() || 'zzz'; // Sort null companions last
        
        case 'cast':
            return episode.cast?.length || 0;
            
        default:
            return episode[field];
    }
}

function updateSortIndicators(field) {
    // Remove sort indicators from all headers
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
        // Add sort indicator to current sort column
        if (header.dataset.sort === field) {
            header.classList.add(state.sort.ascending ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// Data Validation
function validateData(episodes) {
    state.warnings.items = [];
    const ranks = new Set();
    const currentDate = new Date();

    episodes.forEach((episode, index) => {
        // Check required fields
        ['title', 'series', 'era', 'broadcast_date', 'doctor'].forEach(field => {
            if (!episode[field]) {
                addWarning(`Episode ${index + 1}: Missing required field "${field}"`);
            }
        });

        // Check future dates
        const episodeDate = new Date(episode.broadcast_date);
        if (episodeDate > currentDate) {
            addWarning(`Episode "${episode.title}": Future broadcast date ${episode.broadcast_date}`);
        }

        // Check duplicate ranks
        if (ranks.has(episode.rank)) {
            addWarning(`Duplicate rank ${episode.rank} for episode "${episode.title}"`);
        }
        ranks.add(episode.rank);

        // Check negative/invalid ranks
        if (episode.rank < 0) {
            addWarning(`Negative rank ${episode.rank} for episode "${episode.title}"`);
        }

        // Check negative series numbers
        if (episode.series < 0) {
            addWarning(`Negative series number ${episode.series} for episode "${episode.title}"`);
        }
    });

    state.warnings.count = state.warnings.items.length;
    console.warn(`Found ${state.warnings.count} data validation issues:`, state.warnings.items);
}

function addWarning(message) {
    state.warnings.items.push(message);
}

// Update warnings display in UI
function updateWarningsDisplay() {
    let warningDisplay = document.getElementById('warning-count');
    if (!warningDisplay) {
        // Create warning count display if it doesn't exist
        const header = document.querySelector('header');
        const warningElement = document.createElement('div');
        warningElement.id = 'warning-count';
        warningElement.className = 'warning-badge';
        header.appendChild(warningElement);
        warningDisplay = warningElement;
    }

    if (state.warnings.count > 0) {
        warningDisplay.innerHTML = `⚠️ <span>${state.warnings.count}</span> data issues found`;
        warningDisplay.style.display = 'block';
        warningDisplay.title = state.warnings.items.join('\n');
        warningDisplay.style.cursor = 'help';
    } else {
        warningDisplay.style.display = 'none';
    }
}

// Apply all filters and sort results
function applyFilters() {
    // Start with all episodes
    let filtered = [...state.episodes];

    // Apply name filter with smart relevance if there's a search term
    const searchTerm = state.filters.name.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(episode => {
            const searchFields = [
                episode.title,
                episode.director,
                episode.writer,
                episode.era,
                episode.doctor?.actor,
                episode.doctor?.incarnation,
                episode.companion?.actor,
                episode.companion?.character,
                String(episode.series)
            ];

            return searchFields.some(field => 
                field?.toString().toLowerCase().includes(searchTerm)
            );
        });

        // Sort by relevance if there's a search term
        filtered.sort((a, b) => {
            const scoreA = getSearchRelevanceScore(a, searchTerm);
            const scoreB = getSearchRelevanceScore(b, searchTerm);
            
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            return a.rank - b.rank;
        });
    }

    // Apply era filter
    if (state.filters.era) {
        filtered = filtered.filter(episode => episode.era === state.filters.era);
    }

    // Apply doctor filter
    if (state.filters.doctor) {
        filtered = filtered.filter(episode => 
            `${episode.doctor.actor} (${episode.doctor.incarnation})` === state.filters.doctor
        );
    }

    // Apply companion filter
    if (state.filters.companion) {
        filtered = filtered.filter(episode => 
            episode.companion && 
            `${episode.companion.actor} (${episode.companion.character})` === state.filters.companion
        );
    }

    // Update state and display
    state.filtered = filtered;

    // Update the no results message
    const noResults = document.getElementById('no-results');
    if (noResults) {
        if (state.filtered.length === 0) {
            const activeFilters = Object.entries(state.filters)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            noResults.textContent = `No episodes found matching filters (${activeFilters})`;
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }
    }

    // Display the filtered results
    displayEpisodes(state.filtered);
}

// Calculate search relevance score
function getSearchRelevanceScore(episode, searchTerm) {
    if (!searchTerm) return 0;
    
    let score = 0;
    const term = searchTerm.toLowerCase();
    
    // 1. Exact title match (highest priority)
    if (episode.title.toLowerCase() === term) {
        score += 100;
    }
    // 2. Title starts with search term
    else if (episode.title.toLowerCase().startsWith(term)) {
        score += 75;
    }
    // 3. Title contains search term as a word
    else if (episode.title.toLowerCase().includes(` ${term}`) || 
             episode.title.toLowerCase().includes(`${term} `)) {
        score += 50;
    }
    // 4. Title contains search term anywhere
    else if (episode.title.toLowerCase().includes(term)) {
        score += 25;
    }
    
    // 5. Check other important fields
    const primaryFields = [
        episode.doctor?.actor,
        episode.doctor?.incarnation,
        episode.companion?.actor,
        episode.companion?.character
    ];

    primaryFields.forEach(field => {
        if (field?.toLowerCase() === term) score += 20;
        else if (field?.toLowerCase()?.includes(term)) score += 10;
    });

    // 6. Check secondary fields
    const secondaryFields = [
        episode.director,
        episode.writer,
        episode.era,
        String(episode.series)
    ];

    secondaryFields.forEach(field => {
        if (field?.toLowerCase()?.includes(term)) score += 5;
    });

    return score;
}

// Utility Functions
function formatDate(date) {
    // TODO: Implement date formatting
    // Handle multiple date formats
}

function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    const tableElement = document.getElementById('episodes-table');
    const errorElement = document.getElementById('error');
    
    loadingElement.style.display = show ? 'block' : 'none';
    tableElement.style.display = show ? 'none' : 'block';
    errorElement.style.display = 'none'; // Hide error when loading
}

function showError(message, details = '') {
    const loadingElement = document.getElementById('loading');
    const tableElement = document.getElementById('episodes-table');
    const errorElement = document.getElementById('error');
    
    errorElement.innerHTML = `
        <div class="error-message">
            <div class="error-title">
                <strong>Error:</strong> ${escapeHtml(message)}
            </div>
            ${details ? `<div class="error-details">${escapeHtml(details)}</div>` : ''}
            <div class="error-actions">
                <button onclick="retryLoading()" class="retry-button">Retry Loading</button>
                <button onclick="loadLocalFallback()" class="fallback-button">Use Local Data</button>
            </div>
        </div>
    `;
    
    loadingElement.style.display = 'none';
    tableElement.style.display = 'none';
    errorElement.style.display = 'block';
}

function retryLoading() {
    loadEpisodes(); // Retry loading data
}

document.addEventListener('DOMContentLoaded', init);
