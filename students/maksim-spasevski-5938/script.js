// Configuration and constants
const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json';
let books = [];
let filteredBooks = [];
let currentSort = { column: 'award', ascending: false };
let isFiltering = false; // Track if we're currently filtering

// Performance optimization constants
const DEBOUNCE_DELAY = 150; // Delay for filter input

// DOM elements
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;
let performanceInfo; // For performance stats display

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
    loadingElement = document.getElementById('loading');
    errorElement = document.getElementById('error');
    tableBody = document.getElementById('booksTableBody');
    resultsCount = document.getElementById('resultsCount');
    noResults = document.getElementById('noResults');
    
    nameFilter = document.getElementById('nameFilter');
    winnerFilter = document.getElementById('winnerFilter');
    clearFiltersBtn = document.getElementById('clearFilters');

    // Create performance info element
    performanceInfo = document.createElement('div');
    performanceInfo.className = 'performance-info';
    performanceInfo.style.fontSize = '0.8em';
    performanceInfo.style.color = '#6c757d';
    performanceInfo.style.marginTop = '5px';
    performanceInfo.style.fontStyle = 'italic';
    document.querySelector('.results-info').appendChild(performanceInfo);
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
    // Filter event listeners with optimized debouncing
    nameFilter.addEventListener('input', debounce(handleFilterChange, DEBOUNCE_DELAY));
    winnerFilter.addEventListener('change', handleFilterChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);

    // Sort event listeners for table headers
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            handleSort(column);
        });
    });
}

/**
 * Load book data from JSON file
 */
