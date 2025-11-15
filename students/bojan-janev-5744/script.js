// Configuration and constants
const DATA_URL = "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json";
let books = [];
let filteredBooks = [];
let currentSort = { column: 'award', ascending: false }; // default sort by award year desc

// Pagination state
let pageIndex = 0;
let pageSize = 20;

// Validation/warnings
let warnings = [];

// DOM elements
let loadingElement, errorElement, tableBody, resultsCount, noResults, warningCountEl;
let nameFilter, winnerFilter, clearFiltersBtn, authorFilter, decadeFilter;
let prevPageBtn, nextPageBtn, pageInfoEl, pageSizeSelect, paginationEl;
let exportCsvBtn;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeElements();
    setupEventListeners();
    loadData();
});

/** Initialize DOM element references */
function initializeElements() {
    loadingElement = document.getElementById('loading');
    errorElement = document.getElementById('error');
    tableBody = document.getElementById('booksTableBody');
    resultsCount = document.getElementById('resultsCount');
    noResults = document.getElementById('noResults');
    warningCountEl = document.getElementById('warningCount');

    nameFilter = document.getElementById('nameFilter');
    winnerFilter = document.getElementById('winnerFilter');
    clearFiltersBtn = document.getElementById('clearFilters');
    authorFilter = document.getElementById('authorFilter');
    decadeFilter = document.getElementById('decadeFilter');

    prevPageBtn = document.getElementById('prevPage');
    nextPageBtn = document.getElementById('nextPage');
    pageInfoEl = document.getElementById('pageInfo');
    pageSizeSelect = document.getElementById('pageSize');
    paginationEl = document.getElementById('pagination');
    exportCsvBtn = document.getElementById('exportCsv');
}

/** Set up event listeners for user interactions */
function setupEventListeners() {
    nameFilter.addEventListener('input', debounce(handleFilterChange, 250));
    winnerFilter.addEventListener('change', handleFilterChange);
    authorFilter.addEventListener('change', handleFilterChange);
    decadeFilter.addEventListener('change', handleFilterChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);

    prevPageBtn.addEventListener('click', () => changePage(pageIndex - 1));
    nextPageBtn.addEventListener('click', () => changePage(pageIndex + 1));
    pageSizeSelect.addEventListener('change', () => {
        pageSize = parseInt(pageSizeSelect.value, 10) || 20;
        changePage(0);
    });

    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', (e) => {
            const column = header.getAttribute('data-column');
            handleSort(column, e.shiftKey);
        });
    });

    // Export CSV
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportFilteredToCSV);

    // Keyboard navigation: allow focusing table and using arrows to move between rows
    tableBody.addEventListener('keydown', (e) => {
        const focused = document.activeElement;
        if (!focused || focused.tagName.toLowerCase() !== 'tr') return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = focused.nextElementSibling;
            if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = focused.previousElementSibling;
            if (prev) prev.focus();
        }
    });
}

/** Load book data from remote JSON file and normalize it */
async function loadData() {
    try {
        showLoading(true);
        // Fetch remote data only. Do NOT fall back to a local file (per spec: avoid local-file negative points).
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error(`Failed to fetch remote data: ${response.status} ${response.statusText}`);
        const rawData = await response.json();

        warnings = [];
        const seenIds = new Set();
        const currentYear = new Date().getFullYear();

        books = rawData.books.map((raw, idx) => {
            const book = { ...raw };

            // Normalize ID to string for consistent comparisons
            book.id = (book.id === undefined || book.id === null) ? `missing-${idx}` : String(book.id);

            // Validation checks
            if (!raw.title) warnings.push({ type: 'missing', message: `Missing title for id=${book.id}` });
            if (!raw.author) warnings.push({ type: 'missing', message: `Missing author for id=${book.id}` });
            if (!raw.award || typeof raw.award.year !== 'number') warnings.push({ type: 'missing', message: `Missing/invalid award.year for id=${book.id}` });
            if (raw.award && raw.award.year > currentYear) warnings.push({ type: 'future', message: `Future award year for id=${book.id}: ${raw.award.year}` });
            if (typeof raw.award?.is_winner !== 'boolean') warnings.push({ type: 'invalid', message: `Invalid award.is_winner for id=${book.id}` });
            if (seenIds.has(book.id)) warnings.push({ type: 'duplicate', message: `Duplicate id detected: ${book.id}` });
            seenIds.add(book.id);

            // Derived fields
            book.awardYear = raw.award?.year || 0;
            book.awardWinner = !!raw.award?.is_winner;
            book.awardDisplay = formatAward(raw.award);
            book.category = raw.award?.category || '';
            book.seriesDisplay = formatSeries(raw.series);
            book.genres = Array.isArray(raw.genres) ? raw.genres : [];

            // Ensure text fields
            book.title = raw.title || '';
            book.author = raw.author || '';
            book.publisher = raw.publisher || '';

            return book;
        });

        // Populate filter dropdowns
        populateWinnerFilter();
        populateAuthorFilter();
        populateDecadeFilter();

        // initial filtered set
        filteredBooks = [...books];
        // default sort: award year desc
        currentSort = { column: 'award', ascending: false };
        updateSortIndicators();
        changePage(0);
        updateWarningCount();
    } catch (error) {
        console.error('Error loading data:', error);
        // Provide actionable guidance to the user: likely a network/CORS or file:// restriction
        const msg = error && error.message ? `Error loading data: ${error.message}.\nIf you opened the page via file:// the browser may block fetch requests — run a local HTTP server (python -m http.server) or open the page from http://localhost.` : 'Error loading data.';
        showError(msg);
    } finally {
        showLoading(false);
    }
}

