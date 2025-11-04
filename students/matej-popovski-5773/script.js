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
    warnings: [],          // Data validation warnings
    currentView: 'table'   // Current view mode
};

// Initialize Application
async function init() {
    setupEventListeners();
    initializeModal();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Name filter input
    const nameFilter = document.getElementById('name-filter');
    nameFilter.addEventListener('input', (e) => {
        state.filters.name = e.target.value.toLowerCase();
        filterEpisodes();
    });

    // Era filter
    const eraFilter = document.getElementById('era-filter');
    eraFilter.addEventListener('change', (e) => {
        state.filters.era = e.target.value;
        filterEpisodes();
    });

    // Doctor filter
    const doctorFilter = document.getElementById('doctor-filter');
    doctorFilter.addEventListener('change', (e) => {
        state.filters.doctor = e.target.value;
        filterEpisodes();
    });

    // Companion filter
    const companionFilter = document.getElementById('companion-filter');
    companionFilter.addEventListener('change', (e) => {
        state.filters.companion = e.target.value;
        filterEpisodes();
    });

    // View toggle
    const viewToggle = document.getElementById('view-toggle');
    viewToggle.addEventListener('change', (e) => {
        state.currentView = e.target.value;
        displayCurrentView();
    });

    // Column header clicks for sorting
    const table = document.getElementById('episodes-table');
    table.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-sort')) {
            const field = e.target.getAttribute('data-sort');
            sortEpisodes(field);
        }
    });
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
        
        // Handle different data structures
        let episodes;
        if (Array.isArray(data)) {
            episodes = data;
        } else if (data.episodes && Array.isArray(data.episodes)) {
            episodes = data.episodes;
        } else if (data.data && Array.isArray(data.data)) {
            episodes = data.data;
        } else {
            console.error('Unexpected data structure:', data);
            throw new Error('Invalid data format: expected an array of episodes');
        }
        
        state.episodes = episodes;
        
        // Validate data and collect warnings
        validateData(episodes);
        
        // Initialize filtered episodes
        state.filtered = [...state.episodes];
        
        // Populate filter dropdowns
        populateFilterDropdowns();
        
        // Sort by rank initially
        sortEpisodes('rank');
        
        showLoading(false);
        displayCurrentView();
        
    } catch (error) {
        showError('Failed to load episodes: ' + error.message);
        showLoading(false);
    }
}

// Data Validation (Tier 3 Feature)
function validateData(episodes) {
    state.warnings = [];
    const seenRanks = new Set();
    const currentYear = new Date().getFullYear();
    
    episodes.forEach((episode, index) => {
        // Check for missing required fields
        if (!episode.title || episode.title.trim() === '') {
            state.warnings.push(`Episode ${index + 1}: Missing title`);
        }
        if (!episode.rank) {
            state.warnings.push(`Episode ${index + 1}: Missing rank`);
        }
        
        // Check for duplicate ranks
        if (episode.rank && seenRanks.has(episode.rank)) {
            state.warnings.push(`Episode ${index + 1}: Duplicate rank ${episode.rank}`);
        }
        seenRanks.add(episode.rank);
        
        // Check for invalid ranks
        if (episode.rank && episode.rank <= 0) {
            state.warnings.push(`Episode ${index + 1}: Invalid rank ${episode.rank}`);
        }
        
        // Check for negative series numbers
        if (episode.series && episode.series < 0) {
            state.warnings.push(`Episode ${index + 1}: Negative series number ${episode.series}`);
        }
        
        // Check for future dates
        const broadcastYear = extractYear(episode.broadcast_date);
        if (broadcastYear && broadcastYear > currentYear) {
            state.warnings.push(`Episode ${index + 1}: Future broadcast date ${episode.broadcast_date}`);
        }
    });
    
    // Log warnings to console
    state.warnings.forEach(warning => console.warn(warning));
    
    // Display warning count in UI
    displayWarnings();
}

