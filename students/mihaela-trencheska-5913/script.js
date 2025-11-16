// Configuration
const CONFIG = {
    // Alternative 1: Single comprehensive file
    SINGLE_DATA_URL: 'https://raw.githubusercontent.com/sweko/internet-programming-data/main/data/doctor-who-episodes-full.json',
    
    // Alternative 2: Multiple files (bonus points)
    MULTI_DATA_URLS: [
        'https://raw.githubusercontent.com/sweko/internet-programming-data/main/data/doctor-who-episodes-01-10.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-data/main/data/doctor-who-episodes-11-20.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-data/main/data/doctor-who-episodes-21-30.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-data/main/data/doctor-who-episodes-31-40.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-data/main/data/doctor-who-episodes-41-50.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-data/main/data/doctor-who-episodes-51-65.json'
    ],

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
    episodes: [],
    filtered: [],
    loading: true,
    error: null,
    sort: {
        primary: { field: 'rank', direction: 'asc', type: 'number' },
        secondary: [],
        useMultiSort: false
    },
    filters: {
        title: '',
        era: '',
        doctor: '',
        companion: '',
        series: '',
        year: ''
    },
    uniqueValues: {
        doctors: new Set(),
        companions: new Set(),
        series: new Set(),
        eras: new Set()
    },
    dataWarnings: [],
    dataSource: 'unknown'
};

// Initialize Application
async function init() {
    console.log('🚀 Initializing Doctor Who Episodes Explorer...');
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Filter inputs
    document.getElementById('title-filter').addEventListener('input', debounce((e) => {
        state.filters.title = e.target.value;
        applyFiltersAndSort();
    }, 300));

    document.getElementById('era-filter').addEventListener('change', (e) => {
        state.filters.era = e.target.value;
        applyFiltersAndSort();
    });

    document.getElementById('doctor-filter').addEventListener('change', (e) => {
        state.filters.doctor = e.target.value;
        applyFiltersAndSort();
    });

    document.getElementById('companion-filter').addEventListener('change', (e) => {
        state.filters.companion = e.target.value;
        applyFiltersAndSort();
    });

    document.getElementById('series-filter').addEventListener('change', (e) => {
        state.filters.series = e.target.value;
        applyFiltersAndSort();
    });

    document.getElementById('year-filter').addEventListener('input', debounce((e) => {
        state.filters.year = e.target.value ? parseInt(e.target.value) : '';
        applyFiltersAndSort();
    }, 300));

    // Control buttons
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('clear-sort').addEventListener('click', clearAllSorting);

    // Sort headers
    document.querySelectorAll('#episodes-table th[data-sort]').forEach(th => {
        th.addEventListener('click', (e) => {
            const field = e.currentTarget.getAttribute('data-sort');
            const type = e.currentTarget.getAttribute('data-sort-type');
            const isShiftPressed = e.shiftKey;
            
            if (isShiftPressed) {
                handleMultiSort(field, type);
            } else {
                handlePrimarySort(field, type);
            }
        });
    });

    console.log('✅ Event listeners setup complete');
}

