// Configuration and constants
const DATA_URL = '../hugo-books-exam.json'; // Path to the exam data file
let books = [];
let filteredBooks = [];
let currentSort = { column: 'year', ascending: false }; // Default sort by year, newest first

// DOM elements (will be populated when DOM loads)
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    loadData();
    setupEventListeners();
});

/**
 * Initialize DOM element references
 */
function initializeElements() {
    // TODO: Get references to all necessary DOM elements
    loadingElement = document.getElementById('loading');
    errorElement = document.getElementById('error');
    tableBody = document.getElementById('booksTableBody');
    resultsCount = document.getElementById('resultsCount');
    noResults = document.getElementById('noResults');
    
    nameFilter = document.getElementById('nameFilter');
    winnerFilter = document.getElementById('winnerFilter');
    clearFiltersBtn = document.getElementById('clearFilters');
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
    // TODO: Add event listeners for:
    // - Filter inputs (text input, dropdowns)
    // - Sort buttons (table headers)
    // - Clear filters button

    // TODO: Add sort listeners to table headers
}

/**
 * Load book data from JSON file
 */
async function loadData() {
    try {
        showLoading(true);

        // TODO: Fetch data from DATA_URL
        // TODO: Handle successful response and errors
        // TODO: Call displayBooks() when data is loaded

    } catch (error) {
        console.error('Error loading data:', error);
        showError(true);
    } finally {
        showLoading(false);
    }
}

/**
 * Display books in the table
 */
function displayBooks() {
    // TODO: Render the filtered and sorted books in the table
    // TODO: Update results count
    // TODO: Show/hide no results message
    
    // Clear existing table content
    tableBody.innerHTML = '';
    
    // TODO: Update results count

    // Show/hide no results message
    if (filteredBooks.length === 0) {
        noResults.classList.remove('hidden');
        return;
    } else {
        noResults.classList.add('hidden');
    }
    
    // TODO: Create table rows for each book
    // For each book in filteredBooks:
    // - Create a table row
    // - Add cells for each column (title, author, type, award, publisher, series, genres)
    // - Handle edge cases (series: false/string/object, empty genres, special characters)
    // - Append row to tableBody
}

/**
 * Handle sorting by column
 */
function handleSort(column) {
    // TODO: Implement sorting logic
    // - If clicking same column, toggle direction
    // - If clicking different column, sort ascending
    // - Update currentSort object
    // - Sort filteredBooks array
    // - Update sort indicators in table headers
    // - Re-display books
    
    console.log('Sort by:', column);
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
    // TODO: Implement filtering logic
    // - Get current filter values
    // - Filter books array based on criteria
    // - Update filteredBooks array
    // - Re-display books
    
    console.log('Filters changed');
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    // TODO: Reset all filter inputs to default values
    // TODO: Reset filteredBooks to show all books
    // TODO: Re-display books
    
    console.log('Clear filters');
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    if (show) {
        loadingElement.classList.remove('hidden');
        errorElement.classList.add('hidden');
    } else {
        loadingElement.classList.add('hidden');
    }
}

/**
 * Show/hide error state
 */
function showError(show) {
    if (show) {
        errorElement.classList.remove('hidden');
        loadingElement.classList.add('hidden');
    } else {
        errorElement.classList.add('hidden');
    }
}


// Additional helper functions can be added here as needed

/* 
 * IMPLEMENTATION NOTES:
 * 
 * 1. Data Loading:
 *    - Use fetch() to load the JSON data
 *    - Handle loading states and errors gracefully
 *    - Store data in global variables for filtering/sorting
 * 
 * 2. Table Rendering:
 *    - Create table rows dynamically with JavaScript
 *    - Use textContent or innerHTML appropriately for security
 *    - Handle edge cases (null values, empty arrays, special characters)
 * 
 * 3. Sorting:
 *    - Implement ascending/descending toggle
 *    - Handle different data types (strings, numbers, booleans)
 *    - Update visual indicators (arrows) in table headers
 * 
 * 4. Filtering:
 *    - Text filter should be case-insensitive and search title + author
 *    - Winner filter should handle "all", "winners", "nominees"
 *    - Debounce text input for better performance (optional)
 * 
 * 5. Edge Cases to Handle:
 *    - Nested award object: extract award.year, award.category, award.is_winner
 *    - Format award display as "YYYY Winner" or "YYYY Nominee"
 *    - series: false vs string vs object {name, order}
 *    - Empty genres arrays
 *    - Special characters in titles (quotes, apostrophes, etc.)
 *    - Long titles that might overflow table cells
 *    - Mixed ID types (some string, some number)
 * 
 */