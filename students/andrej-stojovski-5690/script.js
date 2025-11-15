// Configuration and constants
const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json';
let books = [];
let filteredBooks = [];
let currentSort = { column: null, ascending: true };

// DOM elements (will be populated when DOM loads)
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn, decadeFilter, authorFilter, exportBtn, validationWarnings;

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
    decadeFilter = document.getElementById('decadeFilter');
    authorFilter = document.getElementById('authorFilter');
    clearFiltersBtn = document.getElementById('clearFilters');
    exportBtn = document.getElementById('exportBtn');
    validationWarnings = document.getElementById('validationWarnings');
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
    // Filter inputs
    nameFilter.addEventListener('input', handleFilterChange);
    winnerFilter.addEventListener('change', handleFilterChange);
    decadeFilter.addEventListener('change', handleFilterChange);
    authorFilter.addEventListener('change', handleFilterChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    exportBtn.addEventListener('click', exportToCSV);

    // Sort listeners for table headers
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const column = this.getAttribute('data-column');
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

        const response = await fetch(DATA_URL);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        
        // Extract books array from response
        books = data.books || data;
        
        // Data Validation (Tier 3 - 5 points)
        validateData(books);
        
        // Populate filter dropdowns
        populateDecadeFilter();
        populateAuthorFilter();
        
        filteredBooks = [...books];
        
        displayBooks();

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
    
    // Create table rows for each book
    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        
        // Title
        const titleCell = document.createElement('td');
        titleCell.textContent = book.title;
        titleCell.style.fontWeight = '500';
        row.appendChild(titleCell);
        
        // Author
        const authorCell = document.createElement('td');
        authorCell.textContent = book.author;
        row.appendChild(authorCell);
        
        // Type (Category)
        const categoryCell = document.createElement('td');
        categoryCell.textContent = book.award.category;
        categoryCell.style.color = '#64748b';
        row.appendChild(categoryCell);
        
        // Award (formatted as "YYYY Winner" or "YYYY Nominee")
        const awardCell = document.createElement('td');
        const awardBadge = document.createElement('span');
        awardBadge.className = `winner-badge ${book.award.is_winner ? 'winner' : 'nominee'}`;
        awardBadge.textContent = `${book.award.year} ${book.award.is_winner ? 'Winner' : 'Nominee'}`;
        awardCell.appendChild(awardBadge);
        row.appendChild(awardCell);
        
        // Publisher
        const publisherCell = document.createElement('td');
        publisherCell.textContent = book.publisher;
        row.appendChild(publisherCell);
        
        // Series (handle false, string, and object formats)
        const seriesCell = document.createElement('td');
        seriesCell.className = 'series-name';
        if (book.series === false) {
            seriesCell.textContent = '—';
            seriesCell.className = 'no-series';
        } else if (typeof book.series === 'string') {
            seriesCell.textContent = book.series;
        } else if (typeof book.series === 'object' && book.series.name) {
            seriesCell.textContent = `${book.series.name} (#${book.series.order})`;
        } else {
            seriesCell.textContent = '—';
            seriesCell.className = 'no-series';
        }
        row.appendChild(seriesCell);
        
        // Genres (display as tags or "—" if empty)
        const genresCell = document.createElement('td');
        if (book.genres && book.genres.length > 0) {
            book.genres.forEach(genre => {
                const genreTag = document.createElement('span');
                genreTag.className = 'genre-tag';
                genreTag.textContent = genre;
                genresCell.appendChild(genreTag);
            });
        } else {
            genresCell.textContent = '—';
            genresCell.className = 'no-genres';
        }
        row.appendChild(genresCell);
        
        tableBody.appendChild(row);
    });
}

/**
 * Handle sorting by column
 */