// Data Loading with Both Alternatives
async function loadEpisodes() {
    try {
        showLoading(true);
        state.error = null;
        
        console.log('📥 Loading episode data...');
        
        let loadedData = null;
        
        // Try Alternative 2 first (bonus points - multiple URLs)
        console.log('🔄 Attempting Alternative 2: Multiple URL loading (bonus points)...');
        loadedData = await loadFromMultipleSources();
        
        // If Alternative 2 fails, try Alternative 1
        if (!loadedData || loadedData.length === 0) {
            console.log('🔄 Alternative 2 failed, attempting Alternative 1: Single URL...');
            loadedData = await loadFromSingleSource();
        }
        
        // If both alternatives fail, use comprehensive sample data
        if (!loadedData || loadedData.length === 0) {
            console.log('🔄 Both alternatives failed, using comprehensive sample data...');
            loadedData = getComprehensiveSampleData();
            state.dataSource = 'sample';
        }

        if (!loadedData || !Array.isArray(loadedData)) {
            throw new Error('No valid episode data could be loaded from any source');
        }

        console.log(`✅ Successfully loaded ${loadedData.length} episodes from ${state.dataSource}`);
        state.episodes = transformEpisodeData(loadedData);
        
        populateFilters();
        applyFiltersAndSort();
        validateData();
        
    } catch (error) {
        console.error('❌ Error in loadEpisodes:', error);
        showError('Failed to load episode data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Alternative 2: Load from multiple URLs (bonus points)
async function loadFromMultipleSources() {
    const allEpisodes = [];
    let successfulLoads = 0;

    console.log(`🔄 Loading data from ${CONFIG.MULTI_DATA_URLS.length} sources...`);

    for (let i = 0; i < CONFIG.MULTI_DATA_URLS.length; i++) {
        const source = CONFIG.MULTI_DATA_URLS[i];
        try {
            console.log(`📡 Fetching from: ${source}`);
            
            const response = await fetch(source);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data && Array.isArray(data)) {
                console.log(`✅ Successfully loaded ${data.length} episodes from source ${i + 1}`);
                allEpisodes.push(...data);
                successfulLoads++;
            } else {
                throw new Error('Invalid data format - not an array');
            }
            
        } catch (error) {
            console.warn(`❌ Failed to load from source ${i + 1}:`, error.message);
        }
    }
    
    console.log(`📊 Multiple URL loading results:`);
    console.log(`   ✅ Successful: ${successfulLoads}/${CONFIG.MULTI_DATA_URLS.length} successful`);
    console.log(`   📁 Total episodes: ${allEpisodes.length}`);
    
    if (successfulLoads > 0) {
        state.dataSource = `multiple-urls (${successfulLoads}/${CONFIG.MULTI_DATA_URLS.length} successful)`;
        return allEpisodes;
    }
    
    return null;
}

// Alternative 1: Load from single URL
async function loadFromSingleSource() {
    try {
        console.log(`📡 Fetching from single source: ${CONFIG.SINGLE_DATA_URL}`);
        
        // Add cache busting
        const url = CONFIG.SINGLE_DATA_URL + '?t=' + new Date().getTime();
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
            console.log(`✅ Successfully loaded ${data.length} episodes from single source`);
            state.dataSource = 'single-url';
            return data;
        } else {
            throw new Error('Invalid data format - not an array');
        }
        
    } catch (error) {
        console.warn(`❌ Failed to load from single source:`, error.message);
        return null;
    }
}

// Data Transformation
function transformEpisodeData(episodes) {
    return episodes.map(episode => {
        // Handle broadcast date parsing
        const broadcastYear = parseBroadcastYear(episode.broadcast_date);
        
        // Handle doctor formatting
        const doctorDisplay = episode.doctor ? 
            `${episode.doctor.actor} (${episode.doctor.incarnation})` : 'Unknown';
        
        // Handle companion formatting with null check
        const companionDisplay = episode.companion ? 
            `${episode.companion.actor} (${episode.companion.character})` : 'None';
        
        // Handle cast count with empty array check
        const castCount = episode.cast ? episode.cast.length : 0;
        
        // Handle multiple writers
        const writerDisplay = formatWriters(episode.writer);
        
        return {
            ...episode,
            broadcast_year: broadcastYear,
            doctor_display: doctorDisplay,
            companion_display: companionDisplay,
            cast_count: castCount,
            writer_display: writerDisplay,
            _doctor_actor: episode.doctor?.actor || '',
            _companion_actor: episode.companion?.actor || '',
            _companion_character: episode.companion?.character || ''
        };
    });
}

// Date Parsing with Multiple Format Support
function parseBroadcastYear(dateString) {
    if (!dateString) return 0;
    
    // Try different date formats
    const formats = [
        /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
        /^(\w+) (\d{1,2}), (\d{4})$/, // Month DD, YYYY
        /^(\d{4})$/ // YYYY
    ];
    
    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            if (format.source === /^(\d{4})$/.source) {
                return parseInt(match[1]);
            } else {
                return parseInt(match[match.length - 1]);
            }
        }
    }
    
    // Fallback to Date object parsing
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.getFullYear();
        }
    } catch (e) {
        console.warn(`Could not parse date: ${dateString}`);
    }
    
    return 0;
}

