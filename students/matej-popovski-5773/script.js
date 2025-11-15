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
    const nameFilter = document.getElementById('name-filter');
    nameFilter.addEventListener('input', (e) => {
        state.filters.name = e.target.value.toLowerCase();
        filterEpisodes();
    });

    const eraFilter = document.getElementById('era-filter');
    eraFilter.addEventListener('change', (e) => {
        state.filters.era = e.target.value;
        filterEpisodes();
    });

    const doctorFilter = document.getElementById('doctor-filter');
    doctorFilter.addEventListener('change', (e) => {
        state.filters.doctor = e.target.value;
        filterEpisodes();
    });

    const companionFilter = document.getElementById('companion-filter');
    companionFilter.addEventListener('change', (e) => {
        state.filters.companion = e.target.value;
        filterEpisodes();
    });

    const viewToggle = document.getElementById('view-toggle');
    viewToggle.addEventListener('change', (e) => {
        state.currentView = e.target.value;
        displayCurrentView();
    });

    const table = document.getElementById('episodes-table');
    table.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-sort')) {
            const field = e.target.getAttribute('data-sort');
            sortEpisodes(field);
        }
    });
}

async function loadEpisodes() {
    try {
        showLoading(true);
        const response = await fetch(CONFIG.DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
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
        
        validateData(episodes);
        
        state.filtered = [...state.episodes];
        
        populateFilterDropdowns();
        
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
        if (!episode.title || episode.title.trim() === '') {
            state.warnings.push(`Episode ${index + 1}: Missing title`);
        }
        if (!episode.rank) {
            state.warnings.push(`Episode ${index + 1}: Missing rank`);
        }
        
        if (episode.rank && seenRanks.has(episode.rank)) {
            state.warnings.push(`Episode ${index + 1}: Duplicate rank ${episode.rank}`);
        }
        seenRanks.add(episode.rank);
        
        if (episode.rank && episode.rank <= 0) {
            state.warnings.push(`Episode ${index + 1}: Invalid rank ${episode.rank}`);
        }
        
        if (episode.series && episode.series < 0) {
            state.warnings.push(`Episode ${index + 1}: Negative series number ${episode.series}`);
        }
        
        const broadcastYear = extractYear(episode.broadcast_date);
        if (broadcastYear && broadcastYear > currentYear) {
            state.warnings.push(`Episode ${index + 1}: Future broadcast date ${episode.broadcast_date}`);
        }
    });
    
    // Log warnings to console
    state.warnings.forEach(warning => console.warn(warning));
    
    displayWarnings();
}

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
        
        const directorCell = document.createElement('td');
        directorCell.textContent = episode.director || 'Unknown';
        row.appendChild(directorCell);
        
        const writerCell = document.createElement('td');
        writerCell.textContent = formatWriters(episode.writer);
        row.appendChild(writerCell);
        
        const doctorCell = document.createElement('td');
        doctorCell.textContent = formatDoctor(episode.doctor);
        row.appendChild(doctorCell);
        
        const companionCell = document.createElement('td');
        companionCell.textContent = formatCompanion(episode.companion);
        row.appendChild(companionCell);
        
        const castCell = document.createElement('td');
        const castCount = episode.cast && Array.isArray(episode.cast) ? episode.cast.length : 0;
        const castSpan = document.createElement('span');
        castSpan.className = 'cast-count clickable';
        castSpan.textContent = castCount;
        castSpan.style.cursor = 'pointer';
        castSpan.title = 'Click to see cast members';
        
        castSpan.addEventListener('click', () => {
            showCastDetails(episode.cast, episode.title);
        });
        
        castCell.appendChild(castSpan);
        row.appendChild(castCell);
        
        tbody.appendChild(row);
    });
}

