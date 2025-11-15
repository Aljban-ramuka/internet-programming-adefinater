// Configuration
const CONFIG = {
    // Alternative 2: Multiple URLs for bonus 5 points
    DATA_URLS: [
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
        ascending: true,   // Sort direction
        levels: []         // Multi-column sort levels (Bonus Feature)
    },
    filters: {
        name: '',          // Current filter value
        era: '',           // Era filter (Bonus Feature)
        doctor: '',        // Doctor filter (Bonus Feature) 
        companion: ''      // Companion filter (Bonus Feature)
    },
    validation: {
        warnings: [],      // Array of validation warnings
        count: 0          // Total warning count
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Name filter input
    const nameFilter = document.getElementById('name-filter');
    if (nameFilter) {
        nameFilter.addEventListener('input', (e) => {
            state.filters.name = e.target.value;
            filterEpisodes();
        });
    }
    
    // Bonus Feature: Enhanced Filter Event Listeners
    const eraFilter = document.getElementById('era-filter');
    if (eraFilter) {
        eraFilter.addEventListener('change', (e) => {
            console.log('Era filter changed to:', e.target.value);
            state.filters.era = e.target.value;
            filterEpisodes();
        });
    } else {
        console.error('Era filter element not found for event listener!');
    }
    
    const doctorFilter = document.getElementById('doctor-filter');
    if (doctorFilter) {
        doctorFilter.addEventListener('change', (e) => {
            console.log('Doctor filter changed to:', e.target.value);
            state.filters.doctor = e.target.value;
            filterEpisodes();
        });
    } else {
        console.error('Doctor filter element not found for event listener!');
    }
    
    const companionFilter = document.getElementById('companion-filter');
    if (companionFilter) {
        companionFilter.addEventListener('change', (e) => {
            console.log('Companion filter changed to:', e.target.value);
            state.filters.companion = e.target.value;
            filterEpisodes();
        });
    } else {
        console.error('Companion filter element not found for event listener!');
    }
    
    // Table header clicks for sorting (with multi-column support)
    const tableHeaders = document.querySelectorAll('th[data-sort]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            const sortField = e.target.getAttribute('data-sort');
            if (sortField) {
                // Bonus Feature: Multi-column Sort (Shift+Click)
                const isMultiSort = e.shiftKey;
                sortEpisodes(sortField, isMultiSort);
            }
        });
    });
    
    // Data validation show warnings button (Tier 3 Feature)
    const showWarningsBtn = document.getElementById('show-warnings');
    if (showWarningsBtn) {
        showWarningsBtn.addEventListener('click', () => {
            showValidationDetails();
        });
    }
    
    // Clear error messages when user interacts
    document.addEventListener('click', () => {
        if (state.error && document.getElementById('error').style.display !== 'none') {
            const errorElement = document.getElementById('error');
            if (errorElement.style.display !== 'none') {
                errorElement.style.display = 'none';
            }
        }
    });
    
    // Add keyboard shortcut instructions
    console.log('🎯 Multi-column Sort: Hold Shift and click column headers to add multiple sort levels');
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        state.error = null;
        
        console.log('Loading episodes from multiple sources...');
        
        // Fetch all URLs concurrently for better performance
        const fetchPromises = CONFIG.DATA_URLS.map(async (url, index) => {
            try {
                console.log(`Fetching batch ${index + 1}/${CONFIG.DATA_URLS.length}: ${url}`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
                }
                
                const data = await response.json();
                
                // Handle different JSON structures for each batch
                let episodes;
                if (Array.isArray(data)) {
                    episodes = data;
                } else if (data && Array.isArray(data.episodes)) {
                    episodes = data.episodes;
                } else if (data && Array.isArray(data.data)) {
                    episodes = data.data;
                } else if (data && typeof data === 'object') {
                    // Try to find an array property in the object
                    const arrayProperty = Object.values(data).find(value => Array.isArray(value));
                    if (arrayProperty) {
                        episodes = arrayProperty;
                    } else {
                        console.warn(`No episode array found in batch ${index + 1}`);
                        return [];
                    }
                } else {
                    console.warn(`Invalid data format in batch ${index + 1}`);
                    return [];
                }
                
                console.log(`Loaded ${episodes.length} episodes from batch ${index + 1}`);
                return episodes;
                
            } catch (error) {
                console.error(`Failed to load batch ${index + 1}:`, error);
                // Return empty array for failed batches to allow partial loading
                return [];
            }
        });
        
        // Wait for all fetch operations to complete
        const episodeBatches = await Promise.all(fetchPromises);
        
        // Combine all episode arrays
        const allEpisodes = episodeBatches.flat();
        
        if (allEpisodes.length === 0) {
            throw new Error('No episodes could be loaded from any source');
        }
        
        // Remove duplicates based on rank (in case there are overlaps)
        const uniqueEpisodes = allEpisodes.filter((episode, index, array) => 
            index === array.findIndex(e => e.rank === episode.rank)
        );
        
        console.log(`Successfully loaded ${uniqueEpisodes.length} unique episodes from ${CONFIG.DATA_URLS.length} sources`);
        
        state.episodes = uniqueEpisodes;
        state.filtered = [...uniqueEpisodes];
        
        // Tier 3: Data Validation (5 points)
        validateEpisodeData(uniqueEpisodes);
        
        // Bonus Feature: Populate Enhanced Filters (5 points)
        populateEnhancedFilters(uniqueEpisodes);
        
        // Initial display with default sorting
        sortEpisodes('rank');
        
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
    
    // Clear existing content
    tbody.innerHTML = '';
    
    if (!episodes || episodes.length === 0) {
        table.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    // Show table and hide no results message
    table.style.display = 'table';
    noResults.style.display = 'none';
    
    // Create rows for each episode
    episodes.forEach(episode => {
        const row = document.createElement('tr');
        
        // Create cells with proper formatting and edge case handling
        row.innerHTML = `
            <td>${episode.rank || '—'}</td>
            <td>${escapeHtml(episode.title) || 'Unknown Title'}</td>
            <td>${episode.series || '—'}</td>
            <td>${escapeHtml(episode.era) || '—'}</td>
            <td>${formatDate(episode.broadcast_date)}</td>
            <td>${escapeHtml(episode.director) || 'Unknown'}</td>
            <td>${escapeHtml(formatWriter(episode.writer))}</td>
            <td>${escapeHtml(formatDoctor(episode.doctor))}</td>
            <td>${escapeHtml(formatCompanion(episode.companion))}</td>
            <td><span class="cast-count">${formatCastCount(episode.cast)}</span></td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update sort indicators
    updateSortIndicators();
}

// Sorting Functions
function sortEpisodes(field, isMultiSort = false) {
    if (!isMultiSort) {
        // Single column sort (traditional behavior)
        if (state.sort.field === field) {
            state.sort.ascending = !state.sort.ascending;
        } else {
            state.sort.field = field;
            state.sort.ascending = true;
        }
        
        // Clear multi-sort levels for single sort
        state.sort.levels = [];
    } else {
        // Bonus Feature: Multi-column Sort
        handleMultiColumnSort(field);
    }
    
    // Apply sorting
    if (state.sort.levels.length > 0) {
        // Multi-column sort
        applyMultiColumnSort();
    } else {
        // Single column sort
        applySingleColumnSort(field);
    }
    
    // Update display
    displayEpisodes(state.filtered);
}

// Bonus Feature: Multi-column Sort (5 points)
function handleMultiColumnSort(field) {
    // Check if field is already in sort levels
    const existingIndex = state.sort.levels.findIndex(level => level.field === field);
    
    if (existingIndex >= 0) {
        // Field exists, toggle direction or remove if desc->asc cycle complete
        const existing = state.sort.levels[existingIndex];
        if (existing.ascending) {
            existing.ascending = false;
        } else {
            // Remove from multi-sort
            state.sort.levels.splice(existingIndex, 1);
        }
    } else {
        // Add new sort level
        state.sort.levels.push({
            field: field,
            ascending: true
        });
    }
    
    // Update primary sort to match first level
    if (state.sort.levels.length > 0) {
        const primary = state.sort.levels[0];
        state.sort.field = primary.field;
        state.sort.ascending = primary.ascending;
    }
}

function applyMultiColumnSort() {
    state.filtered.sort((a, b) => {
        // Apply each sort level in order
        for (const level of state.sort.levels) {
            const comparison = compareSortValues(a, b, level.field);
            if (comparison !== 0) {
                return level.ascending ? comparison : -comparison;
            }
        }
        return 0;
    });
}

function applySingleColumnSort(field) {
    state.filtered.sort((a, b) => {
        const comparison = compareSortValues(a, b, field);
        return state.sort.ascending ? comparison : -comparison;
    });
}

function compareSortValues(a, b, field) {
    let valueA, valueB;
    
    switch (field) {
        case 'rank':
        case 'series':
            valueA = parseInt(a[field]) || 0;
            valueB = parseInt(b[field]) || 0;
            break;
            
        case 'broadcast_date':
            valueA = parseDateForSorting(a.broadcast_date);
            valueB = parseDateForSorting(b.broadcast_date);
            break;
            
        case 'doctor':
            valueA = formatDoctor(a.doctor).toLowerCase();
            valueB = formatDoctor(b.doctor).toLowerCase();
            break;
            
        case 'companion':
            valueA = formatCompanion(a.companion).toLowerCase();
            valueB = formatCompanion(b.companion).toLowerCase();
            break;
            
        case 'cast':
            valueA = Array.isArray(a.cast) ? a.cast.length : 0;
            valueB = Array.isArray(b.cast) ? b.cast.length : 0;
            break;
            
        case 'era':
            // Sort by era order defined in config
            valueA = CONFIG.ERA_ORDER.indexOf(a.era) >= 0 ? CONFIG.ERA_ORDER.indexOf(a.era) : 999;
            valueB = CONFIG.ERA_ORDER.indexOf(b.era) >= 0 ? CONFIG.ERA_ORDER.indexOf(b.era) : 999;
            break;
            
        default:
            // String fields
            valueA = (a[field] || '').toString().toLowerCase();
            valueB = (b[field] || '').toString().toLowerCase();
            break;
    }
    
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
}

function updateSortIndicators() {
    // Remove existing sort classes
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc', 'multi-sort');
        th.removeAttribute('data-sort-level');
    });
    
    if (state.sort.levels.length > 1) {
        // Multi-column sort indicators
        state.sort.levels.forEach((level, index) => {
            const header = document.querySelector(`th[data-sort="${level.field}"]`);
            if (header) {
                header.classList.add('multi-sort');
                header.classList.add(level.ascending ? 'sort-asc' : 'sort-desc');
                header.setAttribute('data-sort-level', (index + 1).toString());
            }
        });
    } else if (state.sort.field) {
        // Single column sort indicator
        const currentHeader = document.querySelector(`th[data-sort="${state.sort.field}"]`);
        if (currentHeader) {
            currentHeader.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    }
}

// Filtering Functions
function filterEpisodes() {
    const nameFilter = state.filters.name.toLowerCase().trim();
    const eraFilter = state.filters.era;
    const doctorFilter = state.filters.doctor;
    const companionFilter = state.filters.companion;
    
    console.log('🔍 Filtering with:', { nameFilter, eraFilter, doctorFilter, companionFilter });
    
    // Apply all filters
    state.filtered = state.episodes.filter(episode => {
        // Name filter (case-insensitive, partial match across multiple fields)
        let nameMatch = true;
        if (nameFilter) {
            const title = (episode.title || '').toLowerCase();
            const doctor = formatDoctor(episode.doctor).toLowerCase();
            const companion = formatCompanion(episode.companion).toLowerCase();
            const director = (episode.director || '').toLowerCase();
            const writer = (episode.writer || '').toLowerCase();
            const era = (episode.era || '').toLowerCase();
            
            nameMatch = title.includes(nameFilter) ||
                       doctor.includes(nameFilter) ||
                       companion.includes(nameFilter) ||
                       director.includes(nameFilter) ||
                       writer.includes(nameFilter) ||
                       era.includes(nameFilter);
        }
        
        // Bonus Feature: Enhanced Filters
        const eraMatch = !eraFilter || episode.era === eraFilter;
        const doctorMatch = !doctorFilter || formatDoctor(episode.doctor) === doctorFilter;
        const companionMatch = !companionFilter || formatCompanion(episode.companion) === companionFilter;
        
        // Debug first few episodes
        if (state.episodes.indexOf(episode) < 3) {
            console.log(`Episode "${episode.title}":`, {
                eraMatch: eraMatch,
                doctorMatch: doctorMatch,
                companionMatch: companionMatch,
                episodeEra: episode.era,
                episodeDoctor: formatDoctor(episode.doctor),
                episodeCompanion: formatCompanion(episode.companion)
            });
        }
        
        return nameMatch && eraMatch && doctorMatch && companionMatch;
    });
    
    console.log(`📊 Filtered ${state.filtered.length} episodes from ${state.episodes.length} total`);
    
    // Apply Smart Relevance Sort when name filtering (Tier 3 Feature)
    if (nameFilter) {
        applySmartRelevanceSort(state.filtered, nameFilter);
    }
    
    // Reapply current sort only if no name filter is active (maintains smart sort when filtering)
    if (!nameFilter && (state.sort.field || state.sort.levels.length > 0)) {
        if (state.sort.levels.length > 0) {
            applyMultiColumnSort();
        } else {
            applySingleColumnSort(state.sort.field);
        }
    } else if (!nameFilter) {
        displayEpisodes(state.filtered);
    } else {
        // When name filtering, just display (smart sort already applied)
        displayEpisodes(state.filtered);
    }
}

// Bonus Feature: Enhanced Filters (5 points)
function populateEnhancedFilters(episodes) {
    console.log('🔧 Populating enhanced filters...');
    
    // Populate Era filter
    const eraSelect = document.getElementById('era-filter');
    if (!eraSelect) {
        console.error('Era filter element not found!');
        return;
    }
    
    const eras = [...new Set(episodes.map(ep => ep.era).filter(Boolean))].sort();
    console.log('Found eras:', eras);
    
    // Clear existing options (except the first "All Eras" option)
    while (eraSelect.children.length > 1) {
        eraSelect.removeChild(eraSelect.lastChild);
    }
    
    eras.forEach(era => {
        const option = document.createElement('option');
        option.value = era;
        option.textContent = era;
        eraSelect.appendChild(option);
    });
    
    // Populate Doctor filter
    const doctorSelect = document.getElementById('doctor-filter');
    if (!doctorSelect) {
        console.error('Doctor filter element not found!');
        return;
    }
    
    const doctors = [...new Set(episodes.map(ep => formatDoctor(ep.doctor)).filter(doctor => doctor !== 'Unknown'))].sort();
    console.log('Found doctors:', doctors.length);
    
    // Clear existing options (except the first "All Doctors" option)
    while (doctorSelect.children.length > 1) {
        doctorSelect.removeChild(doctorSelect.lastChild);
    }
    
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor;
        option.textContent = doctor;
        doctorSelect.appendChild(option);
    });
    
    // Populate Companion filter
    const companionSelect = document.getElementById('companion-filter');
    if (!companionSelect) {
        console.error('Companion filter element not found!');
        return;
    }
    
    const companions = [...new Set(episodes.map(ep => formatCompanion(ep.companion)).filter(companion => companion !== '—'))].sort();
    console.log('Found companions:', companions.length);
    
    // Clear existing options (except the first "All Companions" option)
    while (companionSelect.children.length > 1) {
        companionSelect.removeChild(companionSelect.lastChild);
    }
    
    companions.forEach(companion => {
        const option = document.createElement('option');
        option.value = companion;
        option.textContent = companion;
        companionSelect.appendChild(option);
    });
    
    console.log(`✅ Enhanced filters populated: ${eras.length} eras, ${doctors.length} doctors, ${companions.length} companions`);
}

// Tier 3: Smart Relevance Sort (5 points)
function applySmartRelevanceSort(episodes, searchTerm) {
    episodes.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // Calculate relevance scores
        const scoreA = calculateRelevanceScore(a, searchLower);
        const scoreB = calculateRelevanceScore(b, searchLower);
        
        // Sort by relevance score (higher score = more relevant = comes first)
        if (scoreA !== scoreB) {
            return scoreB - scoreA;
        }
        
        // If same relevance, fall back to rank order
        const rankA = parseInt(a.rank) || 0;
        const rankB = parseInt(b.rank) || 0;
        return rankA - rankB;
    });
}

function calculateRelevanceScore(episode, searchTerm) {
    const title = (episode.title || '').toLowerCase();
    const doctor = formatDoctor(episode.doctor).toLowerCase();
    const companion = formatCompanion(episode.companion).toLowerCase();
    const director = (episode.director || '').toLowerCase();
    const writer = (episode.writer || '').toLowerCase();
    const era = (episode.era || '').toLowerCase();
    
    // Scoring system for Smart Relevance Sort
    // 1. Exact title match (highest priority)
    if (title === searchTerm) {
        return 1000;
    }
    
    // 2. Title contains search term (high priority)
    if (title.includes(searchTerm)) {
        // Bonus for title starting with search term
        if (title.startsWith(searchTerm)) {
            return 900;
        }
        return 800;
    }
    
    // 3. Any field contains search term (medium priority)
    let fieldMatches = 0;
    if (doctor.includes(searchTerm)) fieldMatches += 100;
    if (companion.includes(searchTerm)) fieldMatches += 80;
    if (director.includes(searchTerm)) fieldMatches += 60;
    if (writer.includes(searchTerm)) fieldMatches += 60;
    if (era.includes(searchTerm)) fieldMatches += 40;
    
    // Bonus for multiple field matches
    if (fieldMatches > 100) {
        fieldMatches += 50;
    }
    
    return fieldMatches;
}

// Tier 3: Data Validation (5 points)
function validateEpisodeData(episodes) {
    state.validation.warnings = [];
    const currentYear = new Date().getFullYear();
    const seenRanks = new Set();
    
    episodes.forEach((episode, index) => {
        const episodeRef = `Episode ${index + 1} (rank: ${episode.rank})`;
        
        // Check for missing required fields
        if (!episode.title || episode.title.trim() === '') {
            addValidationWarning('Missing Title', `${episodeRef} has no title`);
        }
        
        if (!episode.doctor || !episode.doctor.actor) {
            addValidationWarning('Missing Doctor', `${episodeRef} has no doctor information`);
        }
        
        if (!episode.director || episode.director.trim() === '') {
            addValidationWarning('Missing Director', `${episodeRef} has no director`);
        }
        
        if (!episode.writer || episode.writer.trim() === '') {
            addValidationWarning('Missing Writer', `${episodeRef} has no writer`);
        }
        
        // Check for future broadcast dates
        if (episode.broadcast_date) {
            const episodeDate = parseDateForSorting(episode.broadcast_date);
            if (episodeDate.getFullYear() > currentYear) {
                addValidationWarning('Future Date', `${episodeRef} has a future broadcast date: ${episode.broadcast_date}`);
            }
        }
        
        // Check for duplicate or invalid ranks
        if (episode.rank === null || episode.rank === undefined) {
            addValidationWarning('Missing Rank', `${episodeRef} has no rank`);
        } else {
            const rank = parseInt(episode.rank);
            if (isNaN(rank)) {
                addValidationWarning('Invalid Rank', `${episodeRef} has non-numeric rank: ${episode.rank}`);
            } else if (rank <= 0) {
                addValidationWarning('Invalid Rank', `${episodeRef} has zero or negative rank: ${rank}`);
            } else if (seenRanks.has(rank)) {
                addValidationWarning('Duplicate Rank', `Rank ${rank} appears multiple times`);
            } else {
                seenRanks.add(rank);
            }
        }
        
        // Check for negative series numbers
        if (episode.series !== null && episode.series !== undefined) {
            const series = parseInt(episode.series);
            if (!isNaN(series) && series < 0) {
                addValidationWarning('Negative Series', `${episodeRef} has negative series number: ${series}`);
            }
        }
        
        // Check for suspicious cast data
        if (episode.cast && Array.isArray(episode.cast)) {
            if (episode.cast.length > 50) {
                addValidationWarning('Large Cast', `${episodeRef} has unusually large cast: ${episode.cast.length} members`);
            }
        }
    });
    
    state.validation.count = state.validation.warnings.length;
    updateValidationDisplay();
    updateHeroStats();
    
    // Log warnings to console
    if (state.validation.warnings.length > 0) {
        console.group('🔍 Data Validation Warnings');
        state.validation.warnings.forEach(warning => {
            console.warn(`[${warning.type}] ${warning.message}`);
        });
        console.groupEnd();
    } else {
        console.log('✅ Data validation passed - no warnings found');
    }
}

function addValidationWarning(type, message) {
    state.validation.warnings.push({
        type: type,
        message: message,
        timestamp: new Date().toISOString()
    });
}

function updateValidationDisplay() {
    const validationInfo = document.getElementById('validation-info');
    const warningCount = document.getElementById('warning-count');
    
    if (state.validation.count > 0) {
        validationInfo.style.display = 'flex';
        warningCount.textContent = state.validation.count;
    } else {
        validationInfo.style.display = 'none';
    }
}

function updateHeroStats() {
    // Update episode count
    const totalEpisodesEl = document.getElementById('total-episodes');
    if (totalEpisodesEl) {
        animateNumber(totalEpisodesEl, state.episodes.length, 2000);
    }
    
    // Count unique doctors
    const uniqueDoctors = new Set();
    state.episodes.forEach(episode => {
        if (episode.doctor && episode.doctor.actor) {
            uniqueDoctors.add(episode.doctor.actor);
        }
    });
    
    const totalDoctorsEl = document.getElementById('total-doctors');
    if (totalDoctorsEl) {
        animateNumber(totalDoctorsEl, uniqueDoctors.size, 2500);
    }
    
    // Calculate year span
    const years = state.episodes
        .map(episode => {
            if (episode.broadcast_date) {
                const date = parseDateForSorting(episode.broadcast_date);
                return date ? date.getFullYear() : null;
            }
            return null;
        })
        .filter(year => year !== null);
    
    const yearSpan = years.length > 0 ? Math.max(...years) - Math.min(...years) + 1 : 0;
    
    const totalYearsEl = document.getElementById('total-years');
    if (totalYearsEl) {
        animateNumber(totalYearsEl, yearSpan, 3000);
    }
}

function animateNumber(element, target, duration) {
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (target - start) * easeOutQuart);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}

function showValidationDetails() {
    if (state.validation.warnings.length === 0) {
        alert('No validation warnings found!');
        return;
    }
    
    // Show modal
    const modal = document.getElementById('validation-modal');
    const modalWarningCount = document.getElementById('modal-warning-count');
    const modalEpisodeCount = document.getElementById('modal-episode-count');
    const detailsContent = document.getElementById('validation-details-content');
    
    // Update summary
    modalWarningCount.textContent = state.validation.count;
    modalEpisodeCount.textContent = state.episodes.length;
    
    // Group warnings by type
    const groupedWarnings = {};
    state.validation.warnings.forEach(warning => {
        if (!groupedWarnings[warning.type]) {
            groupedWarnings[warning.type] = [];
        }
        groupedWarnings[warning.type].push(warning.message);
    });
    
    // Create detailed warning content
    let detailsHTML = '';
    Object.keys(groupedWarnings).forEach(type => {
        detailsHTML += `
            <div class="warning-group">
                <div class="warning-type-header">
                    <span class="warning-type-title">${type}</span>
                    <span class="warning-type-count">${groupedWarnings[type].length}</span>
                </div>
                <ul class="warning-list">
                    ${groupedWarnings[type].map(message => `
                        <li class="warning-item">
                            <span class="warning-bullet">•</span>
                            <span class="warning-message">${message}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    });
    
    detailsContent.innerHTML = detailsHTML;
    modal.style.display = 'flex';
    
    // Add event listeners for modal
    const closeModal = () => {
        modal.style.display = 'none';
    };
    
    document.getElementById('close-modal').onclick = closeModal;
    document.getElementById('close-modal-btn').onclick = closeModal;
    
    // Copy report functionality
    document.getElementById('copy-report').onclick = () => {
        let reportText = `Data Validation Report (${state.validation.count} warnings found)\n\n`;
        Object.keys(groupedWarnings).forEach(type => {
            reportText += `${type} (${groupedWarnings[type].length}):\n`;
            groupedWarnings[type].forEach(message => {
                reportText += `  • ${message}\n`;
            });
            reportText += '\n';
        });
        
        navigator.clipboard.writeText(reportText).then(() => {
            const btn = document.getElementById('copy-report');
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        });
    };
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Close on Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        // Handle different date formats
        let date;
        
        if (dateString.match(/^\d{4}$/)) {
            // Year only format: "1963"
            return dateString;
        } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // ISO format: "1963-11-23"
            date = new Date(dateString);
        } else if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            // UK format: "23/11/1963"
            const [day, month, year] = dateString.split('/');
            date = new Date(year, month - 1, day);
        } else if (dateString.match(/^[A-Za-z]+ \d{1,2}, \d{4}$/)) {
            // Long format: "November 23, 1963"
            date = new Date(dateString);
        } else {
            // Try to parse as-is
            date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        // Return formatted date: "Nov 23, 1963"
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('Date parsing error:', error, 'for date:', dateString);
        return 'Unknown';
    }
}

function formatDoctor(doctor) {
    if (!doctor || !doctor.actor) return 'Unknown';
    
    const actor = doctor.actor || 'Unknown Actor';
    const incarnation = doctor.incarnation || 'Unknown Doctor';
    
    return `${actor} (${incarnation})`;
}

function formatCompanion(companion) {
    if (!companion || companion === null) return '—';
    
    if (!companion.actor && !companion.character) return '—';
    
    const actor = companion.actor || 'Unknown Actor';
    const character = companion.character || 'Unknown Character';
    
    return `${actor} (${character})`;
}

function formatCastCount(cast) {
    if (!Array.isArray(cast)) return '0';
    return cast.length.toString();
}

function formatWriter(writer) {
    if (!writer) return 'Unknown';
    
    // Handle multiple writers separated by & or and
    return writer.replace(/\s*&\s*/g, ' & ').replace(/\s+and\s+/g, ' & ');
}

function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function parseDateForSorting(dateString) {
    if (!dateString) return new Date(0);
    
    try {
        let date;
        
        if (dateString.match(/^\d{4}$/)) {
            // Year only
            date = new Date(parseInt(dateString), 0, 1);
        } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // ISO format
            date = new Date(dateString);
        } else if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            // UK format
            const [day, month, year] = dateString.split('/');
            date = new Date(year, month - 1, day);
        } else {
            // Try parsing as-is
            date = new Date(dateString);
        }
        
        return isNaN(date.getTime()) ? new Date(0) : date;
    } catch (error) {
        return new Date(0);
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = show ? 'none' : 'table';
    document.getElementById('no-results').style.display = 'none';
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
    
    // Hide other elements when showing error
    document.getElementById('episodes-table').style.display = 'none';
    document.getElementById('no-results').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
