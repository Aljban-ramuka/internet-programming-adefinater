// Configuration
const CONFIG = {
    DATA_URL: '../doctor-who-episodes-exam.json',
    API_URLS: [
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
    episodes: [],
    filtered: [],
    loading: true,
    error: null,
    sort: {
        field: 'rank',
        ascending: true
    },
    filters: {
        name: ''
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    const nameFilter = document.getElementById("name-filter");
    // console.log(nameFilter);
    const episodeTableHeaders = document.querySelectorAll("#episodes-table th");
    
    nameFilter.addEventListener("input", () => {
        // console.log(nameFilter.value.toLowerCase());
        let val = nameFilter.value.toLowerCase();
        state.filters.name = val;
        filterEpisodes();
    });
    
    episodeTableHeaders.forEach(header => {
        console.log(header);
        console.log(header.getAttribute("data-sort"))
        header.addEventListener("click", () => {
            const sortKey = header.getAttribute("data-sort");
            sortEpisodes(sortKey);
        });
    });
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        for (const URL of CONFIG.API_URLS) {
            try {
                const resp = await fetch(URL);
                const data = await resp.json();
                const tempEps = data.episodes || data;
                state.episodes.push(...tempEps);
            } catch (fetchError) {
                showError(`Failed to fetch from '${URL}': ${fetchError.message}`);
            }
        }
        state.filtered = [...state.episodes];
        displayEpisodes(state.filtered);
    } catch (error) {
        showError('Failed to load episodes: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Display Functions
function displayEpisodes(episodes) {
    const table = document.getElementById("episodes-body");
    clearTable(table);
    episodes.forEach(ep => {
        const row = createEpisodeRow(ep);
        table.appendChild(row);
    });
}

function clearTable(table) {
    while (table.rows.length) {
        table.deleteRow(0);
    }
}

function createEpisodeRow(ep) {
    const row = document.createElement("tr");

    const columns = [
        ep.rank,
        ep.title,
        ep.series,
        ep.era,
        new Date(ep.broadcast_date).getFullYear(),
        ep.director,
        ep.writer,
        `${ep.doctor.actor} (${ep.doctor.incarnation})`,
        ep.companion ? `${ep.companion.actor} (${ep.companion.character})` : 'No companion',
        (ep.cast === null) ? 0 : ep.cast.length,
    ];

    columns.forEach(value => {
        const column = document.createElement("td");
        column.innerHTML = value;
        row.appendChild(column);
    });

    return row;
}

// Sorting Functions
function sortEpisodes(field) {
    if (state.sort.field === field) {
        state.sort.ascending = !state.sort.ascending;
    } else {
        state.sort.field = field;
        state.sort.ascending = true;
    }

    state.filtered.sort((a, b) => {
        let aValue, bValue;

        switch (field) {
            case 'rank':
                aValue = parseInt(a.rank);
                bValue = parseInt(b.rank);
            case 'series':
                aValue = parseInt(a.series);
                bValue = parseInt(b.series);
                break;
            case 'title':
                if(a.tittle === undefined) aValue = '';
                else aValue = a.title.toLowerCase();
                if(b.tittle === undefined) bValue = '';
                else bValue = b.title.toLowerCase();
                break;
            case 'era':
                aValue = CONFIG.ERA_ORDER.indexOf(a.era);
                bValue = CONFIG.ERA_ORDER.indexOf(b.era);
                break;
            case 'director':
                aValue = a.director.toLowerCase();
                bValue = b.director.toLowerCase();
                break;
            case 'writer':
                aValue = a.writer.toLowerCase();
                bValue = b.writer.toLowerCase();
                break;
            case 'doctor':
                if(a.doctor.actor === undefined) aValue = '';
                else aValue = a.doctor.actor.toLowerCase();
                if(b.doctor.actor === undefined) bValue = '';
                else bValue = b.doctor.actor.toLowerCase();
                break;
            case 'companion':
                aValue = a.companion ? a.companion.actor.toLowerCase() : '';
                bValue = b.companion ? b.companion.actor.toLowerCase() : '';
                break;
            case 'broadcast_date':
                aValue = new Date(a.broadcast_date).getTime();
                bValue = new Date(b.broadcast_date).getTime();
                break;
            case 'cast':
                aValue = (a.cast === null) ? 0 : a.cast.length;
                bValue = (b.cast === null) ? 0 : b.cast.length;
                break;
            default:
                return 0;
        }

        return state.sort.ascending 
            ? aValue - bValue 
            : bValue - aValue;
    });

    displayEpisodes(state.filtered);
}

// Filtering Functions
function filterEpisodes() {
    const filterValue = state.filters.name;

    state.filtered = state.episodes.filter(ep => {
        if(ep.title === undefined) return '';
        return ep.title.toLowerCase().includes(filterValue);
    });
    
    displayEpisodes(state.filtered);
}

// Utility Functions
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
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

// Document Ready
document.addEventListener('DOMContentLoaded', init);


