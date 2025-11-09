const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json';
const ERA_ORDER = ['Classic', 'Modern', 'Recent'];

const state = {
    episodes: [],
    filtered: [],
    sort: { field: 'rank', ascending: true },
    filters: { name: '', era: 'All' }
};

function init() {
    const searchInput = document.getElementById('search');
    const eraSelect = document.getElementById('era');

    searchInput.addEventListener('input', () => {
        state.filters.name = searchInput.value;
        filterEpisodes();
    });

    eraSelect.addEventListener('change', () => {
        state.filters.era = eraSelect.value;
        filterEpisodes();
    });

    document.querySelectorAll('th[data-field]').forEach(header => {
        const field = header.getAttribute('data-field');
        header.addEventListener('click', () => sortEpisodes(field));
    });

    loadData();
}

async function loadData() {
    showLoading(true);
    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        state.episodes = Array.isArray(data) ? data : data.episodes;

        if (!Array.isArray(state.episodes)) throw new Error('Invalid JSON structure');

        state.episodes = state.episodes.map(ep => ({ ...ep, era: ep.era || 'Classic' }));

        applySorting();
        filterEpisodes();
        console.log(`✅ Loaded ${state.episodes.length} episodes`);
    } catch (err) {
        console.error('❌ Failed to fetch episodes:', err);
        showError('Failed to load episodes.');
    } finally {
        showLoading(false);
    }
}

function displayEpisodes(episodes) {
    const tbody = document.getElementById('episodes-body');
    tbody.innerHTML = '';

    if (!episodes.length) {
        document.getElementById('episodes-table').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
        return;
    }

    document.getElementById('episodes-table').style.display = 'table';
    document.getElementById('no-results').style.display = 'none';

    episodes.forEach(ep => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ep.rank ?? 'N/A'}</td>
            <td>${escapeHtml(ep.title ?? 'Unknown')}</td>
            <td>${ep.series ?? 'N/A'}</td>
            <td>${ep.era ?? 'Unknown'}</td>
            <td>${extractYear(ep.broadcast_date)}</td>
            <td>${escapeHtml(ep.director ?? 'Unknown')}</td>
            <td>${formatWriters(ep.writer)}</td>
            <td>${formatDoctor(ep.doctor)}</td>
            <td>${formatCompanion(ep.companion)}</td>
            <td>${ep.cast?.length ?? 0}</td>
        `;
        tbody.appendChild(row);
    });

    updateSortIndicators();
}

function sortEpisodes(field) {
    if (state.sort.field === field) state.sort.ascending = !state.sort.ascending;
    else { state.sort.field = field; state.sort.ascending = true; }

    applySorting();
    displayEpisodes(state.filtered);
}

function applySorting() {
    const { field, ascending } = state.sort;

    state.filtered.sort((a, b) => {
        let aVal, bVal;

        switch(field) {
            case 'rank':
            case 'series':
            case 'cast':
                aVal = field === 'cast' ? (a.cast?.length ?? 0) : (a[field] ?? 0);
                bVal = field === 'cast' ? (b.cast?.length ?? 0) : (b[field] ?? 0);
                return ascending ? aVal - bVal : bVal - aVal;

            case 'broadcast_year':
                aVal = extractYear(a.broadcast_date);
                bVal = extractYear(b.broadcast_date);
                return ascending ? aVal - bVal : bVal - aVal;

            case 'era':
                aVal = ERA_ORDER.indexOf(a.era ?? '');
                bVal = ERA_ORDER.indexOf(b.era ?? '');
                return ascending ? aVal - bVal : bVal - aVal;

            case 'doctor':
                aVal = (a.doctor?.actor ?? '').toLowerCase();
                bVal = (b.doctor?.actor ?? '').toLowerCase();
                break;

            case 'companion':
                aVal = (a.companion?.actor ?? '').toLowerCase();
                bVal = (b.companion?.actor ?? '').toLowerCase();
                break;

            case 'writer':
                aVal = formatWriters(a.writer).toLowerCase();
                bVal = formatWriters(b.writer).toLowerCase();
                break;

            default:
                aVal = (a[field] ?? '').toString().toLowerCase();
                bVal = (b[field] ?? '').toString().toLowerCase();
        }

        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

function filterEpisodes() {
    const term = state.filters.name.toLowerCase().trim();
    const eraFilter = state.filters.era;

    state.filtered = state.episodes.filter(ep => {
        const matchesEra = eraFilter === 'All' || ep.era === eraFilter;
        const matchesTerm = !term || (
            (ep.title ?? '').toLowerCase().includes(term) ||
            (ep.director ?? '').toLowerCase().includes(term) ||
            formatWriters(ep.writer).toLowerCase().includes(term) ||
            (ep.doctor?.actor ?? '').toLowerCase().includes(term) ||
            (ep.doctor?.incarnation ?? '').toLowerCase().includes(term) ||
            (ep.companion?.actor ?? '').toLowerCase().includes(term) ||
            (ep.companion?.character ?? '').toLowerCase().includes(term) ||
            (ep.era ?? '').toLowerCase().includes(term)
        );
        return matchesEra && matchesTerm;
    });

    applySorting();
    displayEpisodes(state.filtered);
}

function extractYear(date) {
    if (!date) return 'N/A';
    const y = date.match(/\d{4}/);
    return y ? parseInt(y[0]) : 'N/A';
}

function formatDoctor(doc) {
    if (!doc?.actor) return 'Unknown';
    return escapeHtml(`${doc.actor} (${doc.incarnation ?? 'Unknown'})`);
}

function formatCompanion(comp) {
    if (!comp?.actor) return 'None';
    return escapeHtml(`${comp.actor} (${comp.character ?? 'Unknown'})`);
}

function formatWriters(writer) {
    if (!writer) return 'Unknown';
    if (Array.isArray(writer)) return writer.map(w => escapeHtml(w)).join(', ');
    return escapeHtml(writer.replace(/\s*&\s*|\s+and\s+/g, ', '));
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('episodes-table').style.display = show ? 'none' : 'table';
}

function showError(msg) {
    const errorEl = document.getElementById('error');
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = msg ? 'block' : 'none'; }
}

function updateSortIndicators() {
    document.querySelectorAll('th[data-field]').forEach(header => {
        header.classList.remove('sort-asc','sort-desc');
        if (header.getAttribute('data-field') === state.sort.field) {
            header.classList.add(state.sort.ascending ? 'sort-asc':'sort-desc');
        }
    });
}

document.addEventListener('DOMContentLoaded', init);