// Display Functions
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    const table = document.getElementById('episodes-table');
    const decadesView = document.getElementById('decades-view');
    const noResults = document.getElementById('no-results');
    
    // Hide decades view
    decadesView.style.display = 'none';
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (episodes.length === 0) {
        table.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    noResults.style.display = 'none';
    
    episodes.forEach(episode => {
        const row = document.createElement('tr');
        
        // Rank
        const rankCell = document.createElement('td');
        rankCell.textContent = episode.rank || 'N/A';
        row.appendChild(rankCell);
        
        // Title
        const titleCell = document.createElement('td');
        titleCell.textContent = episode.title || 'Unknown Title';
        row.appendChild(titleCell);
        
        // Plot
        const plotCell = document.createElement('td');
        const plot = episode.plot || 'No plot available';
        plotCell.textContent = plot.length > 100 ? plot.substring(0, 100) + '...' : plot;
        plotCell.title = 'Click to see full plot';
        plotCell.style.cursor = 'pointer';
        
        // Add click handler to show full plot
        plotCell.addEventListener('click', () => {
            showPlotDetails(episode.plot, episode.title);
        });
        
        row.appendChild(plotCell);
        
        // Series
        const seriesCell = document.createElement('td');
        seriesCell.textContent = episode.series || 'N/A';
        row.appendChild(seriesCell);
        
        // Era
        const eraCell = document.createElement('td');
        eraCell.textContent = episode.era || 'Unknown';
        row.appendChild(eraCell);
        
        // Broadcast Date (full date)
        const dateCell = document.createElement('td');
        dateCell.textContent = formatFullDate(episode.broadcast_date);
        row.appendChild(dateCell);
        
        // Director
        const directorCell = document.createElement('td');
        directorCell.textContent = episode.director || 'Unknown';
        row.appendChild(directorCell);
        
        // Writer(s) - Handle multiple writers
        const writerCell = document.createElement('td');
        writerCell.textContent = formatWriters(episode.writer);
        row.appendChild(writerCell);
        
        // Doctor
        const doctorCell = document.createElement('td');
        doctorCell.textContent = formatDoctor(episode.doctor);
        row.appendChild(doctorCell);
        
        // Companion - Handle null/missing companions
        const companionCell = document.createElement('td');
        companionCell.textContent = formatCompanion(episode.companion);
        row.appendChild(companionCell);
        
        // Cast Count - Handle empty arrays and make clickable
        const castCell = document.createElement('td');
        const castCount = episode.cast && Array.isArray(episode.cast) ? episode.cast.length : 0;
        const castSpan = document.createElement('span');
        castSpan.className = 'cast-count clickable';
        castSpan.textContent = castCount;
        castSpan.style.cursor = 'pointer';
        castSpan.title = 'Click to see cast members';
        
        // Add click handler to show cast details
        castSpan.addEventListener('click', () => {
            showCastDetails(episode.cast, episode.title);
        });
        
        castCell.appendChild(castSpan);
        row.appendChild(castCell);
        
        tbody.appendChild(row);
    });
}

// Sorting Functions
function sortEpisodes(field) {
    // Update sort state
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }
    
    // Apply smart relevance sort if filtering is active
    if (state.filters.name && field !== 'relevance') {
        applySortWithRelevance();
    } else {
        // Regular sorting
        state.filtered.sort((a, b) => {
            let aVal = getFieldValue(a, field);
            let bVal = getFieldValue(b, field);
            
            // Handle different data types
            if (field === 'rank' || field === 'series' || field === 'cast') {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            } else if (field === 'broadcast_date') {
                aVal = parseDate(a.broadcast_date);
                bVal = parseDate(b.broadcast_date);
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }
            
            let result;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;
            else result = 0;
            
            return state.sort.ascending ? result : -result;
        });
    }
    
    // Update sort indicators
    updateSortIndicators();
    
    // Display sorted episodes
    displayCurrentView();
}

// Smart Relevance Sort (Tier 3 Feature)
function applySortWithRelevance() {
    const searchTerm = state.filters.name;
    
    state.filtered.sort((a, b) => {
        // Calculate relevance scores
        const scoreA = calculateRelevance(a, searchTerm);
        const scoreB = calculateRelevance(b, searchTerm);
        
        if (scoreA !== scoreB) {
            return scoreB - scoreA; // Higher score first
        }
        
        // If same relevance, sort by rank
        return (a.rank || 0) - (b.rank || 0);
    });
}

function calculateRelevance(episode, searchTerm) {
    const title = (episode.title || '').toLowerCase();
    
    // Since name filter only searches titles now, all relevance is based on title matching
    // Exact title match
    if (title === searchTerm) return 4;
    
    // Title contains search term at the beginning
    if (title.startsWith(searchTerm)) return 3;
    
    // Title contains search term anywhere
    if (title.includes(searchTerm)) return 2;
    
    return 1; // Default relevance (shouldn't reach here since filtering already happened)
}

