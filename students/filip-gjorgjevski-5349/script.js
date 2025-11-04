// Configuration
const CONFIG = {
    // Array of all data sources to fetch
    DATA_URLS: [
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json',
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json'
    ]
};

// State Management
let state = {
    episodes: [],          // Original data
    filtered: [],          // Filtered results
    sort: {
        field: 'rank',     // Current sort field
        ascending: true    // Sort direction
    },
    filters: {
        name: ''           // Current filter value
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // Case-insensitive name filter
    document.getElementById('name-filter').addEventListener('input', (e) => {
        state.filters.name = e.target.value;
        applyFiltersAndSort();
    });

    // Single-column sorting
    document.querySelectorAll('#episodes-table thead th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            if (state.sort.field === field) {
                // Toggle ascending/descending
                state.sort.ascending = !state.sort.ascending;
            } else {
                state.sort.field = field;
                state.sort.ascending = true;
            }
            applyFiltersAndSort();
        });
    });
}

// Data Loading - MODIFIED FOR MULTIPLE URLS
async function loadEpisodes() {
    try {
        showLoading(true);
        
        // Create an array of fetch promises from all URLs
        const promises = CONFIG.DATA_URLS.map(url => fetch(url));
        
        // Wait for all fetch requests to complete in parallel
        const responses = await Promise.all(promises);

        // Check if any response failed
        for (const response of responses) {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText} for ${response.url}`);
            }
        }

        // Parse JSON from all successful responses
        const jsonDataArray = await Promise.all(responses.map(res => res.json()));

        // Extract the 'episodes' array from each object and flatten into a single array
        const allEpisodes = jsonDataArray.flatMap(data => data.episodes);

        state.episodes = allEpisodes;
        applyFiltersAndSort();

    } catch (error) {
        // Display error message if any fetch fails
        showError(`Failed to load episodes: ${error.message}`);
    } finally {
        // Hide loading state when done
        showLoading(false);
    }
}


// Main function to apply filters and sorting, then update the display
function applyFiltersAndSort() {
    const filterText = state.filters.name.toLowerCase();

    // Apply case-insensitive name filter (partial match)
    let processedData = state.episodes.filter(episode => {
        const title = episode.title?.toLowerCase() || '';
        const doctor = formatDoctor(episode.doctor, false).toLowerCase();
        const companion = formatCompanion(episode.companion, false).toLowerCase();
        const writer = episode.writer?.toLowerCase() || '';
        const director = episode.director?.toLowerCase() || '';

        return title.includes(filterText) ||
               doctor.includes(filterText) ||
               companion.includes(filterText) ||
               writer.includes(filterText) ||
               director.includes(filterText);
    });

    // Apply sorting
    const { field, ascending } = state.sort;
    const direction = ascending ? 1 : -1;

    processedData.sort((a, b) => {
        const valA = getSortValue(a, field);
        const valB = getSortValue(b, field);

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
    });

    state.filtered = processedData;
    displayEpisodes(state.filtered);
}

// Display Functions
function displayEpisodes(episodes) {
    const tableBody = document.getElementById('episodes-body');
    const noResults = document.getElementById('no-results');
    tableBody.innerHTML = '';

    updateSortHeaders();

    noResults.style.display = episodes.length === 0 ? 'block' : 'none';

    // Display episodes in the table with specified columns
    episodes.forEach(episode => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${episode.rank ?? 'N/A'}</td>
            <td>${episode.title ?? 'N/A'}</td>
            <td>${episode.series ?? 'N/A'}</td>
            <td>${episode.era ?? 'N/A'}</td>
            <td>${getYear(episode.broadcast_date)}</td>
            <td>${episode.director || 'N/A'}</td>
            <td>${episode.writer || 'N/A'}</td>
            <td>${formatDoctor(episode.doctor)}</td>
            <td>${formatCompanion(episode.companion)}</td>
            <td>${episode.cast?.length || 0}</td>
        `;
        tableBody.appendChild(row);
    });
}

// UTILITY FUNCTIONS

// Gets a comparable value for sorting different data types
function getSortValue(episode, field) {
    switch (field) {
        case 'doctor':
            return formatDoctor(episode.doctor, false).toLowerCase();
        case 'companion':
            return formatCompanion(episode.companion, false).toLowerCase();
        case 'cast_count':
            return episode.cast?.length || 0;
        case 'broadcast_date':
            return new Date(episode.broadcast_date || 0).getTime();
        default: // rank, title, series, era, director, writer
            return episode[field] ?? '';
    }
}

// Update table headers with sort indicators
function updateSortHeaders() {
    document.querySelectorAll('#episodes-table thead th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.sort.field) {
            th.classList.add(state.sort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Formatters for specific table columns
function formatDoctor(doctor, includeIncarnation = true) {
    if (!doctor?.actor) return 'N/A';
    return includeIncarnation ? `${doctor.actor} (${doctor.incarnation || 'N/A'})` : doctor.actor;
}

function formatCompanion(companion, includeCharacter = true) {
    if (!companion?.actor) return 'N/A';
    return includeCharacter ? `${companion.actor} (${companion.character || 'N/A'})` : companion.actor;
}

function getYear(dateString) {
    if (!dateString) return 'N/A';
    // Use regex to find any four-digit number to robustly handle different date formats
    const match = dateString.match(/\d{4}/);
    return match ? match[0] : 'N/A';
}

// UI State Changers
function showLoading(isLoading) {
    document.getElementById('loading').style.display = isLoading ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = isLoading ? 'none' : 'table';
    if (isLoading) {
        document.getElementById('error').style.display = 'none'; // Hide error when loading
    }
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
    // Hide table and loading indicator on error
    document.getElementById('episodes-table').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);