/** Display current page of books in the table */
function displayBooksPage() {
    tableBody.innerHTML = '';

    if (filteredBooks.length === 0) {
        noResults.classList.remove('hidden');
        resultsCount.textContent = `Showing 0 of ${books.length} books`;
        paginationEl.classList.add('hidden');
        return;
    } else {
        noResults.classList.add('hidden');
    }

    const start = pageIndex * pageSize;
    const end = Math.min(start + pageSize, filteredBooks.length);
    const pageItems = filteredBooks.slice(start, end);

    pageItems.forEach(book => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHTML(book.title)}</td>
            <td>${escapeHTML(book.author)}</td>
            <td>${escapeHTML(book.category)}</td>
            <td>${escapeHTML(book.awardDisplay)}</td>
            <td>${escapeHTML(book.publisher)}</td>
            <td>${escapeHTML(book.seriesDisplay)}</td>
            <td>${book.genres.length ? book.genres.map(escapeHTML).join(', ') : '—'}</td>
        `;
        // Make rows keyboard-focusable for navigation and accessibility
        row.tabIndex = 0;
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // When Enter is pressed on a row, toggle sort by Award year (as example)
                handleSort('award');
            }
        });
        tableBody.appendChild(row);
    });

    resultsCount.textContent = `Showing ${start + 1}-${end} of ${filteredBooks.length} (${books.length} total)`;
    // pagination controls
    if (filteredBooks.length > pageSize) {
        paginationEl.classList.remove('hidden');
        pageInfoEl.textContent = `Page ${pageIndex + 1} of ${Math.ceil(filteredBooks.length / pageSize)}`;
        prevPageBtn.disabled = pageIndex <= 0;
        nextPageBtn.disabled = end >= filteredBooks.length - 1 || end === filteredBooks.length;
    } else {
        paginationEl.classList.add('hidden');
    }
}

/** Export filtered results (all pages) to CSV */
function exportFilteredToCSV() {
    const cols = ['Title', 'Author', 'Type', 'Award', 'Publisher', 'Series', 'Genres'];
    const rows = filteredBooks.map(b => [
        b.title,
        b.author,
        b.category,
        b.awardDisplay,
        b.publisher,
        b.seriesDisplay,
        (b.genres || []).join('; ')
    ]);

    const escapeCell = (cell) => {
        if (cell === null || cell === undefined) return '';
        const s = String(cell).replace(/"/g, '""');
        return `"${s}"`;
    };

    const csv = [cols.map(escapeCell).join(',')].concat(rows.map(r => r.map(escapeCell).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hugo_books_filtered.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Change current page index and update display */
function changePage(newIndex) {
    const maxPage = Math.max(0, Math.ceil(filteredBooks.length / pageSize) - 1);
    pageIndex = Math.max(0, Math.min(newIndex, maxPage));
    displayBooksPage();
}

/** Handle sorting by column. If column === 'award' sort by awardYear. */
function handleSort(column, addMulti = false) {
    // Toggle or set
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }

    const col = column;
    filteredBooks.sort((a, b) => {
        let valA, valB;
        if (col === 'award') {
            valA = a.awardYear || 0;
            valB = b.awardYear || 0;
        } else if (col === 'genres') {
            valA = (a.genres || []).join(', ');
            valB = (b.genres || []).join(', ');
        } else {
            valA = a[col] ?? '';
            valB = b[col] ?? '';
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return currentSort.ascending ? -1 : 1;
        if (valA > valB) return currentSort.ascending ? 1 : -1;
        return 0;
    });

    updateSortIndicators();
    changePage(0);
}

/** Update sort indicators in table headers */
function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(header => {
        const column = header.getAttribute('data-column');
        const indicator = header.querySelector('.sort-indicator');
        if (column === currentSort.column) {
            indicator.textContent = currentSort.ascending ? '▲' : '▼';
        } else {
            indicator.textContent = '';
        }
    });
}

/** Handle all filters including smart relevance when search query is present */
function handleFilterChange() {
    const query = (nameFilter.value || '').trim().toLowerCase();
    const winner = winnerFilter.value;
    const author = authorFilter.value;
    const decade = decadeFilter.value;

    filteredBooks = books.filter(book => {
        // Winner filter
        if (winner === 'winner' && !book.awardWinner) return false;
        if (winner === 'nominee' && book.awardWinner) return false;

        // Author filter
        if (author && author !== 'all' && book.author !== author) return false;

        // Decade filter
        if (decade && decade !== 'all') {
            const start = parseInt(decade, 10);
            if (!book.awardYear || book.awardYear < start || book.awardYear >= start + 10) return false;
        }

        // Text match for search query
        if (!query) return true; // no query, include

        const inTitle = (book.title || '').toLowerCase().includes(query);
        const inAuthor = (book.author || '').toLowerCase().includes(query);
        const inPublisher = (book.publisher || '').toLowerCase().includes(query);
        const inGenres = (book.genres || []).some(g => g.toLowerCase().includes(query));

        return inTitle || inAuthor || inPublisher || inGenres || String(book.awardYear || '').includes(query);
    });

    // If there is a search query, apply smart relevance ranking
    if (nameFilter.value.trim()) {
        const q = nameFilter.value.trim().toLowerCase();
        filteredBooks.sort((a, b) => {
            const score = (item) => {
                const title = (item.title || '').toLowerCase();
                const any = `${item.title} ${item.author} ${item.publisher} ${(item.genres || []).join(' ')}`.toLowerCase();
                if (title === q) return 0; // exact title match
                if (title.includes(q)) return 1; // title contains
                if (any.includes(q)) return 2; // any field contains
                return 3; // fallback
            };
            const sa = score(a), sb = score(b);
            if (sa !== sb) return sa - sb;
            // tie-breaker: newer award year first
            return (b.awardYear || 0) - (a.awardYear || 0);
        });
    }

    changePage(0);
}

/** Clear all filters to defaults */
function clearAllFilters() {
    nameFilter.value = '';
    winnerFilter.value = 'all';
    authorFilter.value = 'all';
    decadeFilter.value = 'all';
    filteredBooks = [...books];
    updateSortIndicators();
    changePage(0);
}

/** Show/hide loading state */
function showLoading(show) {
    loadingElement.classList.toggle('hidden', !show);
    if (show) errorElement.classList.add('hidden');
}

/** Show/hide error state */
function showError(show) {
    // Accept either boolean or string message
    if (!errorElement) return;
    if (show === false) {
        errorElement.classList.add('hidden');
        return;
    }
    let message = 'Error loading data. Please try again.';
    if (typeof show === 'string') message = show;
    errorElement.classList.remove('hidden');
    loadingElement.classList.add('hidden');
    const msgEl = document.getElementById('errorMessage');
    if (msgEl) msgEl.textContent = message;
}

/** Format award display */
function formatAward(award) {
    if (!award || !award.year) return '—';
    return `${award.year} ${award.is_winner ? 'Winner' : 'Nominee'}`;
}

/** Format series display to handle three formats */
function formatSeries(series) {
    if (series === false || series === null || series === undefined) return '—';
    if (typeof series === 'string') return series;
    if (typeof series === 'object' && series.name) {
        return typeof series.order === 'number' ? `${series.name} (#${series.order})` : series.name;
    }
    return '—';
}