// Writer Formatting
function formatWriters(writerString) {
    if (!writerString) return 'Unknown';
    return writerString
        .replace(/\s+&\s+/g, ', ')
        .replace(/\s+and\s+/g, ', ');
}

// Populate Filter Dropdowns
function populateFilters() {
    // Clear existing sets
    state.uniqueValues.doctors.clear();
    state.uniqueValues.companions.clear();
    state.uniqueValues.series.clear();
    state.uniqueValues.eras.clear();

    // Collect unique values from all episodes
    state.episodes.forEach(episode => {
        if (episode.doctor?.actor) {
            state.uniqueValues.doctors.add(episode.doctor.actor);
        }
        if (episode.companion?.actor) {
            state.uniqueValues.companions.add(episode.companion.actor);
        }
        if (episode.series !== undefined && episode.series !== null) {
            state.uniqueValues.series.add(episode.series);
        }
        if (episode.era) {
            state.uniqueValues.eras.add(episode.era);
        }
    });

    // Populate Doctor filter
    const doctorFilter = document.getElementById('doctor-filter');
    const doctorOptions = ['<option value="">All Doctors</option>'];
    Array.from(state.uniqueValues.doctors).sort().forEach(doctor => {
        doctorOptions.push(`<option value="${escapeHtml(doctor)}">${escapeHtml(doctor)}</option>`);
    });
    doctorFilter.innerHTML = doctorOptions.join('');

    // Populate Companion filter
    const companionFilter = document.getElementById('companion-filter');
    const companionOptions = ['<option value="">All Companions</option>'];
    Array.from(state.uniqueValues.companions).sort().forEach(companion => {
        companionOptions.push(`<option value="${escapeHtml(companion)}">${escapeHtml(companion)}</option>`);
    });
    companionFilter.innerHTML = companionOptions.join('');

    // Populate Series filter
    const seriesFilter = document.getElementById('series-filter');
    const seriesOptions = ['<option value="">All Series</option>'];
    Array.from(state.uniqueValues.series).sort((a, b) => a - b).forEach(series => {
        seriesOptions.push(`<option value="${series}">Series ${series}</option>`);
    });
    seriesFilter.innerHTML = seriesOptions.join('');

    console.log('✅ Filters populated:', {
        doctors: state.uniqueValues.doctors.size,
        companions: state.uniqueValues.companions.size,
        series: state.uniqueValues.series.size,
        eras: state.uniqueValues.eras.size
    });
}

// Apply Filters and Sorting
function applyFiltersAndSort() {
    state.filtered = filterEpisodes(state.episodes);
    state.filtered = sortEpisodes(state.filtered);
    displayEpisodes(state.filtered);
    updateStats();
    updateSortIndicators();
}