async function loadData() {
    try {
        showLoading(true);
        showError(false);

        const startTime = performance.now();
        const response = await fetch(DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        books = data.books || data;
        filteredBooks = [...books];
        
        const loadTime = performance.now() - startTime;
        console.log(`Data loaded in ${loadTime.toFixed(2)}ms: ${books.length} books`);
        
        // Populate winner filter dropdown
        populateWinnerFilter();
        
        // Apply default sort and display
        applySort();
        displayBooks();
        
        // Show performance stats
        updatePerformanceInfo(`Loaded ${books.length} books in ${loadTime.toFixed(0)}ms`);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(true);
    } finally {
        showLoading(false);
    }
}

/**
 * Populate winner filter dropdown
 */
function populateWinnerFilter() {
    winnerFilter.innerHTML = `
        <option value="all">All books</option>
        <option value="winner">Winners only</option>
        <option value="nominee">Nominees only</option>
    `;
}

/**
 * Display books in the table with optimized rendering
 */
function displayBooks() {
    const startTime = performance.now();
    
    // Clear existing table content
    tableBody.innerHTML = '';
    
    // Reset any virtual scrolling styles
    tableBody.style.height = '';
    
    // Update results count
    resultsCount.textContent = `Showing ${filteredBooks.length} of ${books.length} books`;
    
    // Show/hide no results message
    if (filteredBooks.length === 0) {
        noResults.classList.remove('hidden');
        performanceInfo.textContent = '';
        return;
    } else {
        noResults.classList.add('hidden');
    }

    // Use document fragment for efficient rendering
    const fragment = document.createDocumentFragment();
    
    filteredBooks.forEach(book => {
        const row = createTableRow(book);
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
    
    const renderTime = performance.now() - startTime;
    updatePerformanceInfo(`Rendered ${filteredBooks.length} books in ${renderTime.toFixed(0)}ms`);
}

/**
 * Create a table row for a book
 */
function createTableRow(book) {
    const row = document.createElement('tr');
    
    // Format the award display
    const awardYear = book.award.year;
    const awardStatus = book.award.is_winner ? 'Winner' : 'Nominee';
    const awardDisplay = `${awardYear} ${awardStatus}`;
    
    // Format series display
    const seriesDisplay = formatSeries(book.series);
    
    // Format genres display
    const genresDisplay = formatGenres(book.genres);
    
    row.innerHTML = `
        <td>${escapeHtml(book.title)}</td>
        <td>${escapeHtml(book.author)}</td>
        <td>${escapeHtml(book.award.category)}</td>
        <td>
            <span class="winner-badge ${book.award.is_winner ? 'winner' : 'nominee'}">
                ${awardDisplay}
            </span>
        </td>
        <td>${escapeHtml(book.publisher)}</td>
        <td>${seriesDisplay}</td>
        <td>${genresDisplay}</td>
    `;
    
    return row;
}

/**
 * Format series information for display
 */
function formatSeries(series) {
    if (series === false) {
        return '<span class="no-series">None</span>';
    }
    
    if (typeof series === 'string') {
        return `<span class="series-name">${escapeHtml(series)}</span>`;
    }
    
    if (typeof series === 'object' && series !== null) {
        const order = series.order ? ` (#${series.order})` : '';
        return `<span class="series-name">${escapeHtml(series.name)}${order}</span>`;
    }
    
    return '<span class="no-series">None</span>';
}

/**
 * Format genres array for display
 */
function formatGenres(genres) {
    if (!genres || genres.length === 0) {
        return '<span class="no-genres">None</span>';
    }
    
    return genres.map(genre => 
        `<span class="genre-tag">${escapeHtml(genre)}</span>`
    ).join(' ');
}

/**
 * Handle sorting by column
 */
function handleSort(column) {
    // Smart relevance: if filtering, use relevance sort when sorting by default
    if (isFiltering && column === 'year') {
        applyRelevanceSort();
    } else {
        // If clicking same column, toggle direction
        if (currentSort.column === column) {
            currentSort.ascending = !currentSort.ascending;
        } else {
            // If clicking different column, sort ascending
            currentSort.column = column;
            currentSort.ascending = true;
        }
        
        applySort();
    }
    
    updateSortIndicators();
    displayBooks();
}

/**
 * Apply current sort to filteredBooks
 */
function applySort() {
    const startTime = performance.now();
    
    filteredBooks.sort((a, b) => {
        let valueA, valueB;
        
        switch (currentSort.column) {
            case 'title':
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
                break;
            case 'author':
                valueA = a.author.toLowerCase();
                valueB = b.author.toLowerCase();
                break;
            case 'category':
                valueA = a.award.category.toLowerCase();
                valueB = b.award.category.toLowerCase();
                break;
            case 'award':
                // Sort by year first, then by winner status
                valueA = a.award.year;
                valueB = b.award.year;
                // If years are equal, winners come first
                if (valueA === valueB) {
                    return a.award.is_winner === b.award.is_winner ? 0 : a.award.is_winner ? -1 : 1;
                }
                break;
            case 'publisher':
                valueA = a.publisher.toLowerCase();
                valueB = b.publisher.toLowerCase();
                break;
            case 'series':
                valueA = getSeriesValue(a.series).toLowerCase();
                valueB = getSeriesValue(b.series).toLowerCase();
                break;
            case 'genres':
                valueA = a.genres.join(', ').toLowerCase();
                valueB = b.genres.join(', ').toLowerCase();
                break;
            default:
                valueA = a.award.year;
                valueB = b.award.year;
        }
        
        // Handle comparison based on data type
        let result;
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            result = valueA - valueB;
        } else {
            result = String(valueA).localeCompare(String(valueB));
        }
        
        return currentSort.ascending ? result : -result;
    });
    
    const sortTime = performance.now() - startTime;
    if (sortTime > 10) {
        console.log(`Sort completed in ${sortTime.toFixed(2)}ms`);
    }
}

/**
 * Apply smart relevance sort when filtering
 * TIER 3 FEATURE: Smart Relevance Sort
 * When filtering, sort results by:
 * 1. Exact title matches
 * 2. Title contains search term  
 * 3. Any field contains search term
 * 4. Default year order
 */
function applyRelevanceSort() {
    const searchTerm = nameFilter.value.toLowerCase().trim();
    if (!searchTerm) {
        applySort(); // Use normal sort if no search term
        return;
    }

    const startTime = performance.now();
    
    filteredBooks.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a, searchTerm);
        const scoreB = calculateRelevanceScore(b, searchTerm);
        
        // Higher scores first (more relevant), then by year for ties
        if (scoreB !== scoreA) {
            return scoreB - scoreA;
        } else {
            return b.award.year - a.award.year; // Newer years first for ties
        }
    });
    
    const sortTime = performance.now() - startTime;
    console.log(`Relevance sort completed in ${sortTime.toFixed(2)}ms`);
}