/** Escape HTML special characters */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    return str.replace(/[&<>"']/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[tag]));
}

/** Debounce helper */
function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

/** Populate winner filter (keeps consistent options) */
function populateWinnerFilter() {
    winnerFilter.innerHTML = '';
    const opts = [
        { v: 'all', t: 'All books' },
        { v: 'winner', t: 'Winners' },
        { v: 'nominee', t: 'Nominees' }
    ];
    opts.forEach(o => {
        const el = document.createElement('option');
        el.value = o.v; el.textContent = o.t; winnerFilter.appendChild(el);
    });
}

/** Populate author filter values from data */
function populateAuthorFilter() {
    const authors = Array.from(new Set(books.map(b => b.author).filter(Boolean))).sort();
    authorFilter.innerHTML = '';
    const all = document.createElement('option'); all.value = 'all'; all.textContent = 'All authors'; authorFilter.appendChild(all);
    authors.forEach(a => {
        const el = document.createElement('option'); el.value = a; el.textContent = a; authorFilter.appendChild(el);
    });
}

/** Populate decade filter based on award years in the data */
function populateDecadeFilter() {
    const years = books.map(b => b.awardYear).filter(y => typeof y === 'number' && y > 0);
    const decades = Array.from(new Set(years.map(y => Math.floor(y / 10) * 10))).sort((a, b) => a - b);
    decadeFilter.innerHTML = '';
    const all = document.createElement('option'); all.value = 'all'; all.textContent = 'All decades'; decadeFilter.appendChild(all);
    decades.forEach(d => {
        const el = document.createElement('option'); el.value = String(d); el.textContent = `${d}s`; decadeFilter.appendChild(el);
    });
}

/** Update warning count UI */
function updateWarningCount() {
    if (!warningCountEl) return;
    if (!warnings.length) {
        warningCountEl.textContent = '';
        return;
    }
    warningCountEl.textContent = `Warnings: ${warnings.length} (open console for details)`;
    // Print warnings in the console for grading/debugging
    console.warn(`Data validation warnings (${warnings.length}):`);
    warnings.forEach(w => console.warn(w.message));
}

// End of file