// Filtering Functions - Updated 2025-11-04
function filterEpisodes() {
    state.filtered = state.episodes.filter(episode => {
        // Name filter (searches ONLY in title)
        if (state.filters.name) {
            const searchTerm = state.filters.name;
            const title = (episode.title || '').toLowerCase();
            
            // Debug: log what we're searching
            console.log(`Searching for "${searchTerm}" in title: "${title}"`);
            
            if (!title.includes(searchTerm)) {
                return false;
            }
        }
        
        // Era filter
        if (state.filters.era && episode.era !== state.filters.era) {
            return false;
        }
        
        // Doctor filter
        if (state.filters.doctor) {
            const doctorName = episode.doctor?.actor || '';
            if (!doctorName.includes(state.filters.doctor)) {
                return false;
            }
        }
        
        // Companion filter
        if (state.filters.companion) {
            const companionName = episode.companion?.actor || '';
            if (!companionName.includes(state.filters.companion)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Re-apply current sort
    sortEpisodes(state.sort.field);
}

// Display Control Functions
function displayCurrentView() {
    if (state.currentView === 'decades') {
        displayDecadeGroups();
    } else {
        displayEpisodes(state.filtered);
    }
}

// Decade Grouping Display
function displayDecadeGroups() {
    const table = document.getElementById('episodes-table');
    const decadesView = document.getElementById('decades-view');
    const noResults = document.getElementById('no-results');
    
    table.style.display = 'none';
    
    if (state.filtered.length === 0) {
        decadesView.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    decadesView.style.display = 'block';
    noResults.style.display = 'none';
    
    // Group episodes by decade
    const decades = {};
    state.filtered.forEach(episode => {
        const year = extractYear(episode.broadcast_date);
        if (year) {
            const decade = Math.floor(year / 10) * 10;
            if (!decades[decade]) {
                decades[decade] = [];
            }
            decades[decade].push(episode);
        }
    });
    
    // Clear existing content
    decadesView.innerHTML = '';
    
    // Sort decades
    const sortedDecades = Object.keys(decades).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedDecades.forEach(decade => {
        const episodes = decades[decade];
        
        // Sort episodes within each decade by rank
        episodes.sort((a, b) => {
            const rankA = parseInt(a.rank) || 999999;
            const rankB = parseInt(b.rank) || 999999;
            return rankA - rankB;
        });
        
        const decadeGroup = document.createElement('div');
        decadeGroup.className = 'decade-group';
        
        // Create header with more info
        const header = document.createElement('div');
        header.className = 'decade-header';
        
        // Calculate era distribution for this decade
        const eraCount = {};
        episodes.forEach(ep => {
            const era = ep.era || 'Unknown';
            eraCount[era] = (eraCount[era] || 0) + 1;
        });
        
        const eraInfo = Object.entries(eraCount)
            .map(([era, count]) => `${era}: ${count}`)
            .join(' • ');
        
        header.innerHTML = `
            <div>
                <div style="font-size: 1.1em; margin-bottom: 2px;">${decade}s</div>
                <div style="font-size: 0.85em; opacity: 0.9;">${episodes.length} episodes • ${eraInfo}</div>
            </div>
            <span class="decade-toggle">▼</span>
        `;
        
        // Create content
        const content = document.createElement('div');
        content.className = 'decade-content';
        
        episodes.forEach(episode => {
            const card = document.createElement('div');
            card.className = 'episode-card';
            
            // Organize the details into logical groups
            const basicInfo = [
                `<strong>Rank:</strong> ${episode.rank || 'N/A'}`,
                `<strong>Series:</strong> ${episode.series || 'N/A'}`,
                `<strong>Era:</strong> ${episode.era || 'Unknown'}`,
                `<strong>Date:</strong> ${formatFullDate(episode.broadcast_date)}`
            ].join(' • ');
            
            const peopleInfo = [
                `<strong>Director:</strong> ${episode.director || 'Unknown'}`,
                `<strong>Writer:</strong> ${formatWriters(episode.writer)}`
            ].join(' • ');
            
            const charactersInfo = [
                `<strong>Doctor:</strong> ${formatDoctor(episode.doctor)}`,
                `<strong>Companion:</strong> ${formatCompanion(episode.companion)}`,
                `<strong>Cast:</strong> ${episode.cast ? episode.cast.length : 0} members`
            ].join(' • ');
            
            card.innerHTML = `
                <div class="episode-title">${episode.title || 'Unknown Title'}</div>
                <div class="episode-details">
                    <div style="margin-bottom: 6px;">${basicInfo}</div>
                    <div style="margin-bottom: 6px;">${peopleInfo}</div>
                    <div>${charactersInfo}</div>
                </div>
            `;
            
            content.appendChild(card);
        });
        
        // Add click handler for collapsing
        header.addEventListener('click', () => {
            decadeGroup.classList.toggle('collapsed');
        });
        
        decadeGroup.appendChild(header);
        decadeGroup.appendChild(content);
        decadesView.appendChild(decadeGroup);
    });
}

// Populate filter dropdowns
function populateFilterDropdowns() {
    populateDoctorFilter();
    populateCompanionFilter();
}

function populateDoctorFilter() {
    const doctorFilter = document.getElementById('doctor-filter');
    const doctors = new Set();
    
    state.episodes.forEach(episode => {
        if (episode.doctor?.actor) {
            doctors.add(episode.doctor.actor);
        }
    });
    
    // Clear existing options (except "All Doctors")
    doctorFilter.innerHTML = '<option value="">All Doctors</option>';
    
    // Add sorted doctor options
    Array.from(doctors).sort().forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor;
        option.textContent = doctor;
        doctorFilter.appendChild(option);
    });
}

function populateCompanionFilter() {
    const companionFilter = document.getElementById('companion-filter');
    const companions = new Set();
    
    state.episodes.forEach(episode => {
        if (episode.companion?.actor) {
            companions.add(episode.companion.actor);
        }
    });
    
    // Clear existing options (except "All Companions")
    companionFilter.innerHTML = '<option value="">All Companions</option>';
    
    // Add sorted companion options
    Array.from(companions).sort().forEach(companion => {
        const option = document.createElement('option');
        option.value = companion;
        option.textContent = companion;
        companionFilter.appendChild(option);
    });
}

// Utility Functions
function formatDate(dateStr) {
    return formatFullDate(dateStr);
}

function formatFullDate(dateStr) {
    if (!dateStr) return 'Unknown';
    
    const dateString = String(dateStr);
    
    // Try to parse different date formats and convert to YYYY-MM-DD format
    let parsedDate = null;
    
    // ISO format: YYYY-MM-DD (already in correct format)
    const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        return dateString; // Already in YYYY-MM-DD format
    }
    
    // UK format: DD/MM/YYYY
    const ukMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ukMatch) {
        const [, day, month, year] = ukMatch;
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
    // Long format: Month DD, YYYY (e.g., "January 15, 2007")
    const longMatch = dateString.match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (longMatch) {
        const [, monthName, day, year] = longMatch;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.findIndex(name => name.toLowerCase() === monthName.toLowerCase());
        if (monthIndex !== -1) {
            const paddedMonth = (monthIndex + 1).toString().padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            return `${year}-${paddedMonth}-${paddedDay}`;
        }
    }
    
    // Year only: YYYY
    const yearMatch = dateString.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = yearMatch[1];
        return `${year}-01-01`; // January 1st of that year
    }
    
    // If we couldn't parse it, return the original string or Unknown
    return dateString || 'Unknown';
}

function extractYear(dateStr) {
    if (!dateStr) return null;
    
    // Handle different date formats
    const dateString = String(dateStr);
    
    // ISO format: YYYY-MM-DD
    const isoMatch = dateString.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (isoMatch) return parseInt(isoMatch[1]);
    
    // UK format: DD/MM/YYYY
    const ukMatch = dateString.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/);
    if (ukMatch) return parseInt(ukMatch[1]);
    
    // Long format: Month DD, YYYY
    const longMatch = dateString.match(/\b(\d{4})\b/);
    if (longMatch) return parseInt(longMatch[1]);
    
    // Year only: YYYY
    const yearMatch = dateString.match(/^(\d{4})$/);
    if (yearMatch) return parseInt(yearMatch[1]);
    
    return null;
}