/**
 * Calculate relevance score for a book based on search term
 */
function calculateRelevanceScore(book, searchTerm) {
    let score = 0;
    
    // Exact title match (highest priority)
    if (book.title.toLowerCase() === searchTerm) {
        score += 100;
    }
    
    // Title starts with search term
    if (book.title.toLowerCase().startsWith(searchTerm)) {
        score += 50;
    }
    
    // Title contains search term
    if (book.title.toLowerCase().includes(searchTerm)) {
        score += 30;
    }
    
    // Author exact match
    if (book.author.toLowerCase() === searchTerm) {
        score += 40;
    }
    
    // Author contains search term
    if (book.author.toLowerCase().includes(searchTerm)) {
        score += 20;
    }
    
    // Series contains search term
    const seriesValue = getSeriesValue(book.series).toLowerCase();
    if (seriesValue.includes(searchTerm)) {
        score += 15;
    }
    
    // Genres contain search term
    const genresText = book.genres.join(' ').toLowerCase();
    if (genresText.includes(searchTerm)) {
        score += 10;
    }
    
    // Publisher contains search term
    if (book.publisher.toLowerCase().includes(searchTerm)) {
        score += 5;
    }
    
    // Boost winners slightly
    if (book.award.is_winner) {
        score += 2;
    }
    
    // Slight boost for newer books (recency bias)
    const currentYear = new Date().getFullYear();
    const yearDiff = currentYear - book.award.year;
    if (yearDiff <= 10) {
        score += 1;
    }
    
    return score;
}

/**
 * Get sortable value for series
 */
function getSeriesValue(series) {
    if (series === false) return '';
    if (typeof series === 'string') return series;
    if (typeof series === 'object' && series !== null) return series.name;
    return '';
}

/**
 * Update sort indicators in table headers
 */
function updateSortIndicators() {
    const headers = document.querySelectorAll('.sortable');
    
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        
        if (header.getAttribute('data-column') === currentSort.column) {
            header.classList.add(currentSort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
    const searchTerm = nameFilter.value.toLowerCase().trim();
    const winnerStatus = winnerFilter.value;
    
    isFiltering = searchTerm.length > 0 || winnerStatus !== 'all';
    
    const startTime = performance.now();
    
    filteredBooks = books.filter(book => {
        // Text filter (title or author) - case insensitive
        const matchesText = searchTerm === '' || 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm);
        
        // Winner status filter
        const matchesWinner = winnerStatus === 'all' ||
            (winnerStatus === 'winner' && book.award.is_winner) ||
            (winnerStatus === 'nominee' && !book.award.is_winner);
        
        return matchesText && matchesWinner;
    });
    
    const filterTime = performance.now() - startTime;
    
    // Apply smart relevance sort when filtering
    if (isFiltering && searchTerm) {
        applyRelevanceSort();
        updatePerformanceInfo(`Found ${filteredBooks.length} books in ${filterTime.toFixed(0)}ms (relevance sorted)`);
    } else {
        // Re-apply current sort
        applySort();
        updatePerformanceInfo(`Found ${filteredBooks.length} books in ${filterTime.toFixed(0)}ms`);
    }
    
    displayBooks();
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    nameFilter.value = '';
    winnerFilter.value = 'all';
    isFiltering = false;
    handleFilterChange();
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

/**
 * Update performance information display
 */
function updatePerformanceInfo(message) {
    performanceInfo.textContent = message;
}

/**
 * Debounce function to limit rapid filter updates
 * TIER 3 FEATURE: Performance Optimization - Debouncing
 * Prevents excessive filtering during rapid typing for better performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Escape HTML to prevent XSS and handle special characters
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}