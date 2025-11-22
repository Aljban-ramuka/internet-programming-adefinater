// Configuration
const CONFIG = {
    DATA_URL: '../doctor-who-episodes-exam.json',
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
        name: ''          // Current filter value
    }
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
    // TODO: Implement event listeners for:
    // 1. Filter input changes
    // 2. Column header clicks (sorting)
    // 3. Additional filter changes
}

// Data Loading
async function loadEpisodes() {
    try {
        showLoading(true);
        // TODO: Implement data fetching
        // 1. Fetch data from CONFIG.DATA_URL
        // 2. Parse response
        // 3. Store in state.episodes
        // 4. Update display
    } catch (error) {
        showError('Failed to load episodes: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Display Functions
function displayEpisodes(episodes) {
    // TODO: Implement episode display
    // 1. Clear existing rows
    // 2. Create row for each episode
    // 3. Format data properly
    // 4. Handle edge cases
}

// Sorting Functions
function sortEpisodes(field) {
    // TODO: Implement sorting logic
    // 1. Update sort state
    // 2. Sort episodes array
    // 3. Handle edge cases
    // 4. Update display
}

// Filtering Functions
function filterEpisodes() {
    // TODO: Implement filtering logic
    // 1. Apply current filters
    // 2. Update filtered episodes
    // 3. Update display
}

// Utility Functions
function formatDate(date) {
    // TODO: Implement date formatting
    // Handle multiple date formats
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

document.addEventListener('DOMContentLoaded', init);