function handleSort(column) {
    // If clicking same column, toggle direction, otherwise start ascending
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }
    
    // Sort filteredBooks array
    filteredBooks.sort((a, b) => {
        let aValue, bValue;
        
        switch (column) {
            case 'title':
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
            case 'author':
                aValue = a.author.toLowerCase();
                bValue = b.author.toLowerCase();
                break;
            case 'category':
                aValue = a.award.category.toLowerCase();
                bValue = b.award.category.toLowerCase();
                break;
            case 'award':
                aValue = a.award.year;
                bValue = b.award.year;
                break;
            case 'publisher':
                aValue = a.publisher.toLowerCase();
                bValue = b.publisher.toLowerCase();
                break;
            case 'series':
                if (a.series === false) aValue = '';
                else if (typeof a.series === 'string') aValue = a.series.toLowerCase();
                else if (typeof a.series === 'object') aValue = a.series.name.toLowerCase();
                else aValue = '';
                
                if (b.series === false) bValue = '';
                else if (typeof b.series === 'string') bValue = b.series.toLowerCase();
                else if (typeof b.series === 'object') bValue = b.series.name.toLowerCase();
                else bValue = '';
                break;
            case 'genres':
                aValue = (a.genres && a.genres.length > 0) ? a.genres[0].toLowerCase() : '';
                bValue = (b.genres && b.genres.length > 0) ? b.genres[0].toLowerCase() : '';
                break;
            default:
                return 0;
        }
        
        if (aValue < bValue) return currentSort.ascending ? -1 : 1;
        if (aValue > bValue) return currentSort.ascending ? 1 : -1;
        return 0;
    });
    
    // Update sort indicators in table headers
    updateSortIndicators();
    
    // Re-display books
    displayBooks();
}

/**
 * Update sort indicators in table headers
 */
function updateSortIndicators() {
    const headers = document.querySelectorAll('.sortable');
    headers.forEach(header => {
        const column = header.getAttribute('data-column');
        header.classList.remove('sort-asc', 'sort-desc');
        
        if (column === currentSort.column) {
            header.classList.add(currentSort.ascending ? 'sort-asc' : 'sort-desc');
        }
    });
}

/**
 * Handle filter changes with Smart Relevance Sort (Tier 3 - 5 points)
 */
function handleFilterChange() {
    // Get current filter values
    const nameValue = nameFilter.value.toLowerCase().trim();
    const winnerValue = winnerFilter.value;
    const decadeValue = decadeFilter.value;
    const authorValue = authorFilter.value;
    
    // Filter books array based on criteria
    filteredBooks = books.filter(book => {
        // Name filter (search title and author)
        let matchesName = true;
        if (nameValue) {
            matchesName = book.title.toLowerCase().includes(nameValue) ||
                         book.author.toLowerCase().includes(nameValue);
        }
        
        // Winner filter
        let matchesWinner = true;
        if (winnerValue === 'winners') {
            matchesWinner = book.award.is_winner === true;
        } else if (winnerValue === 'nominees') {
            matchesWinner = book.award.is_winner === false;
        }
        
        // Decade filter
        let matchesDecade = true;
        if (decadeValue !== 'all') {
            const decade = parseInt(decadeValue);
            matchesDecade = book.award.year >= decade && book.award.year < decade + 10;
        }
        
        // Author filter
        let matchesAuthor = true;
        if (authorValue !== 'all') {
            matchesAuthor = book.author === authorValue;
        }
        
        return matchesName && matchesWinner && matchesDecade && matchesAuthor;
    });
    
    // Smart Relevance Sort when name filter is active
    if (nameValue) {
        filteredBooks.sort((a, b) => {
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();
            
            // 1. Exact title matches first
            const aExactMatch = aTitle === nameValue;
            const bExactMatch = bTitle === nameValue;
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;
            
            // 2. Title starts with search term
            const aStartsWith = aTitle.startsWith(nameValue);
            const bStartsWith = bTitle.startsWith(nameValue);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            
            // 3. Title contains search term vs author contains
            const aTitleContains = aTitle.includes(nameValue);
            const bTitleContains = bTitle.includes(nameValue);
            if (aTitleContains && !bTitleContains) return -1;
            if (!aTitleContains && bTitleContains) return 1;
            
            // 4. Default year order (newest first)
            return b.award.year - a.award.year;
        });
    }
    
    // Re-display books
    displayBooks();
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    // Reset all filter inputs to default values
    nameFilter.value = '';
    winnerFilter.value = 'all';
    decadeFilter.value = 'all';
    authorFilter.value = 'all';
    
    // Reset filteredBooks to show all books
    filteredBooks = [...books];
    
    // Reset sorting
    currentSort = { column: null, ascending: true };
    updateSortIndicators();
    
    // Re-display books
    displayBooks();
}

