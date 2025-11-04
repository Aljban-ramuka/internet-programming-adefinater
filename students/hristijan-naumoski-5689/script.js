// Global State
let allEpisodes = [];
let filteredEpisodes = [];
let sortState = {
    column: 'rank',
    direction: 'asc',
    secondary: null
};
let validationWarnings = [];

// Data URL
const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json';

// Utility Functions
function extractYear(dateStr) {
    if (!dateStr) return 0;
    
    if (/^\d{4}$/.test(dateStr)) {
        return parseInt(dateStr);
    }
    
    const isoMatch = dateStr.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (isoMatch) return parseInt(isoMatch[1]);
    
    const ukMatch = dateStr.match(/^\d{2}\/\d{2}\/(\d{4})$/);
    if (ukMatch) return parseInt(ukMatch[1]);
    
    const usMatch = dateStr.match(/\b(\d{4})$/);
    if (usMatch) return parseInt(usMatch[1]);
    
    return 0;
}

function formatDoctor(doctor) {
    if (!doctor) return 'Unknown';
    return `${doctor.actor} (${doctor.incarnation})`;
}

function formatCompanion(companion) {
    if (!companion) return null;
    return `${companion.actor} (${companion.character})`;
}

function getCastCount(episode) {
    return episode.cast?.length || 0;
}

function validateEpisode(episode, index) {
    const warnings = [];
    
    if (!episode.title) {
        warnings.push(`Episode ${index}: Missing title`);
    }
    
    if (episode.rank < 1) {
        warnings.push(`Episode ${index}: Invalid rank (${episode.rank})`);
    }
    
    if (episode.series < 0) {
        warnings.push(`Episode ${index}: Negative series number (${episode.series})`);
    }
    
    const year = extractYear(episode.broadcast_date);
    const currentYear = new Date().getFullYear();
    if (year > currentYear) {
        warnings.push(`Episode ${index}: Future broadcast date (${episode.broadcast_date})`);
    }
    
    return warnings;
}

// Data Fetching
async function fetchData() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');
    
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    content.classList.add('hidden');
    
    try {
        const response = await fetch(DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
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
            throw new Error('Unexpected data structure');
        }
        
        // Validate episodes
        validationWarnings = [];
        episodes.forEach((episode, index) => {
            const warnings = validateEpisode(episode, index);
            validationWarnings.push(...warnings);
        });
        
        if (validationWarnings.length > 0) {
            console.warn('Data validation warnings:', validationWarnings);
            displayWarnings();
        }
        
        allEpisodes = episodes;
        populateFilters();
        applyFilters();
        
        loading.classList.add('hidden');
        content.classList.remove('hidden');
        
    } catch (err) {
        console.error('Failed to fetch episodes:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        document.getElementById('error-message').textContent = err.message || 'Failed to fetch episode data.';
    }
}

// Display Warnings
function displayWarnings() {
    if (validationWarnings.length === 0) return;
    
    const warningsDiv = document.getElementById('warnings');
    const warningCount = document.getElementById('warning-count');
    const warningDetails = document.getElementById('warning-details');
    
    warningCount.textContent = validationWarnings.length;
    warningDetails.innerHTML = validationWarnings.slice(0, 10).map(w => `<div>• ${w}</div>`).join('');
    
    if (validationWarnings.length > 10) {
        warningDetails.innerHTML += `<div style="font-style: italic; color: var(--text-muted);">... and ${validationWarnings.length - 10} more warnings</div>`;
    }
    
    warningsDiv.classList.remove('hidden');
}

function toggleWarnings() {
    const details = document.getElementById('warning-details');
    const btn = document.getElementById('toggle-warnings');
    
    details.classList.toggle('hidden');
    btn.textContent = details.classList.contains('hidden') ? 'Show details' : 'Hide details';
}

// Populate Filter Dropdowns
function populateFilters() {
    const eras = [...new Set(allEpisodes.map(ep => ep.era))].filter(Boolean).sort();
    const doctors = [...new Set(allEpisodes.map(ep => formatDoctor(ep.doctor)))].filter(Boolean).sort();
    const companions = [...new Set(allEpisodes.map(ep => formatCompanion(ep.companion)))].filter(Boolean).sort();
    
    const eraSelect = document.getElementById('era-filter');
    eras.forEach(era => {
        const option = document.createElement('option');
        option.value = era;
        option.textContent = era;
        eraSelect.appendChild(option);
    });
    
    const doctorSelect = document.getElementById('doctor-filter');
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor;
        option.textContent = doctor;
        doctorSelect.appendChild(option);
    });
    
    const companionSelect = document.getElementById('companion-filter');
    const noneOption = document.createElement('option');
    noneOption.value = 'None';
    noneOption.textContent = 'None';
    companionSelect.appendChild(noneOption);
    
    companions.forEach(companion => {
        const option = document.createElement('option');
        option.value = companion;
        option.textContent = companion;
        companionSelect.appendChild(option);
    });
}

