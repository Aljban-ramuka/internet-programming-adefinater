// Configuration
const API_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json';

// Global state
let books = [];
let filteredBooks = [];
let currentSort = {
    column: 'award.year',
    direction: 'desc'
};

// DOM elements (will be populated when DOM loads)
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();
    } catch (error) {
        console.error('Application initialization failed:', error);
        showError('Failed to initialize the application');
    }
});

/* Performance notes:
 - Filtering input is debounced to avoid excessive recompute on each keystroke.
 - Rendering replaces tbody innerHTML in one pass to minimize layout thrashing.
 - For 1000+ items consider virtualization (render only visible rows) or pagination.
     This implementation is intentionally lightweight and documents the optimization
     options above.
*/

async function initializeApp() {
    showLoading();
    try {
        const data = await fetchBooks();
        // Support multiple data shapes: array, { books: [] }, { items: [] }
        if (Array.isArray(data)) {
            books = data;
        } else if (Array.isArray(data.books)) {
            books = data.books;
        } else if (Array.isArray(data.items)) {
            books = data.items;
        } else {
            // unexpected format, attempt best-effort extraction
            books = data && data.data && Array.isArray(data.data) ? data.data : [];
            console.warn('Unexpected data format received from API; using best-effort extraction', data);
        }
    filteredBooks = [...books];

    // Validate data and show warnings (Tier 2 / Tier 3 requirement)
    validateData();

    initializeFilters();
        initializeSortListeners();
        renderBooks();
        updateResultsCount();
        
    } catch (error) {
        throw error;
    } finally {
        hideLoading();
    }
}

// Data validation (logs warnings and shows count in UI)
function validateData() {
    const warnings = [];
    const ids = new Set();
    const CURRENT_YEAR = new Date().getFullYear();

    books.forEach((book, idx) => {
        const id = book.id;
        // Missing required fields
        if (!book.title) warnings.push(`Missing title (index ${idx})`);
        if (!book.author) warnings.push(`Missing author (index ${idx})`);
        if (!book.award || typeof book.award.year === 'undefined') warnings.push(`Missing award.year (index ${idx})`);

        // Future years
        if (book.award && typeof book.award.year === 'number' && book.award.year > CURRENT_YEAR) {
            warnings.push(`Future award year for "${book.title || id}" (${book.award.year})`);
        }

        // Duplicate ids
        if (typeof id !== 'undefined') {
            const normalizedId = String(id);
            if (ids.has(normalizedId)) warnings.push(`Duplicate id: ${normalizedId}`);
            ids.add(normalizedId);
        }

        // Invalid winner flag
        if (book.award && typeof book.award.is_winner !== 'boolean') {
            warnings.push(`Invalid award.is_winner for "${book.title || id}"`);
        }
    });

    // Store warnings globally for details view
    window.__dataWarnings = warnings;

    // Show warnings in UI (dismissible, details toggle)
    const warningsEl = document.getElementById('warnings');
    if (!warningsEl) return;

    const dismissed = sessionStorage.getItem('dismissDataWarnings') === '1';
    if (warnings.length > 0 && !dismissed) {
        warningsEl.innerHTML = `
            <div class="warnings-summary"><strong>${warnings.length} data warning${warnings.length>1?'s':''}</strong>
                <span class="warnings-actions">
                    <button id="showWarningsBtn" class="btn-small">Details</button>
                    <button id="dismissWarningsBtn" class="btn-small">Dismiss</button>
                </span>
            </div>
            <div id="warningsList" class="hidden"></div>
        `;
        warningsEl.classList.remove('hidden');

        // Attach listeners
        const listEl = document.getElementById('warningsList');
        const showBtn = document.getElementById('showWarningsBtn');
        const dismissBtn = document.getElementById('dismissWarningsBtn');

        showBtn.addEventListener('click', () => {
            if (listEl.classList.contains('hidden')) {
                // render warnings
                listEl.innerHTML = `<ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`;
                listEl.classList.remove('hidden');
                showBtn.textContent = 'Hide details';
            } else {
                listEl.classList.add('hidden');
                showBtn.textContent = 'Details';
            }
        });

        dismissBtn.addEventListener('click', () => {
            sessionStorage.setItem('dismissDataWarnings', '1');
            warningsEl.classList.add('hidden');
        });

        console.warn('Data validation warnings:', warnings.slice(0, 200));
    } else {
        warningsEl.classList.add('hidden');
    }
}

// Data fetching
async function fetchBooks() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching books:', error);
        showError('Failed to load books data. Please try again later.');
        throw error;
    }
}