/**
 * Data Validation (Tier 3 - 5 points)
 * Validates data and logs warnings for issues
 */
function validateData(booksData) {
    const warnings = [];
    const currentYear = new Date().getFullYear();
    const seenIds = new Set();
    
    booksData.forEach((book, index) => {
        // Check for missing required fields
        if (!book.title) warnings.push(`Book at index ${index}: Missing title`);
        if (!book.author) warnings.push(`Book at index ${index}: Missing author`);
        if (!book.award) warnings.push(`Book at index ${index}: Missing award object`);
        if (!book.publisher) warnings.push(`Book at index ${index}: Missing publisher`);
        
        // Check for future publication years
        if (book.award && book.award.year > currentYear) {
            warnings.push(`Book "${book.title}": Future year ${book.award.year}`);
        }
        
        // Check for duplicate IDs
        const bookId = String(book.id);
        if (seenIds.has(bookId)) {
            warnings.push(`Duplicate ID found: ${bookId}`);
        }
        seenIds.add(bookId);
        
        // Check for invalid winner status
        if (book.award && typeof book.award.is_winner !== 'boolean') {
            warnings.push(`Book "${book.title}": Invalid is_winner value (${book.award.is_winner})`);
        }
    });
    
    // Log all warnings to console
    if (warnings.length > 0) {
        console.warn('Data Validation Warnings:');
        warnings.forEach(warning => console.warn('  - ' + warning));
        
        // Display warning count in UI
        if (validationWarnings) {
            validationWarnings.textContent = `⚠ ${warnings.length} data validation warning(s) found (check console)`;
            validationWarnings.classList.remove('hidden');
        }
    } else {
        console.log('✓ Data validation passed: No issues found');
        if (validationWarnings) {
            validationWarnings.classList.add('hidden');
        }
    }
}

/**
 * Populate decade filter dropdown (Bonus - Enhanced Filters)
 */
function populateDecadeFilter() {
    const decades = new Set();
    books.forEach(book => {
        const decade = Math.floor(book.award.year / 10) * 10;
        decades.add(decade);
    });
    
    const sortedDecades = Array.from(decades).sort((a, b) => b - a);
    
    // Clear existing options except "All decades"
    decadeFilter.innerHTML = '<option value="all">All decades</option>';
    
    sortedDecades.forEach(decade => {
        const option = document.createElement('option');
        option.value = decade;
        option.textContent = `${decade}s`;
        decadeFilter.appendChild(option);
    });
}

/**
 * Populate author filter dropdown (Bonus - Enhanced Filters)
 */
function populateAuthorFilter() {
    const authors = new Set();
    books.forEach(book => {
        authors.add(book.author);
    });
    
    const sortedAuthors = Array.from(authors).sort();
    
    // Clear existing options except "All authors"
    authorFilter.innerHTML = '<option value="all">All authors</option>';
    
    sortedAuthors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorFilter.appendChild(option);
    });
}

/**
 * Export filtered results to CSV (Bonus - 5 points)
 */
function exportToCSV() {
    if (filteredBooks.length === 0) {
        alert('No books to export');
        return;
    }
    
    // CSV header
    let csv = 'Title,Author,Type,Award,Publisher,Series,Genres\n';
    
    // Add each book
    filteredBooks.forEach(book => {
        const row = [
            escapeCSV(book.title),
            escapeCSV(book.author),
            escapeCSV(book.award.category),
            escapeCSV(`${book.award.year} ${book.award.is_winner ? 'Winner' : 'Nominee'}`),
            escapeCSV(book.publisher),
            escapeCSV(getSeriesDisplay(book.series)),
            escapeCSV(getGenresDisplay(book.genres))
        ];
        csv += row.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'hugo-books-export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Escape CSV values (handle quotes, commas, newlines)
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
}

/**
 * Get series display text
 */
function getSeriesDisplay(series) {
    if (series === false) return '—';
    if (typeof series === 'string') return series;
    if (typeof series === 'object' && series.name) return `${series.name} (#${series.order})`;
    return '—';
}

/**
 * Get genres display text
 */
function getGenresDisplay(genres) {
    if (!genres || genres.length === 0) return '—';
    return genres.join(', ');
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    if (show) {
        loadingElement.classList.remove('hidden');
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
