// Configuration and constants
const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json';
let books = [];
let filteredBooks = [];
let currentSort = { column: 'year', ascending: false }; // Default sort by year, newest first

// DOM elements (will be populated when DOM loads)
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;

// Performance tracking
let performanceMetrics = {
    loadTime: 0,
    filterTime: 0,
    sortTime: 0
};

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
    // Get references to all necessary DOM elements
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
    // Add event listeners for filter inputs
    nameFilter.addEventListener('input', debounce(handleFilterChange, 300));
    winnerFilter.addEventListener('change', handleFilterChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);

    // Add sort listeners to table headers
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            handleSort(column);
        });
    });

    // Keyboard navigation for table
    document.addEventListener('keydown', handleKeyboardNavigation);
}

/**
 * Load book data from JSON file
 */
async function loadData() {
    const startTime = performance.now();
    
    try {
        showLoading(true);

        // Fetch data from DATA_URL
        const response = await fetch(DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle successful response
        books = data.books || data || [];
        filteredBooks = [...books];
        
        // Data validation - log warnings for data issues
        validateData(books);
        
        // Populate winner filter options
        populateWinnerFilter();
        
        // Display books
        displayBooks();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(true);
    } finally {
        showLoading(false);
        performanceMetrics.loadTime = performance.now() - startTime;
        console.log(`Data loaded in ${performanceMetrics.loadTime.toFixed(2)}ms`);
    }
}

/**
 * Data Validation Feature (Tier 3 - 5 points)
 * Logs console warnings for data quality issues
 */
function validateData(books) {
    const warnings = {
        missingFields: 0,
        futureYears: 0,
        duplicateIds: 0,
        invalidWinnerStatus: 0
    };

    const seenIds = new Set();
    const currentYear = new Date().getFullYear();

    books.forEach((book, index) => {
        // Check for missing required fields
        if (!book.title || !book.author || !book.award) {
            warnings.missingFields++;
            console.warn(`Missing required fields for book at index ${index}:`, book);
        }

        // Check for future publication years
        if (book.award?.year > currentYear + 1) { // Allow +1 for upcoming awards
            warnings.futureYears++;
            console.warn(`Suspicious future award year ${book.award.year} for:`, book.title);
        }

        // Check for duplicate IDs
        const bookId = String(book.id);
        if (seenIds.has(bookId)) {
            warnings.duplicateIds++;
            console.warn(`Duplicate ID ${bookId} found for:`, book.title);
        }
        seenIds.add(bookId);

        // Check for invalid winner status
        if (book.award && typeof book.award.is_winner !== 'boolean') {
            warnings.invalidWinnerStatus++;
            console.warn(`Invalid winner status for:`, book.title, book.award);
        }
    });

    // Log summary
    if (Object.values(warnings).some(count => count > 0)) {
        console.warn('Data Validation Summary:', warnings);
        
        // Optional: Display warning count in UI
        displayValidationWarnings(warnings);
    }
}

/**
 * Display validation warnings in UI (optional enhancement)
 */
function displayValidationWarnings(warnings) {
    const totalWarnings = Object.values(warnings).reduce((sum, count) => sum + count, 0);
    if (totalWarnings > 0) {
        console.log(`Data validation: ${totalWarnings} warnings found (see console for details)`);
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
 * Display books in the table
 */
function displayBooks() {
    // Clear existing table content
    tableBody.innerHTML = '';
    
    // Update results count
    resultsCount.textContent = `Showing ${filteredBooks.length} of ${books.length} books`;
    
    // Show/hide no results message
    if (filteredBooks.length === 0) {
        noResults.classList.remove('hidden');
        return;
    } else {
        noResults.classList.add('hidden');
    }
    
    // Performance optimization: Use DocumentFragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    
    filteredBooks.forEach((book, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-book-id', book.id);
        row.setAttribute('tabindex', '0'); // For keyboard navigation
        
        // Format award display
        const awardYear = book.award?.year || 'Unknown';
        const isWinner = book.award?.is_winner || false;
        const awardDisplay = `${awardYear} ${isWinner ? 'Winner' : 'Nominee'}`;
        
        // Format series display
        let seriesDisplay = '';
        if (book.series === false) {
            seriesDisplay = '<span class="no-series">Standalone</span>';
        } else if (typeof book.series === 'string') {
            seriesDisplay = `<span class="series-name">${escapeHtml(book.series)}</span>`;
        } else if (book.series && book.series.name) {
            const order = book.series.order ? ` (#${book.series.order})` : '';
            seriesDisplay = `<span class="series-name">${escapeHtml(book.series.name)}${order}</span>`;
        } else {
            seriesDisplay = '<span class="no-series">-</span>';
        }
        
        // Format genres display
        let genresDisplay = '';
        if (book.genres && book.genres.length > 0) {
            genresDisplay = book.genres.map(genre => 
                `<span class="genre-tag">${escapeHtml(genre)}</span>`
            ).join('');
        } else {
            genresDisplay = '<span class="no-genres">No genres</span>';
        }
        
        // Create cells for each column
        row.innerHTML = `
            <td>${escapeHtml(book.title || 'Unknown Title')}</td>
            <td>${escapeHtml(book.author || 'Unknown Author')}</td>
            <td><span class="book-type">${escapeHtml(book.category || book.type || 'Unknown')}</span></td>
            <td>
                <span class="winner-badge ${isWinner ? 'winner' : 'nominee'}">
                    ${awardDisplay}
                </span>
            </td>
            <td>${escapeHtml(book.publisher || 'Unknown')}</td>
            <td>${seriesDisplay}</td>
            <td><div class="genres-list">${genresDisplay}</div></td>
        `;
        
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
}

/**
 * Smart Relevance Sort Feature (Tier 3 - 5 points)
 * When filtering, sorts results by:
 * 1. Exact title matches
 * 2. Title contains search term
 * 3. Author contains search term  
 * 4. Any field contains search term
 * 5. Default year order (newest first)
 */
function applyRelevanceSort(searchTerm) {
    if (!searchTerm) return;
    
    const term = searchTerm.toLowerCase();
    
    filteredBooks.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aAuthor = (a.author || '').toLowerCase();
        const bAuthor = (b.author || '').toLowerCase();
        const aPublisher = (a.publisher || '').toLowerCase();
        const bPublisher = (b.publisher || '').toLowerCase();
        
        // Score each book for relevance
        let aScore = 0;
        let bScore = 0;
        
        // 1. Exact title match (highest priority)
        if (aTitle === term) aScore += 100;
        if (bTitle === term) bScore += 100;
        
        // 2. Title starts with search term
        if (aTitle.startsWith(term)) aScore += 50;
        if (bTitle.startsWith(term)) bScore += 50;
        
        // 3. Title contains search term
        if (aTitle.includes(term)) aScore += 25;
        if (bTitle.includes(term)) bScore += 25;
        
        // 4. Author contains search term
        if (aAuthor.includes(term)) aScore += 10;
        if (bAuthor.includes(term)) bScore += 10;
        
        // 5. Publisher contains search term
        if (aPublisher.includes(term)) aScore += 5;
        if (bPublisher.includes(term)) bScore += 5;
        
        // If different relevance scores, sort by score
        if (aScore !== bScore) {
            return bScore - aScore;
        }
        
        // Same relevance: sort by year (newest first)
        const aYear = a.award?.year || 0;
        const bYear = b.award?.year || 0;
        return bYear - aYear;
    });
}

/**
 * Handle sorting by column
 */
function handleSort(column) {
    const startTime = performance.now();
    
    // If clicking same column, toggle direction
    // If clicking different column, sort ascending
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }
    
    // Sort filteredBooks array
    filteredBooks.sort((a, b) => {
        let aValue = getSortValue(a, column);
        let bValue = getSortValue(b, column);
        
        // Handle different data types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
            return currentSort.ascending ? -1 : 1;
        }
        if (aValue > bValue) {
            return currentSort.ascending ? 1 : -1;
        }
        return 0;
    });
    
    // Update sort indicators in table headers
    updateSortIndicators();
    
    // Re-display books
    displayBooks();
    
    performanceMetrics.sortTime = performance.now() - startTime;
    console.log(`Sorted by ${column} in ${performanceMetrics.sortTime.toFixed(2)}ms`);
}

/**
 * Get value for sorting based on column name
 */
function getSortValue(book, column) {
    switch (column) {
        case 'title':
            return book.title || '';
        case 'author':
            return book.author || '';
        case 'category':
            return book.category || book.type || '';
        case 'award':
            return book.award?.year || 0;
        case 'publisher':
            return book.publisher || '';
        case 'series':
            if (book.series === false) return '';
            if (typeof book.series === 'string') return book.series;
            if (book.series && book.series.name) return book.series.name;
            return '';
        case 'genres':
            return book.genres ? book.genres.join(', ') : '';
        default:
            return '';
    }
}

/**
 * Update visual sort indicators in table headers
 */
function updateSortIndicators() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    sortableHeaders.forEach(header => {
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
    const startTime = performance.now();
    
    // Get current filter values
    const nameFilterValue = nameFilter.value.toLowerCase().trim();
    const winnerFilterValue = winnerFilter.value;
    
    // Filter books array based on criteria
    filteredBooks = books.filter(book => {
        // Name filter (title or author)
        const matchesName = nameFilterValue === '' || 
            (book.title && book.title.toLowerCase().includes(nameFilterValue)) ||
            (book.author && book.author.toLowerCase().includes(nameFilterValue));
        
        // Winner status filter
        const matchesWinner = winnerFilterValue === 'all' ||
            (winnerFilterValue === 'winner' && book.award?.is_winner) ||
            (winnerFilterValue === 'nominee' && !book.award?.is_winner);
        
        return matchesName && matchesWinner;
    });
    
    // Apply smart relevance sort when searching
    if (nameFilterValue) {
        applyRelevanceSort(nameFilterValue);
    } else if (currentSort.column) {
        // Apply current sort if no search term
        handleSort(currentSort.column);
    }
    
    // Re-display books
    displayBooks();
    
    performanceMetrics.filterTime = performance.now() - startTime;
    console.log(`Filtered results in ${performanceMetrics.filterTime.toFixed(2)}ms`);
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    // Reset all filter inputs to default values
    nameFilter.value = '';
    winnerFilter.value = 'all';
    
    // Reset filteredBooks to show all books
    filteredBooks = [...books];
    
    // Re-display books
    displayBooks();
}

/**
 * Keyboard Navigation Feature (Tier 3 - 5 points)
 * - Arrow keys: Navigate table rows
 * - Enter: Sort by focused column
 * - Tab/Shift+Tab: Move between filters
 * - Visual feedback for current focus
 */
function handleKeyboardNavigation(event) {
    const focusedElement = document.activeElement;
    const currentRow = focusedElement.closest('tr');
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentRow && currentRow.nextElementSibling) {
                currentRow.nextElementSibling.focus();
            } else if (tableBody.firstElementChild) {
                tableBody.firstElementChild.focus();
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            if (currentRow && currentRow.previousElementSibling) {
                currentRow.previousElementSibling.focus();
            }
            break;
            
        case 'Enter':
            if (focusedElement.classList.contains('sortable')) {
                const column = focusedElement.getAttribute('data-column');
                handleSort(column);
            }
            break;
            
        case 'Escape':
            clearAllFilters();
            break;
    }
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
 * Utility function to escape HTML for security
 */
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function displayValidationWarnings(warnings) {
    const totalWarnings = Object.values(warnings).reduce((sum, count) => sum + count, 0);
    
    if (totalWarnings > 0) {
        // Create or update warning display in the results info section
        let warningElement = document.getElementById('dataWarnings');
        
        if (!warningElement) {
            warningElement = document.createElement('div');
            warningElement.id = 'dataWarnings';
            warningElement.className = 'data-warnings';
            resultsCount.parentNode.insertBefore(warningElement, resultsCount.nextSibling);
        }
        
        warningElement.innerHTML = `
            <span class="warning-icon">⚠️</span>
            Data quality: ${totalWarnings} warnings found
            <button onclick="this.parentElement.style.display='none'" class="warning-close">×</button>
        `;
        
        // Add click to show details in console
        warningElement.style.cursor = 'pointer';
        warningElement.addEventListener('click', () => {
            console.log('Data Validation Details:', warnings);
            alert(`Data Validation Warnings:\n\n` +
                  `Missing Fields: ${warnings.missingFields}\n` +
                  `Future Years: ${warnings.futureYears}\n` +
                  `Duplicate IDs: ${warnings.duplicateIds}\n` +
                  `Invalid Winner Status: ${warnings.invalidWinnerStatus}\n\n` +
                  `See browser console for full details.`);
        });
    } else {
        // Remove warning element if no warnings
        const warningElement = document.getElementById('dataWarnings');
        if (warningElement) {
            warningElement.remove();
        }
    }
}