function parseDate(dateStr) {
    const year = extractYear(dateStr);
    return year ? new Date(year, 0, 1) : new Date(0);
}

function formatWriters(writer) {
    if (!writer) return 'Unknown';
    
    // Handle multiple writers separated by & or 'and'
    return writer.replace(/\s*&\s*/g, ', ').replace(/\s+and\s+/g, ', ');
}

function formatDoctor(doctor) {
    if (!doctor || !doctor.actor) return 'Unknown Doctor';
    
    const actor = doctor.actor;
    const incarnation = doctor.incarnation || 'Unknown';
    return `${actor} (${incarnation})`;
}

function formatCompanion(companion) {
    // Handle null/missing companions gracefully
    if (!companion || !companion.actor) return '—';
    
    const actor = companion.actor;
    const character = companion.character || 'Unknown Character';
    return `${actor} (${character})`;
}

function getFieldValue(episode, field) {
    switch (field) {
        case 'cast':
            return episode.cast ? episode.cast.length : 0;
        case 'doctor':
            return formatDoctor(episode.doctor);
        case 'companion':
            return formatCompanion(episode.companion);
        case 'writer':
            return formatWriters(episode.writer);
        case 'plot':
            return episode.plot || '';
        default:
            return episode[field] || '';
    }
}

function updateSortIndicators() {
    // Remove existing sort indicators
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Add indicator to current sort column
    const currentHeader = document.querySelector(`th[data-sort="${state.sort.field}"]`);
    if (currentHeader) {
        currentHeader.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
    }
}