// Filtering Logic
function filterEpisodes(episodes) {
    return episodes.filter(episode => {
        // Title filter (smart search across multiple fields)
        if (state.filters.title) {
            const searchTerm = state.filters.title.toLowerCase();
            const searchableFields = [
                episode.title,
                episode._doctor_actor,
                episode._companion_actor,
                episode._companion_character,
                episode.writer_display,
                episode.director
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (!searchableFields.includes(searchTerm)) {
                return false;
            }
        }
        
        // Era filter
        if (state.filters.era && episode.era !== state.filters.era) {
            return false;
        }
        
        // Doctor filter
        if (state.filters.doctor && episode._doctor_actor !== state.filters.doctor) {
            return false;
        }
        
        // Companion filter
        if (state.filters.companion && episode._companion_actor !== state.filters.companion) {
            return false;
        }
        
        // Series filter
        if (state.filters.series && episode.series.toString() !== state.filters.series) {
            return false;
        }
        
        // Year filter
        if (state.filters.year && episode.broadcast_year !== state.filters.year) {
            return false;
        }
        
        return true;
    });
}

// Sorting Logic
function sortEpisodes(episodes) {
    if (state.sort.useMultiSort && state.sort.secondary.length > 0) {
        return multiSortEpisodes(episodes);
    } else {
        return singleSortEpisodes(episodes, state.sort.primary);
    }
}

function singleSortEpisodes(episodes, sortConfig) {
    return [...episodes].sort((a, b) => {
        let aValue = a[sortConfig.field];
        let bValue = b[sortConfig.field];
        
        return compareValues(aValue, bValue, sortConfig.direction, sortConfig.type);
    });
}

function multiSortEpisodes(episodes) {
    return [...episodes].sort((a, b) => {
        let comparison = compareValues(
            a[state.sort.primary.field],
            b[state.sort.primary.field],
            state.sort.primary.direction,
            state.sort.primary.type
        );
        
        if (comparison === 0) {
            for (const secondarySort of state.sort.secondary) {
                comparison = compareValues(
                    a[secondarySort.field],
                    b[secondarySort.field],
                    secondarySort.direction,
                    secondarySort.type
                );
                if (comparison !== 0) break;
            }
        }
        
        return comparison;
    });
}

function compareValues(a, b, direction, type) {
    if (a == null) a = type === 'string' ? '' : 0;
    if (b == null) b = type === 'string' ? '' : 0;
    
    let result = 0;
    
    if (type === 'number') {
        result = (a || 0) - (b || 0);
    } else {
        const aStr = String(a || '').toLowerCase();
        const bStr = String(b || '').toLowerCase();
        result = aStr.localeCompare(bStr);
    }
    
    return direction === 'desc' ? -result : result;
}

// Sort Handlers
function handlePrimarySort(field, type) {
    if (state.sort.primary.field === field) {
        state.sort.primary.direction = state.sort.primary.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.primary.field = field;
        state.sort.primary.direction = 'asc';
        state.sort.primary.type = type;
    }
    
    state.sort.useMultiSort = false;
    state.sort.secondary = [];
    applyFiltersAndSort();
}

function handleMultiSort(field, type) {
    const existingIndex = state.sort.secondary.findIndex(sort => sort.field === field);
    
    if (existingIndex >= 0) {
        if (state.sort.secondary[existingIndex].direction === 'asc') {
            state.sort.secondary[existingIndex].direction = 'desc';
        } else {
            state.sort.secondary.splice(existingIndex, 1);
        }
    } else {
        state.sort.secondary.push({
            field,
            direction: 'asc',
            type
        });
    }
    
    state.sort.useMultiSort = state.sort.secondary.length > 0;
    applyFiltersAndSort();
}

function clearAllSorting() {
    state.sort = {
        primary: { field: 'rank', direction: 'asc', type: 'number' },
        secondary: [],
        useMultiSort: false
    };
    applyFiltersAndSort();
}

// Display Functions
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    const table = document.getElementById('episodes-table');
    const noResults = document.getElementById('no-results');
    
    if (episodes.length === 0) {
        table.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }
    
    table.classList.remove('hidden');
    noResults.classList.add('hidden');
    
    tbody.innerHTML = episodes.map((episode, index) => `
        <tr data-episode-id="${episode.rank}" tabindex="0">
            <td>${episode.rank}</td>
            <td>${escapeHtml(episode.title)}</td>
            <td>${episode.series}</td>
            <td><span class="era-badge ${episode.era?.toLowerCase() || ''}">${escapeHtml(episode.era || 'Unknown')}</span></td>
            <td>${episode.broadcast_year || 'Unknown'}</td>
            <td>${escapeHtml(episode.director || 'Unknown')}</td>
            <td class="writer-display">${escapeHtml(episode.writer_display)}</td>
            <td class="doctor-display">${escapeHtml(episode.doctor_display)}</td>
            <td class="companion-display">${escapeHtml(episode.companion_display)}</td>
            <td><span class="cast-count">${episode.cast_count}</span></td>
        </tr>
    `).join('');
    
    console.log(`✅ Displayed ${episodes.length} episodes`);
}