// Rendering
function renderBooks() {
    const tbody = document.getElementById('booksTableBody');
    tbody.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        document.getElementById('noResults').classList.remove('hidden');
        return;
    }
    document.getElementById('noResults').classList.add('hidden');

    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        row.tabIndex = 0;
        row.setAttribute('role', 'row');
        row.innerHTML = `
            <td>${escapeHtml(book.title)}</td>
            <td>${escapeHtml(book.author)}</td>
            <td>${escapeHtml(book.award.category)}</td>
            <td>${formatAward(book.award)}</td>
            <td>${escapeHtml(book.publisher)}</td>
            <td>${formatSeries(book.series)}</td>
            <td>${formatGenres(book.genres)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Formatting helpers
function escapeHtml(str) {
    if (str === null || str === undefined) return '—';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatAward(award) {
    return `${award.year} ${award.is_winner ? 
        '<span class="winner-badge winner">Winner</span>' : 
        '<span class="winner-badge nominee">Nominee</span>'}`;
}

function formatSeries(series) {
    if (!series) return '—';
    if (typeof series === 'string') return escapeHtml(series);
    return `${escapeHtml(series.name)} (#${series.order})`;
}

function formatGenres(genres) {
    if (!genres || !genres.length) return '—';
    return genres
        .map(genre => `<span class="genre-tag">${escapeHtml(genre)}</span>`)
        .join(' ');
}

// Sorting
function initializeSortListeners() {
    document.querySelectorAll('th.sortable').forEach(th => {
        // make headers keyboard-focusable
        th.tabIndex = 0;
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            handleSort(column);
        });
        // support Enter key to sort when header focused
        th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const column = th.dataset.sort;
                handleSort(column);
            }
        });
    });
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    updateSortIndicators();
    sortBooks();
    renderBooks();
}

function sortBooks() {
    const { column, direction } = currentSort;
    
    filteredBooks.sort((a, b) => {
        let valueA = getNestedValue(a, column);
        let valueB = getNestedValue(b, column);

        if (typeof valueA === 'string') valueA = valueA.toLowerCase();
        if (typeof valueB === 'string') valueB = valueB.toLowerCase();

        if (valueA === valueB) return 0;
        if (valueA === null || valueA === undefined) return 1;
        if (valueB === null || valueB === undefined) return -1;

        const comparison = valueA < valueB ? -1 : 1;
        return direction === 'asc' ? comparison : -comparison;
    });
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => 
        curr ? curr[key] : null, obj);
}

// Filtering
function initializeFilters() {
    const filters = {
        title: document.getElementById('titleFilter'),
        author: document.getElementById('authorFilter'),
        winner: document.getElementById('winnerFilter')
    };

    Object.values(filters).forEach(filter => {
        if (filter) {
            filter.addEventListener('input', debounce(handleFilter, 300));
        }
    });
}

function handleFilter() {
    const titleFilter = document.getElementById('titleFilter').value.toLowerCase();
    const authorFilter = document.getElementById('authorFilter').value.toLowerCase();
    const winnerFilter = document.getElementById('winnerFilter').value; // 'all' | 'winners' | 'nominees'

    filteredBooks = books.filter(book => {
        const matchesTitle = !titleFilter || 
            (book.title || '').toLowerCase().includes(titleFilter);
        const matchesAuthor = !authorFilter || 
            (book.author || '').toLowerCase().includes(authorFilter);

        // winnerFilter: 'all' -> include all; 'winners' -> only true; 'nominees' -> only false
        let matchesWinner = true;
        if (winnerFilter === 'winners') {
            matchesWinner = !!(book.award && book.award.is_winner === true);
        } else if (winnerFilter === 'nominees') {
            matchesWinner = !!(book.award && book.award.is_winner === false);
        }

        return matchesTitle && matchesAuthor && matchesWinner;
    });
    // When a title search is active, apply a relevance sort (exact matches first,
    // then title contains, then any field contains) to improve results ordering.
    if (titleFilter) {
        applyRelevanceSort(titleFilter);
    } else {
        sortBooks();
    }
    renderBooks();
    updateResultsCount();
}

// Smart relevance sort used when a search term is active (Tier 3 feature)
function applyRelevanceSort(term) {
    const q = term.toLowerCase();
    function score(book) {
        const title = (book.title || '').toLowerCase();
        if (title === q) return 100;
        if (title.includes(q)) return 50;
        // any other field contains
        const any = [book.author, book.publisher, (book.award && book.award.category) || '']
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q));
        return any ? 20 : 0;
    }

    filteredBooks.sort((a, b) => {
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sb - sa; // higher score first
        // fallback: recent awards first
        const ya = a.award && a.award.year ? a.award.year : 0;
        const yb = b.award && b.award.year ? b.award.year : 0;
        return yb - ya;
    });
}

// UI helpers
function updateResultsCount() {
    const total = books.length;
    const filtered = filteredBooks.length;
    const text = filtered === total ? 
        `Showing all ${total} books` : 
        `Showing ${filtered} of ${total} books`;
    document.getElementById('resultsCount').textContent = text;
}

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === currentSort.column) {
            th.classList.add(`sort-${currentSort.direction}`);
        }
    });
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// Utility functions
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