function displayWarnings() {
    if (state.warnings.length > 0) {
        const header = document.querySelector('header p');
        header.innerHTML = `Explore episodes through time and space <span style="color: #d32f2f; font-size: 0.9em;">(${state.warnings.length} data warnings - check console)</span>`;
    }
}

function showPlotDetails(plot, episodeTitle) {
    const modal = document.getElementById('plot-modal');
    const modalTitle = document.getElementById('plot-modal-title');
    const modalBody = document.getElementById('plot-modal-body');
    
    // Set the title
    modalTitle.textContent = `Plot: "${episodeTitle}"`;
    
    // Clear previous content
    modalBody.innerHTML = '';
    
    if (!plot || plot.trim() === '') {
        modalBody.innerHTML = '<div class="empty-plot">No plot information available for this episode.</div>';
    } else {
        // Create plot text div
        const plotDiv = document.createElement('div');
        plotDiv.className = 'plot-text';
        plotDiv.textContent = plot;
        modalBody.appendChild(plotDiv);
    }
    
    // Show the modal
    modal.style.display = 'block';
}

function showCastDetails(cast, episodeTitle) {
    const modal = document.getElementById('cast-modal');
    const modalTitle = document.getElementById('cast-modal-title');
    const modalBody = document.getElementById('cast-modal-body');
    
    // Set the title
    modalTitle.textContent = `Cast for "${episodeTitle}"`;
    
    // Clear previous content
    modalBody.innerHTML = '';
    
    if (!cast || !Array.isArray(cast) || cast.length === 0) {
        modalBody.innerHTML = '<div class="empty-cast">No cast information available for this episode.</div>';
    } else {
        // Create cast list
        cast.forEach(member => {
            const castDiv = document.createElement('div');
            castDiv.className = 'cast-member';
            
            const actor = member.actor || 'Unknown Actor';
            const character = member.character || 'Unknown Character';
            
            castDiv.innerHTML = `
                <span class="cast-actor">${actor}</span>
                <span class="cast-divider">as</span>
                <span class="cast-character">${character}</span>
            `;
            
            modalBody.appendChild(castDiv);
        });
    }
    
    // Show the modal
    modal.style.display = 'block';
}

// Initialize modal event listeners
function initializeModal() {
    const castModal = document.getElementById('cast-modal');
    const plotModal = document.getElementById('plot-modal');
    const closeButtons = document.querySelectorAll('.modal-close');
    
    // Close modal when clicking the X for any modal
    closeButtons.forEach(closeBtn => {
        closeBtn.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === castModal) {
            castModal.style.display = 'none';
        }
        if (event.target === plotModal) {
            plotModal.style.display = 'none';
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (castModal.style.display === 'block') {
                castModal.style.display = 'none';
            }
            if (plotModal.style.display === 'block') {
                plotModal.style.display = 'none';
            }
        }
    });
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = show ? 'none' : (state.currentView === 'table' ? 'table' : 'none');
    document.getElementById('decades-view').style.display = show ? 'none' : (state.currentView === 'decades' ? 'block' : 'none');
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', init);