// Filtering
function applyFilters() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const eraFilter = document.getElementById('era-filter').value;
    const doctorFilter = document.getElementById('doctor-filter').value;
    const companionFilter = document.getElementById('companion-filter').value;
    
    filteredEpisodes = allEpisodes.filter(episode => {
        if (eraFilter !== 'all' && episode.era !== eraFilter) return false;
        if (doctorFilter !== 'all' && formatDoctor(episode.doctor) !== doctorFilter) return false;
        
        const companionStr = formatCompanion(episode.companion) || 'None';
        if (companionFilter !== 'all' && companionStr !== companionFilter) return false;
        
        if (searchTerm) {
            const searchableText = [
                episode.title,
                episode.director,
                episode.writer,
                formatDoctor(episode.doctor),
                companionStr,
                episode.era
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    // Smart relevance sorting if search term exists
    if (searchTerm) {
        filteredEpisodes.sort((a, b) => {
            const aTitle = a.title?.toLowerCase() || '';
            const bTitle = b.title?.toLowerCase() || '';
            
            if (aTitle === searchTerm && bTitle !== searchTerm) return -1;
            if (bTitle === searchTerm && aTitle !== searchTerm) return 1;
            if (aTitle.startsWith(searchTerm) && !bTitle.startsWith(searchTerm)) return -1;
            if (bTitle.startsWith(searchTerm) && !aTitle.startsWith(searchTerm)) return 1;
            if (aTitle.includes(searchTerm) && !bTitle.includes(searchTerm)) return -1;
            if (bTitle.includes(searchTerm) && !aTitle.includes(searchTerm)) return 1;
            
            return a.rank - b.rank;
        });
    } else {
        sortEpisodes();
    }
    
    updateResultsInfo();
    renderTable();
}

function clearFilters() {
    document.getElementById('search').value = '';
    document.getElementById('era-filter').value = 'all';
    document.getElementById('doctor-filter').value = 'all';
    document.getElementById('companion-filter').value = 'all';
    applyFilters();
}

// Sorting
function handleSort(event, column) {
    const shiftKey = event.shiftKey;
    
    if (shiftKey && sortState.column && sortState.column !== column) {
        sortState.secondary = { ...sortState };
        sortState.column = column;
        sortState.direction = 'asc';
    } else if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = column;
        sortState.direction = 'asc';
        sortState.secondary = null;
    }
    
    sortEpisodes();
    updateSortIcons();
    updateResultsInfo();
    renderTable();
}

function sortEpisodes() {
    filteredEpisodes.sort((a, b) => {
        let result = compareEpisodes(a, b, sortState.column, sortState.direction);
        
        if (result === 0 && sortState.secondary) {
            result = compareEpisodes(a, b, sortState.secondary.column, sortState.secondary.direction);
        }
        
        return result;
    });
}

function compareEpisodes(a, b, column, direction) {
    let aVal, bVal;
    
    switch (column) {
        case 'broadcast_year':
            aVal = extractYear(a.broadcast_date);
            bVal = extractYear(b.broadcast_date);
            break;
        case 'cast_count':
            aVal = getCastCount(a);
            bVal = getCastCount(b);
            break;
        case 'doctor':
            aVal = formatDoctor(a.doctor);
            bVal = formatDoctor(b.doctor);
            break;
        case 'companion':
            aVal = formatCompanion(a.companion) || 'None';
            bVal = formatCompanion(b.companion) || 'None';
            break;
        default:
            aVal = a[column];
            bVal = b[column];
    }
    
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return direction === 'asc' ? 1 : -1;
    if (bVal == null) return direction === 'asc' ? -1 : 1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    
    if (aStr < bStr) return direction === 'asc' ? -1 : 1;
    if (aStr > bStr) return direction === 'asc' ? 1 : -1;
    return 0;
}

function updateSortIcons() {
    document.querySelectorAll('th').forEach(th => {
        const column = th.getAttribute('data-column');
        const icon = th.querySelector('.sort-icon');
        
        if (column === sortState.column) {
            th.classList.add('sorted');
            icon.textContent = sortState.direction === 'asc' ? '↑' : '↓';
        } else {
            th.classList.remove('sorted');
            icon.textContent = '↕';
        }
    });
}

// Results Info
function updateResultsInfo() {
    const resultsCount = document.getElementById('results-count');
    const sortInfo = document.getElementById('sort-info');
    
    resultsCount.textContent = `Showing ${filteredEpisodes.length} of ${allEpisodes.length} episodes`;
    
    if (sortState.column) {
        let sortText = `Sorted by ${sortState.column} (${sortState.direction})`;
        if (sortState.secondary) {
            sortText += ` then ${sortState.secondary.column} (${sortState.secondary.direction})`;
        }
        sortInfo.textContent = sortText;
    } else {
        sortInfo.textContent = '';
    }
}

// Render Table
function renderTable() {
    const tbody = document.getElementById('episodes-tbody');
    
    if (filteredEpisodes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">No episodes found matching your filters</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredEpisodes.map((episode, index) => {
        const companion = formatCompanion(episode.companion);
        const companionDisplay = companion 
            ? `<td>${companion}</td>` 
            : '<td class="companion-none">None</td>';
        
        return `
            <tr>
                <td>${episode.rank}</td>
                <td><strong>${episode.title}</strong></td>
                <td>${episode.series}</td>
                <td><span class="era-badge era-${episode.era.toLowerCase()}">${episode.era}</span></td>
                <td>${extractYear(episode.broadcast_date)}</td>
                <td>${episode.director}</td>
                <td>${episode.writer}</td>
                <td>${formatDoctor(episode.doctor)}</td>
                ${companionDisplay}
                <td>${getCastCount(episode)}</td>
            </tr>
        `;
    }).join('');
}

// Export to CSV
function exportCSV() {
    const headers = ['Rank', 'Title', 'Series', 'Era', 'Broadcast Year', 'Director', 'Writer', 'Doctor', 'Companion', 'Cast Count'];
    
    const escapeCSV = (value) => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const rows = filteredEpisodes.map(ep => [
        ep.rank,
        escapeCSV(ep.title),
        ep.series,
        ep.era,
        extractYear(ep.broadcast_date),
        escapeCSV(ep.director),
        escapeCSV(ep.writer),
        escapeCSV(formatDoctor(ep.doctor)),
        escapeCSV(formatCompanion(ep.companion) || 'None'),
        getCastCount(ep)
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-who-episodes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', fetchData);
