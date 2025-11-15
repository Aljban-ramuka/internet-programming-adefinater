const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json';
let books = [];
let filteredBooks = [];
let currentSort = { column: 'year', ascending: false };
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;
let validationWarnings = 0;

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    loadData();
    setupEventListeners();
});

function initializeElements() {
    loadingElement = document.getElementById('loading');
    errorElement = document.getElementById('error');
    tableBody = document.getElementById('booksTableBody');
    resultsCount = document.getElementById('resultsCount');
    noResults = document.getElementById('noResults');
    nameFilter = document.getElementById('nameFilter');
    winnerFilter = document.getElementById('winnerFilter');
    clearFiltersBtn = document.getElementById('clearFilters');
}

function setupEventListeners() {
    nameFilter.addEventListener('input', debounce(handleFilterChange, 300));
    winnerFilter.addEventListener('change', handleFilterChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);

    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            const column = header.dataset.column;
            if (e.shiftKey) {
                handleMultiColumnSort(column);
            } else {
                handleSort(column);
            }
        });
    });

    document.addEventListener('keydown', handleKeyboardNavigation);
}

async function loadData() {
    try {
        showLoading(true);
        showError(false);
        
        const response = await fetch(DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        books = extractBooksFromData(data);
        
        if (books.length === 0) {
            throw new Error('No books found in data');
        }
        
        validateData(books);
        populateWinnerFilter();
        populateDecadeFilter();
        populateAuthorFilter();
        
        filteredBooks = [...books];
        applyDefaultSort();
        displayBooks();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(true);
    } finally {
        showLoading(false);
    }
}

function extractBooksFromData(data) {
    const books = [];
    
    function extractFromObject(obj) {
        if (obj && typeof obj === 'object') {
            if (obj.id !== undefined && obj.title !== undefined) {
                books.push(obj);
            }
            Object.values(obj).forEach(value => {
                if (Array.isArray(value)) {
                    value.forEach(extractFromObject);
                } else if (value && typeof value === 'object') {
                    extractFromObject(value);
                }
            });
        }
    }
    
    extractFromObject(data);
    return books;
}

function validateData(books) {
    if (!Array.isArray(books)) {
        console.error('Books data is not an array');
        return;
    }
    
    validationWarnings = 0;
    const requiredFields = ['id', 'title', 'author', 'award', 'publisher', 'series', 'genres'];
    
    books.forEach(book => {
        if (!book || typeof book !== 'object') {
            console.warn('Invalid book entry:', book);
            validationWarnings++;
            return;
        }
        
        requiredFields.forEach(field => {
            if (!(field in book)) {
                console.warn(`Missing required field '${field}' in book:`, book.title || 'Unknown');
                validationWarnings++;
            }
        });
        
        if (book.award) {
            if (typeof book.award.year !== 'number' || book.award.year < 1950 || book.award.year > 2030) {
                console.warn(`Suspicious award year ${book.award.year} in book:`, book.title);
                validationWarnings++;
            }
            
            if (typeof book.award.is_winner !== 'boolean') {
                console.warn(`Invalid winner status in book:`, book.title);
                validationWarnings++;
            }
        }
    });
    
    const seenIds = new Set();
    books.forEach(book => {
        if (book && book.id !== undefined) {
            const idStr = String(book.id);
            if (seenIds.has(idStr)) {
                console.warn(`Duplicate ID ${book.id} found:`, book.title);
                validationWarnings++;
            }
            seenIds.add(idStr);
        }
    });
}

function populateWinnerFilter() {
    winnerFilter.innerHTML = `
        <option value="all">All books</option>
        <option value="winner">Winners only</option>
        <option value="nominee">Nominees only</option>
    `;
}

function populateDecadeFilter() {
    const decades = new Set();
    books.forEach(book => {
        if (book.award?.year) {
            const decade = Math.floor(book.award.year / 10) * 10;
            decades.add(decade);
        }
    });
    
    const decadeFilter = document.getElementById('decadeFilter') || createDecadeFilter();
    const sortedDecades = Array.from(decades).sort();
    
    decadeFilter.innerHTML = '<option value="all">All decades</option>' +
        sortedDecades.map(decade => 
            `<option value="${decade}">${decade}s</option>`
        ).join('');
}

function populateAuthorFilter() {
    const authors = new Set();
    books.forEach(book => {
        if (book.author) {
            authors.add(book.author);
        }
    });
    
    const authorFilter = document.getElementById('authorFilter') || createAuthorFilter();
    const sortedAuthors = Array.from(authors).sort();
    
    authorFilter.innerHTML = '<option value="all">All authors</option>' +
        sortedAuthors.map(author => 
            `<option value="${author}">${author}</option>`
        ).join('');
}

function createDecadeFilter() {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    filterGroup.innerHTML = `
        <label for="decadeFilter">Decade:</label>
        <select id="decadeFilter">
            <option value="all">All decades</option>
        </select>
    `;
    document.querySelector('.filter-controls').appendChild(filterGroup);
    return document.getElementById('decadeFilter');
}

function createAuthorFilter() {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    filterGroup.innerHTML = `
        <label for="authorFilter">Author:</label>
        <select id="authorFilter">
            <option value="all">All authors</option>
        </select>
    `;
    document.querySelector('.filter-controls').appendChild(filterGroup);
    document.getElementById('authorFilter').addEventListener('change', handleFilterChange);
    document.getElementById('decadeFilter').addEventListener('change', handleFilterChange);
    return document.getElementById('authorFilter');
}

function displayBooks() {
    tableBody.innerHTML = '';
    
    const totalBooks = books.length;
    const showingBooks = filteredBooks.length;
    resultsCount.textContent = `Showing ${showingBooks} of ${totalBooks} books${validationWarnings > 0 ? ` (${validationWarnings} data warnings)` : ''}`;
    
    if (filteredBooks.length === 0) {
        noResults.classList.remove('hidden');
        return;
    } else {
        noResults.classList.add('hidden');
    }
    
    const fragment = document.createDocumentFragment();
    
    filteredBooks.forEach(book => {
        if (!book || typeof book !== 'object') return;
        
        const row = document.createElement('tr');
        row.tabIndex = 0;
        
        const awardYear = book.award?.year || 'Unknown';
        const awardStatus = book.award?.is_winner ? 'Winner' : 'Nominee';
        const awardText = `${awardYear} ${awardStatus}`;
        
        let seriesText = '—';
        if (typeof book.series === 'string') {
            seriesText = book.series;
        } else if (book.series && typeof book.series === 'object') {
            const order = book.series.order ? ` (#${book.series.order})` : '';
            seriesText = `${book.series.name}${order}`;
        }
        
        row.innerHTML = `
            <td title="${escapeHtml(book.title || '')}">${escapeHtml(book.title || 'Unknown Title')}</td>
            <td>${escapeHtml(book.author || 'Unknown Author')}</td>
            <td>${escapeHtml(book.award?.category || 'Unknown Type')}</td>
            <td>
                <span class="winner-badge ${book.award?.is_winner ? 'winner' : 'nominee'}">
                    ${awardText}
                </span>
            </td>
            <td>${escapeHtml(book.publisher || 'Unknown Publisher')}</td>
            <td class="${!book.series ? 'no-series' : 'series-name'}">
                ${escapeHtml(seriesText)}
            </td>
            <td class="genres-list">
                ${Array.isArray(book.genres) && book.genres.length > 0 
                    ? book.genres.map(genre => `<span class="genre-tag">${escapeHtml(genre)}</span>`).join('')
                    : '<span class="no-genres">—</span>'
                }
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }
    
    sortBooks();
    updateSortIndicators();
    displayBooks();
}

function handleMultiColumnSort(column) {
    console.log('Multi-column sort feature would be implemented here');
}

function applyDefaultSort() {
    currentSort = { column: 'year', ascending: false };
    sortBooks();
    updateSortIndicators();
}

function sortBooks() {
    filteredBooks.sort((a, b) => {
        if (!a || !b) return 0;
        
        let aValue, bValue;
        
        switch (currentSort.column) {
            case 'title':
                aValue = (a.title || '').toLowerCase();
                bValue = (b.title || '').toLowerCase();
                break;
            case 'author':
                aValue = (a.author || '').toLowerCase();
                bValue = (b.author || '').toLowerCase();
                break;
            case 'category':
                aValue = (a.award?.category || '').toLowerCase();
                bValue = (b.award?.category || '').toLowerCase();
                break;
            case 'award':
                aValue = `${String(a.award?.year || 0).padStart(4, '0')}-${a.award?.is_winner ? '1' : '0'}`;
                bValue = `${String(b.award?.year || 0).padStart(4, '0')}-${b.award?.is_winner ? '1' : '0'}`;
                break;
            case 'publisher':
                aValue = (a.publisher || '').toLowerCase();
                bValue = (b.publisher || '').toLowerCase();
                break;
            case 'series':
                aValue = getSeriesText(a.series).toLowerCase();
                bValue = getSeriesText(b.series).toLowerCase();
                break;
            case 'genres':
                aValue = Array.isArray(a.genres) ? a.genres.join(',').toLowerCase() : '';
                bValue = Array.isArray(b.genres) ? b.genres.join(',').toLowerCase() : '';
                break;
            case 'year':
            default:
                aValue = a.award?.year || 0;
                bValue = b.award?.year || 0;
                break;
        }
        
        let comparison = 0;
        if (aValue < bValue) {
            comparison = -1;
        } else if (aValue > bValue) {
            comparison = 1;
        }
        
        return currentSort.ascending ? comparison : -comparison;
    });
}

function getSeriesText(series) {
    if (typeof series === 'string') return series;
    if (series && typeof series === 'object') {
        return series.order ? `${series.name} (#${series.order})` : series.name;
    }
    return '—';
}

function updateSortIndicators() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    const currentHeader = document.querySelector(`[data-column="${currentSort.column}"]`);
    if (currentHeader) {
        currentHeader.classList.add(currentSort.ascending ? 'sort-asc' : 'sort-desc');
    }
}

function handleFilterChange() {
    const searchTerm = nameFilter.value.toLowerCase().trim();
    const winnerStatus = winnerFilter.value;
    const decadeFilter = document.getElementById('decadeFilter');
    const authorFilter = document.getElementById('authorFilter');
    const decadeValue = decadeFilter ? decadeFilter.value : 'all';
    const authorValue = authorFilter ? authorFilter.value : 'all';
    
    filteredBooks = books.filter(book => {
        if (!book || typeof book !== 'object') return false;
        
        const matchesText = !searchTerm || 
            (book.title && book.title.toLowerCase().includes(searchTerm)) ||
            (book.author && book.author.toLowerCase().includes(searchTerm));
        
        let matchesWinner = true;
        if (winnerStatus === 'winner') {
            matchesWinner = book.award?.is_winner === true;
        } else if (winnerStatus === 'nominee') {
            matchesWinner = book.award?.is_winner === false;
        }
        
        let matchesDecade = true;
        if (decadeValue !== 'all' && book.award?.year) {
            const bookDecade = Math.floor(book.award.year / 10) * 10;
            matchesDecade = bookDecade === parseInt(decadeValue);
        }
        
        let matchesAuthor = true;
        if (authorValue !== 'all') {
            matchesAuthor = book.author === authorValue;
        }
        
        return matchesText && matchesWinner && matchesDecade && matchesAuthor;
    });
    
    if (searchTerm) {
        applyRelevanceSort(searchTerm);
    } else {
        applyDefaultSort();
    }
    
    displayBooks();
}

function applyRelevanceSort(searchTerm) {
    filteredBooks.sort((a, b) => {
        if (!a || !b) return 0;
        
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aAuthor = (a.author || '').toLowerCase();
        const bAuthor = (b.author || '').toLowerCase();
        
        if (aTitle === searchTerm && bTitle !== searchTerm) return -1;
        if (bTitle === searchTerm && aTitle !== searchTerm) return 1;
        
        const aTitleContains = aTitle.includes(searchTerm);
        const bTitleContains = bTitle.includes(searchTerm);
        if (aTitleContains && !bTitleContains) return -1;
        if (bTitleContains && !aTitleContains) return 1;
        
        const aAnyContains = aTitle.includes(searchTerm) || aAuthor.includes(searchTerm);
        const bAnyContains = bTitle.includes(searchTerm) || bAuthor.includes(searchTerm);
        if (aAnyContains && !bAnyContains) return -1;
        if (bAnyContains && !aAnyContains) return 1;
        
        return (b.award?.year || 0) - (a.award?.year || 0);
    });
}

function clearAllFilters() {
    nameFilter.value = '';
    winnerFilter.value = 'all';
    const decadeFilter = document.getElementById('decadeFilter');
    const authorFilter = document.getElementById('authorFilter');
    if (decadeFilter) decadeFilter.value = 'all';
    if (authorFilter) authorFilter.value = 'all';
    handleFilterChange();
}

function exportToCSV() {
    if (filteredBooks.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['Title', 'Author', 'Type', 'Award', 'Publisher', 'Series', 'Genres'];
    const csvContent = [
        headers.join(','),
        ...filteredBooks.map(book => {
            const awardYear = book.award?.year || 'Unknown';
            const awardStatus = book.award?.is_winner ? 'Winner' : 'Nominee';
            const awardText = `${awardYear} ${awardStatus}`;
            
            let seriesText = '—';
            if (typeof book.series === 'string') {
                seriesText = `"${book.series.replace(/"/g, '""')}"`;
            } else if (book.series && typeof book.series === 'object') {
                const order = book.series.order ? ` (#${book.series.order})` : '';
                seriesText = `"${book.series.name}${order}"`;
            }
            
            const genresText = Array.isArray(book.genres) && book.genres.length > 0 
                ? `"${book.genres.join(', ').replace(/"/g, '""')}"`
                : '—';
            
            return [
                `"${(book.title || '').replace(/"/g, '""')}"`,
                `"${(book.author || '').replace(/"/g, '""')}"`,
                `"${(book.award?.category || '').replace(/"/g, '""')}"`,
                `"${awardText}"`,
                `"${(book.publisher || '').replace(/"/g, '""')}"`,
                seriesText,
                genresText
            ].join(',');
        })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'hugo_books_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleKeyboardNavigation(event) {
    const activeElement = document.activeElement;
    
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (event.key) {
        case 'Enter':
            if (activeElement.classList.contains('sortable')) {
                const column = activeElement.dataset.column;
                handleSort(column);
            } else if (activeElement.tagName === 'TR') {
                activeElement.classList.toggle('focused');
            }
            break;
            
        case 'ArrowUp':
        case 'ArrowDown':
            event.preventDefault();
            navigateTableRows(event.key);
            break;
            
        case 'e':
            if (event.ctrlKey) {
                event.preventDefault();
                exportToCSV();
            }
            break;
            
        case 'Tab':
            break;
    }
}

function navigateTableRows(direction) {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const currentIndex = rows.findIndex(row => row === document.activeElement);
    
    let newIndex;
    if (direction === 'ArrowDown') {
        newIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
    } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
    }
    
    if (rows[newIndex]) {
        rows.forEach(row => row.classList.remove('focused'));
        rows[newIndex].classList.add('focused');
        rows[newIndex].focus();
        rows[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function showLoading(show) {
    if (show) {
        loadingElement.classList.remove('hidden');
        errorElement.classList.add('hidden');
    } else {
        loadingElement.classList.add('hidden');
    }
}

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

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Add export button to filters
const exportButton = document.createElement('button');
exportButton.textContent = 'Export to CSV';
exportButton.addEventListener('click', exportToCSV);
document.querySelector('.filter-controls').appendChild(exportButton);