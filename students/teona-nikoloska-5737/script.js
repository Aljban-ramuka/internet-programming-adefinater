// Configuration and constants
let books = [];
let filteredBooks = [];
let currentSort = { column: 'award', ascending: false }; // Default sort by award year, newest first
let validationWarnings = 0; // Track data validation warnings

// Filter options
const GENRES = ['Science Fiction', 'Fantasy', 'Horror', 'Alternate History', 'Dystopian', 'Space Opera', 'Post-Apocalyptic'];
const AUTHORS = [];
const AWARDS = ['Hugo Award', 'Nebula Award', 'Philip K. Dick Award', 'World Fantasy Award'];

// Utility functions
function showLoading() {
    const tableBody = document.getElementById('booksTableBody');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    if (loading) loading.style.display = 'block';
    if (error) error.style.display = 'none';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
}

function showError(message) {
    const tableBody = document.getElementById('booksTableBody');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    if (loading) loading.style.display = 'none';
    if (error) {
        error.style.display = 'block';
        error.querySelector('p').textContent = `Error: ${message}`;
    }
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="7">Error: ${message}</td></tr>`;
    console.error(message);
}

function validateBookData(book, index) {
    const warnings = [];
    
    // Check required fields
    if (!book.title || book.title.trim() === '') {
        warnings.push(`Book ${index}: Missing title`);
    }
    if (!book.author || book.author.trim() === '') {
        warnings.push(`Book ${index}: Missing author`);
    }
    if (!book.award || !book.award.year) {
        warnings.push(`Book ${index}: Missing award year`);
    }
    
    // Check data types
    if (book.award && typeof book.award.year !== 'number') {
        warnings.push(`Book ${index}: Award year should be a number`);
    }
    
    // Check reasonable values
    if (book.award && book.award.year && (book.award.year < 1900 || book.award.year > 2030)) {
        warnings.push(`Book ${index}: Award year ${book.award.year} seems unrealistic`);
    }
    
    return warnings;
}

// Data loading function
async function loadData() {
    try {
        showLoading();
        
        // Use the local data from data.js
        if (typeof HUGO_BOOKS_DATA !== 'undefined' && HUGO_BOOKS_DATA.books) {
            console.log(`Loading ${HUGO_BOOKS_DATA.books.length} books from local data...`);
            
            // Validate data
            let allWarnings = [];
            HUGO_BOOKS_DATA.books.forEach((book, index) => {
                const warnings = validateBookData(book, index + 1);
                allWarnings = allWarnings.concat(warnings);
            });
            
            if (allWarnings.length > 0) {
                console.warn('Data validation warnings:', allWarnings);
                validationWarnings = allWarnings.length;
            }
            
            books = HUGO_BOOKS_DATA.books;
            filteredBooks = [...books];
            
            // Extract unique authors for filter
            const uniqueAuthors = [...new Set(books.map(book => book.author))].sort();
            AUTHORS.length = 0; // Clear array
            AUTHORS.push(...uniqueAuthors);
            
            console.log(`Loaded ${books.length} books successfully`);
            renderTable();
            updateResultsCount();
            hideLoading();
            
        } else {
            throw new Error('HUGO_BOOKS_DATA not found. Make sure data.js is loaded properly.');
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(error.message);
    }
}

// Summary functions
function hideLoading() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
}

function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    
    if (resultsCount) {
        resultsCount.textContent = `Showing ${filteredBooks.length} of ${books.length} books`;
    }
    
    if (noResults) {
        noResults.style.display = filteredBooks.length === 0 ? 'block' : 'none';
    }
}

// Sorting functions
function sortBooks(column) {
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = column === 'title' || column === 'author'; // Default ascending for text
    }
    
    filteredBooks.sort((a, b) => {
        let aVal, bVal;
        
        switch (column) {
            case 'title':
                aVal = a.title.toLowerCase();
                bVal = b.title.toLowerCase();
                break;
            case 'author':
                aVal = a.author.toLowerCase();
                bVal = b.author.toLowerCase();
                break;
            case 'award':
                aVal = a.award.year;
                bVal = b.award.year;
                break;
            case 'type':
                aVal = a.award.is_winner ? 'winner' : 'nominee';
                bVal = b.award.is_winner ? 'winner' : 'nominee';
                break;
            case 'series':
                aVal = (a.series ? (typeof a.series === 'string' ? a.series : a.series.name || '') : '').toLowerCase();
                bVal = (b.series ? (typeof b.series === 'string' ? b.series : b.series.name || '') : '').toLowerCase();
                break;
            case 'publisher':
                aVal = (a.publisher || '').toLowerCase();
                bVal = (b.publisher || '').toLowerCase();
                break;
            case 'genres':
                aVal = (a.genres || []).join(', ').toLowerCase();
                bVal = (b.genres || []).join(', ').toLowerCase();
                break;
            default:
                return 0;
        }
        
        if (aVal < bVal) return currentSort.ascending ? -1 : 1;
        if (aVal > bVal) return currentSort.ascending ? 1 : -1;
        return 0;
    });
    
    renderTable();
    updateSortIndicators();
}

function updateSortIndicators() {
    // Remove all existing sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '';
    });
    
    // Add indicator to current sort column
    const headers = document.querySelectorAll(`th[data-column="${currentSort.column}"] .sort-indicator`);
    headers.forEach(indicator => {
        indicator.textContent = currentSort.ascending ? ' ↑' : ' ↓';
    });
}

// Filtering functions
function applyFilters() {
    const nameFilter = document.getElementById('nameFilter');
    const winnerFilter = document.getElementById('winnerFilter');
    
    const searchTerm = nameFilter ? nameFilter.value.toLowerCase() : '';
    const winnerStatus = winnerFilter ? winnerFilter.value : 'all';
    
    filteredBooks = books.filter(book => {
        // Search filter (title or author)
        const matchesSearch = !searchTerm || 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm);
        
        // Winner filter
        const matchesWinner = winnerStatus === 'all' || 
            (winnerStatus === 'winner' && book.award.is_winner) ||
            (winnerStatus === 'nominee' && !book.award.is_winner);
        
        return matchesSearch && matchesWinner;
    });
    
    renderTable();
    updateResultsCount();
}

function clearFilters() {
    const nameFilter = document.getElementById('nameFilter');
    const winnerFilter = document.getElementById('winnerFilter');
    
    if (nameFilter) nameFilter.value = '';
    if (winnerFilter) winnerFilter.value = 'all';
    
    filteredBooks = [...books];
    renderTable();
    updateResultsCount();
}

// Table rendering
function renderTable() {
    const tableBody = document.getElementById('booksTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No books found matching current filters.</td></tr>';
        return;
    }
    
    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        
        // Title column
        const titleCell = document.createElement('td');
        if (book.url) {
            titleCell.innerHTML = `<a href="${book.url}" target="_blank">${book.title}</a>`;
        } else {
            titleCell.textContent = book.title;
        }
        row.appendChild(titleCell);
        
        // Author column
        const authorCell = document.createElement('td');
        authorCell.textContent = book.author;
        row.appendChild(authorCell);
        
        // Type column (Winner/Nominee)
        const typeCell = document.createElement('td');
        const isWinner = book.award.is_winner;
        typeCell.innerHTML = `<span class="winner-badge ${isWinner ? 'winner' : 'nominee'}">${isWinner ? 'Winner' : 'Nominee'}</span>`;
        row.appendChild(typeCell);
        
        // Award column (Year)
        const awardCell = document.createElement('td');
        awardCell.textContent = book.award.year;
        row.appendChild(awardCell);
        
        // Publisher column
        const publisherCell = document.createElement('td');
        publisherCell.textContent = book.publisher || 'Unknown';
        row.appendChild(publisherCell);
        
        // Series column
        const seriesCell = document.createElement('td');
        if (book.series) {
            if (typeof book.series === 'string') {
                seriesCell.innerHTML = `<span class="series-name">${book.series}</span>`;
            } else if (book.series.name) {
                seriesCell.innerHTML = `<span class="series-name">${book.series.name}</span>`;
            }
        } else {
            seriesCell.innerHTML = '<span class="no-series">Standalone</span>';
        }
        row.appendChild(seriesCell);
        
        // Genres column
        const genresCell = document.createElement('td');
        if (book.genres && book.genres.length > 0) {
            genresCell.innerHTML = `<div class="genres-list">${book.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}</div>`;
        } else {
            genresCell.innerHTML = '<span class="no-genres">No genres listed</span>';
        }
        row.appendChild(genresCell);
        
        tableBody.appendChild(row);
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load data
    loadData();
    
    // Setup filter event listeners
    const nameFilter = document.getElementById('nameFilter');
    const winnerFilter = document.getElementById('winnerFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    if (nameFilter) {
        nameFilter.addEventListener('input', applyFilters);
    }
    
    if (winnerFilter) {
        winnerFilter.addEventListener('change', applyFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Setup sort event listeners
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', function() {
            const column = this.dataset.column;
            sortBooks(column);
        });
    });
});