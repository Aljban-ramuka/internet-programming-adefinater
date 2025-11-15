// Configuration
const CONFIG = {
    DATA_URL: 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json'
};

// State
let state = {
    episodes: [],
    filtered: [],
    sort: {
        field: 'rank',
        ascending: true
    },
    filters: {
        name: '',
        era: ''
    }
};

// Initialize
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event listeners
function setupEventListeners() {
    document.getElementById('name-filter').addEventListener('input', (e) => {
        state.filters.name = e.target.value.toLowerCase();
        filterEpisodes();
    });

    document.getElementById('era-filter').addEventListener('change', (e) => {
        state.filters.era = e.target.value.toLowerCase();
        filterEpisodes();
    });

    document.querySelectorAll('th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            sortEpisodes(field);
        });
    });
}

// Load episodes
async function loadEpisodes() {
    showLoading(true);
    try {
        const response = await fetch(CONFIG.DATA_URL);
        const data = await response.json();

        if (data && Array.isArray(data.episodes)) {
            state.episodes = data.episodes;
            state.filtered = [...state.episodes];
            displayEpisodes(state.filtered);
        } else {
            throw new Error('Episodes data not found.');
        }
    } catch (err) {
        showError('Failed to load episodes: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// Filter episodes
function filterEpisodes() {
    state.filtered = state.episodes.filter(ep => {
        const nameMatch = ep.title && ep.title.toLowerCase().includes(state.filters.name);

        // Normalize era to lowercase for comparison
        const episodeEra = ep.era ? ep.era.toLowerCase().trim() : '';
        const eraMatch = state.filters.era ? episodeEra === state.filters.era : true;

        return nameMatch && eraMatch;
    });

    sortEpisodes(state.sort.field);
}

// Sort episodes
function sortEpisodes(field) {
    const ascending = state.sort.field === field ? !state.sort.ascending : true;
    state.sort = { field, ascending };

    state.filtered.sort((a, b) => {
        let valA, valB;

        switch (field) {
            case 'rank':
            case 'series':
                valA = Number(a[field]) || 0;
                valB = Number(b[field]) || 0;
                break;
            case 'doctor':
                valA = a.doctor ? a.doctor.actor : '';
                valB = b.doctor ? b.doctor.actor : '';
                break;
            case 'companion':
                valA = a.companion ? a.companion.actor : '';
                valB = b.companion ? b.companion.actor : '';
                break;
            case 'cast':
                valA = a.cast ? a.cast.length : 0;
                valB = b.cast ? b.cast.length : 0;
                break;
            default:
                valA = a[field] ? a[field].toString().toLowerCase() : '';
                valB = b[field] ? b[field].toString().toLowerCase() : '';
        }

        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
    });

    displayEpisodes(state.filtered);
}

// Display episodes
function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    tbody.innerHTML = '';

    if (episodes.length === 0) {
        document.getElementById('no-results').style.display = 'block';
        return;
    } else {
        document.getElementById('no-results').style.display = 'none';
    }

    episodes.forEach(ep => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ep.rank || '—'}</td>
            <td>${ep.title || '—'}</td>
            <td>${ep.series || '—'}</td>
            <td>${ep.era || '—'}</td>
            <td>${ep.broadcast_date || '—'}</td>
            <td>${ep.director || '—'}</td>
            <td>${ep.writer ? ep.writer.split('&').join(', ') : '—'}</td>
            <td>${ep.doctor ? `${ep.doctor.actor} (${ep.doctor.incarnation})` : '—'}</td>
            <td>${ep.companion ? `${ep.companion.actor} (${ep.companion.character})` : '—'}</td>
            <td>${ep.cast ? ep.cast.length : 0}</td>
        `;
        tbody.appendChild(row);
    });
}

// Show/hide loading
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = show ? 'none' : 'table';
}

// Show error
function showError(msg) {
    const el = document.getElementById('error');
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
}

// Inita
document.addEventListener('DOMContentLoaded', init);