function sortEpisodes(field) {
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }
    
    if (state.filters.name && field !== 'relevance') {
        applySortWithRelevance();
    } else {
        state.filtered.sort((a, b) => {
            let aVal = getFieldValue(a, field);
            let bVal = getFieldValue(b, field);
            
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
    
    updateSortIndicators();
    
    displayCurrentView();
}

function applySortWithRelevance() {
    const searchTerm = state.filters.name;
    
    state.filtered.sort((a, b) => {
        const scoreA = calculateRelevance(a, searchTerm);
        const scoreB = calculateRelevance(b, searchTerm);
        
        if (scoreA !== scoreB) {
            return scoreB - scoreA; 
        }
        
        return (a.rank || 0) - (b.rank || 0);
    });
}

function calculateRelevance(episode, searchTerm) {
    const title = (episode.title || '').toLowerCase();
    
    if (title === searchTerm) return 4;
    
    if (title.startsWith(searchTerm)) return 3;
    
    if (title.includes(searchTerm)) return 2;
    
    return 1;
}

function filterEpisodes() {
    state.filtered = state.episodes.filter(episode => {
        if (state.filters.name) {
            const searchTerm = state.filters.name;
            const title = (episode.title || '').toLowerCase();
            
            console.log(`Searching for "${searchTerm}" in title: "${title}"`);
            
            if (!title.includes(searchTerm)) {
                return false;
            }
        }
        
        if (state.filters.era && episode.era !== state.filters.era) {
            return false;
        }
        
        if (state.filters.doctor) {
            const doctorName = episode.doctor?.actor || '';
            if (!doctorName.includes(state.filters.doctor)) {
                return false;
            }
        }
        
        if (state.filters.companion) {
            const companionName = episode.companion?.actor || '';
            if (!companionName.includes(state.filters.companion)) {
                return false;
            }
        }
        
        return true;
    });
    
    sortEpisodes(state.sort.field);
}

function displayCurrentView() {
    if (state.currentView === 'decades') {
        displayDecadeGroups();
    } else {
        displayEpisodes(state.filtered);
    }
}

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
    
    decadesView.innerHTML = '';
    
    const sortedDecades = Object.keys(decades).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedDecades.forEach(decade => {
        const episodes = decades[decade];
        
        episodes.sort((a, b) => {
            const rankA = parseInt(a.rank) || 999999;
            const rankB = parseInt(b.rank) || 999999;
            return rankA - rankB;
        });
        
        const decadeGroup = document.createElement('div');
        decadeGroup.className = 'decade-group';
        
        const header = document.createElement('div');
        header.className = 'decade-header';
        
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
        
        const content = document.createElement('div');
        content.className = 'decade-content';
        
        episodes.forEach(episode => {
            const card = document.createElement('div');
            card.className = 'episode-card';
            
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
        
        header.addEventListener('click', () => {
            decadeGroup.classList.toggle('collapsed');
        });
        
        decadeGroup.appendChild(header);
        decadeGroup.appendChild(content);
        decadesView.appendChild(decadeGroup);
    });
}

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
    
    doctorFilter.innerHTML = '<option value="">All Doctors</option>';
    
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
    
    companionFilter.innerHTML = '<option value="">All Companions</option>';
    
    Array.from(companions).sort().forEach(companion => {
        const option = document.createElement('option');
        option.value = companion;
        option.textContent = companion;
        companionFilter.appendChild(option);
    });
}

function formatDate(dateStr) {
    return formatFullDate(dateStr);
}

function formatFullDate(dateStr) {
    if (!dateStr) return 'Unknown';
    
    const dateString = String(dateStr);
    
    let parsedDate = null;
    
    const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        return dateString; 
    }
    
    const ukMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ukMatch) {
        const [, day, month, year] = ukMatch;
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
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
    
   
    
    return dateString || 'Unknown';
}

function extractYear(dateStr) {
    if (!dateStr) return null;
    
    const dateString = String(dateStr);
    
    const isoMatch = dateString.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (isoMatch) return parseInt(isoMatch[1]);
    
    
    
    
    
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
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
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
    
    modalTitle.textContent = `Plot: "${episodeTitle}"`;
    
    modalBody.innerHTML = '';
    
    if (!plot || plot.trim() === '') {
        modalBody.innerHTML = '<div class="empty-plot">No plot information available for this episode.</div>';
    } else {
        const plotDiv = document.createElement('div');
        plotDiv.className = 'plot-text';
        plotDiv.textContent = plot;
        modalBody.appendChild(plotDiv);
    }
    
    modal.style.display = 'block';
}

function showCastDetails(cast, episodeTitle) {
    const modal = document.getElementById('cast-modal');
    const modalTitle = document.getElementById('cast-modal-title');
    const modalBody = document.getElementById('cast-modal-body');
    
    modalTitle.textContent = `Cast for "${episodeTitle}"`;
    
    modalBody.innerHTML = '';
    
    if (!cast || !Array.isArray(cast) || cast.length === 0) {
        modalBody.innerHTML = '<div class="empty-cast">No cast information available for this episode.</div>';
    } else {
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
    
    modal.style.display = 'block';
}

function initializeModal() {
    const castModal = document.getElementById('cast-modal');
    const plotModal = document.getElementById('plot-modal');
    const closeButtons = document.querySelectorAll('.modal-close');
    
    closeButtons.forEach(closeBtn => {
        closeBtn.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === castModal) {
            castModal.style.display = 'none';
        }
        if (event.target === plotModal) {
            plotModal.style.display = 'none';
        }
    });
    
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