// Update Statistics
function updateStats() {
    document.getElementById('total-episodes').textContent = state.episodes.length;
    document.getElementById('filtered-episodes').textContent = state.filtered.length;
    document.getElementById('warning-count').textContent = state.dataWarnings.length;
    
    const tableInfo = document.getElementById('table-info');
    let sourceInfo = '';
    
    if (state.dataSource.includes('multiple-urls')) {
        sourceInfo = ' (Bonus: Multi-URL Loading)';
    } else if (state.dataSource === 'single-url') {
        sourceInfo = ' (Single URL Loading)';
    } else if (state.dataSource === 'sample') {
        sourceInfo = ' (Sample Data)';
    }
    
    if (state.filtered.length === state.episodes.length) {
        tableInfo.textContent = `Showing all ${state.episodes.length} episodes${sourceInfo}`;
    } else {
        tableInfo.textContent = `Showing ${state.filtered.length} of ${state.episodes.length} episodes${sourceInfo}`;
    }
}

// Update Sort Indicators
function updateSortIndicators() {
    document.querySelectorAll('#episodes-table th[data-sort]').forEach(th => {
        const field = th.getAttribute('data-sort');
        
        // Reset all sort classes
        th.classList.remove('sort-asc', 'sort-desc');
        
        // Primary sort indicator
        if (field === state.sort.primary.field) {
            th.classList.add(state.sort.primary.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
        
        // Secondary sort indicators (visual feedback for multi-sort)
        const secondaryIndex = state.sort.secondary.findIndex(sort => sort.field === field);
        if (secondaryIndex >= 0) {
            th.classList.add(state.sort.secondary[secondaryIndex].direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
    
    // Update multi-sort info panel
    const multiSortInfo = document.getElementById('multi-sort-info');
    const multiSortList = document.getElementById('multi-sort-list');
    
    if (state.sort.useMultiSort && state.sort.secondary.length > 0) {
        const sortList = [
            `${state.sort.primary.field} (${state.sort.primary.direction})`
        ].concat(
            state.sort.secondary.map(sort => 
                `${sort.field} (${sort.direction})`
            )
        ).join(' → ');
        
        multiSortList.textContent = sortList;
        multiSortInfo.classList.remove('hidden');
    } else {
        multiSortInfo.classList.add('hidden');
    }
}

// Reset Filters
function resetFilters() {
    state.filters = {
        title: '',
        era: '',
        doctor: '',
        companion: '',
        series: '',
        year: ''
    };
    
    document.getElementById('title-filter').value = '';
    document.getElementById('era-filter').value = '';
    document.getElementById('doctor-filter').value = '';
    document.getElementById('companion-filter').value = '';
    document.getElementById('series-filter').value = '';
    document.getElementById('year-filter').value = '';
    
    applyFiltersAndSort();
}

// Export to CSV
function exportToCSV() {
    if (state.filtered.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['Rank', 'Title', 'Series', 'Era', 'Year', 'Director', 'Writer', 'Doctor', 'Companion', 'Cast Count'];
    const csvContent = [
        headers.join(','),
        ...state.filtered.map(episode => [
            episode.rank,
            `"${escapeCsv(episode.title)}"`,
            episode.series,
            `"${escapeCsv(episode.era)}"`,
            episode.broadcast_year,
            `"${escapeCsv(episode.director || '')}"`,
            `"${escapeCsv(episode.writer_display)}"`,
            `"${escapeCsv(episode.doctor_display)}"`,
            `"${escapeCsv(episode.companion_display)}"`,
            episode.cast_count
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-who-episodes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log(`📤 Exported ${state.filtered.length} episodes to CSV`);
}

// Data Validation
function validateData() {
    state.dataWarnings = [];
    const currentYear = new Date().getFullYear();
    
    state.episodes.forEach(episode => {
        // Missing required fields
        if (!episode.title) {
            state.dataWarnings.push(`Episode rank ${episode.rank} missing title`);
        }
        
        if (!episode.series) {
            state.dataWarnings.push(`Episode "${episode.title}" missing series number`);
        }
        
        // Future broadcast dates
        if (episode.broadcast_year > currentYear) {
            state.dataWarnings.push(`Episode "${episode.title}" has future broadcast year: ${episode.broadcast_year}`);
        }
        
        // Negative series numbers
        if (episode.series < 0) {
            state.dataWarnings.push(`Episode "${episode.title}" has negative series number: ${episode.series}`);
        }
        
        // Invalid ranks
        if (episode.rank <= 0) {
            state.dataWarnings.push(`Episode "${episode.title}" has invalid rank: ${episode.rank}`);
        }
    });
    
    // Check for duplicate ranks
    const rankCounts = {};
    state.episodes.forEach(episode => {
        rankCounts[episode.rank] = (rankCounts[episode.rank] || 0) + 1;
    });
    
    Object.entries(rankCounts).forEach(([rank, count]) => {
        if (count > 1) {
            state.dataWarnings.push(`Duplicate rank ${rank} found for ${count} episodes`);
        }
    });
    
    if (state.dataWarnings.length > 0) {
        console.warn('Data validation warnings:', state.dataWarnings);
    }
    
    updateStats();
}

// Utility Functions
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

function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeCsv(str) {
    if (str == null) return '';
    return String(str).replace(/"/g, '""');
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const table = document.getElementById('episodes-table');
    const error = document.getElementById('error');
    
    if (show) {
        loading.classList.remove('hidden');
        loading.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 1.2em; margin-bottom: 10px;">
                    <i class="fas fa-spinner fa-spin"></i> Loading episodes...
                </div>
                <div style="font-size: 0.9em; color: #666;">
                    Attempting to load from multiple data sources...
                </div>
            </div>
        `;
        table.classList.add('hidden');
        error.classList.add('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

// Comprehensive Sample Data - Fallback if URLs fail
function getComprehensiveSampleData() {
    return [
        {
            "rank": 1,
            "title": "An Unearthly Child",
            "series": 1,
            "era": "Classic",
            "broadcast_date": "1963-11-23",
            "director": "Waris Hussein",
            "writer": "Anthony Coburn",
            "doctor": {
                "actor": "William Hartnell",
                "incarnation": "First Doctor"
            },
            "companion": {
                "actor": "Carole Ann Ford",
                "character": "Susan Foreman"
            },
            "cast": [
                {"actor": "William Hartnell", "character": "First Doctor"},
                {"actor": "Carole Ann Ford", "character": "Susan Foreman"},
                {"actor": "Jacqueline Hill", "character": "Barbara Wright"},
                {"actor": "William Russell", "character": "Ian Chesterton"}
            ]
        },
        {
            "rank": 2,
            "title": "The Daleks",
            "series": 1,
            "era": "Classic",
            "broadcast_date": "1963-12-21",
            "director": "Christopher Barry",
            "writer": "Terry Nation",
            "doctor": {
                "actor": "William Hartnell",
                "incarnation": "First Doctor"
            },
            "companion": {
                "actor": "Carole Ann Ford",
                "character": "Susan Foreman"
            },
            "cast": [
                {"actor": "William Hartnell", "character": "First Doctor"},
                {"actor": "Carole Ann Ford", "character": "Susan Foreman"},
                {"actor": "Jacqueline Hill", "character": "Barbara Wright"},
                {"actor": "William Russell", "character": "Ian Chesterton"}
            ]
        }
    ];
}

// Initialize application
document.addEventListener('DOMContentLoaded', init);