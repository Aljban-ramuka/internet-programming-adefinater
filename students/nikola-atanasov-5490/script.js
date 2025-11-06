// Configuration and constants
const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json'; // Path to the exam data file
let books = [];
let filteredBooks = [];
let currentSort = { column: 'year', ascending: false }; // Default sort by year, newest first

// DOM elements (will be populated when DOM loads)
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;
let tableHeaders = [];

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

    tableHeaders = Array.from(document.querySelectorAll('th.sortable'));
    
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
    // TODO: Add event listeners for:
    // - Filter inputs (text input, dropdowns)
    // - Sort buttons (table headers)
    // - Clear filters button
    if (nameFilter) nameFilter.addEventListener('input', debounce(handleFilterChange, 180));
    if (winnerFilter) winnerFilter.addEventListener('change', handleFilterChange);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);
    // TODO: Add sort listeners to table headers
    if (Array.isArray(tableHeaders) && tableHeaders.length) {
        tableHeaders.forEach(header => {
          header.addEventListener('click', () => {
            const col = header.dataset.column;
            handleSort(col);
          });
        });
      }
}

/**
 * Load book data from JSON file
 */
async function loadData() {
    try {
        showLoading(true);
        const res = await fetch(DATA_URL, {cache: 'no-store'});
        if (!res.ok) throw new Error (`Error: ${res.status} ${res.statusText}`);
        const json = await res.json();
        const data = Array.isArray(json) ? json : (Array.isArray(json.books) ? json.books : []);
        if (!Array.isArray(data)) throw new Error('No book array found in response');

        books = data.map(normalizeBook);
        filteredBooks = [...books];
        populateWinnerFilter();
        applySort();
        displayBooks();
        // TODO: Fetch data from DATA_URL
        // TODO: Handle successful response and errors
        // TODO: Call displayBooks() when data is loaded

    } catch (error) {
        console.error('Error loading data:', error);
        books = [];
        filteredBooks = [];
        showError(true);
        displayBooks();
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
    updateResultsInfo(filteredBooks.length, books.length);
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
    const frag = document.createDocumentFragment();
    filteredBooks.forEach(b => frag.appendChild(createRow(b)));
    tableBody.appendChild(frag);
}

function createRow(book) {
    const tr = document.createElement('tr');

    tr.appendChild(td(textOrDash(book.title)));
    tr.appendChild(td(textOrDash(book.author)));
    tr.appendChild(td(extractType(book.award)));

    const awardTd = td(formatAward(book.award));
    const y = awardYearAsNumber(book);
    awardTd.dataset.year = Number.isFinite(y) ? String(y) : '';
    tr.appendChild(awardTd);

    tr.appendChild(td(textOrDash(book.publisher)));
    tr.appendChild(td(formatSeries(book.series)));
    tr.appendChild(td(formatGenres(book.genres)));

    return tr;
  }
  function td(text) {
    const el = document.createElement('td');
    el.textContent = safeText(text);
    return el;
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
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
      } else {
        currentSort.column = column;
        currentSort.ascending = true;
      }
    updateSortIndicators();
    applySort();
    displayBooks();
    console.log('Sort by:', column);
}
function applySort() {
    const col = currentSort.column;
    const asc = currentSort.ascending ? 1 : -1;
  
    filteredBooks.sort((a, b) => {
      // award column sorts by numeric year; missing years go last
      if (col === 'award') {
        const ay = awardYearAsNumber(a);
        const by = awardYearAsNumber(b);
        const aValid = Number.isFinite(ay);
        const bValid = Number.isFinite(by);
  
        if (!aValid && !bValid) {
          // fallback: winners before nominees, then title
          const aw = Boolean(a.award && a.award.is_winner);
          const bw = Boolean(b.award && b.award.is_winner);
          if (aw !== bw) return aw ? -1 : 1;
          return stringCompare(a.title, b.title) * asc;
        }
        if (!aValid) return 1;
        if (!bValid) return -1;
        return (ay - by) * asc;
      }
  
      // category (type)
      if (col === 'category') {
        return stringCompare(extractType(a.award), extractType(b.award)) * asc;
      }
  
      // genres: compare joined string
      if (col === 'genres') {
        return stringCompare(formatGenres(a.genres), formatGenres(b.genres)) * asc;
      }
  
      // series
      if (col === 'series') {
        return stringCompare(formatSeries(a.series), formatSeries(b.series)) * asc;
      }
  
      // title, author, publisher default to string compare
      if (col === 'title' || col === 'author' || col === 'publisher') {
        return stringCompare(String(a[col] ?? ''), String(b[col] ?? '')) * asc;
      }
  
      // default no change
      return 0;
    });
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
    const q = (nameFilter ? nameFilter.value.trim().toLowerCase() : '').normalize?.() ?? '';
    const winnerChoice = winnerFilter ? winnerFilter.value : 'all';

    filteredBooks = books.filter(book => {
    // Text search on title and author
    if (q) {
      const title = String(book.title ?? '').toLowerCase();
      const author = String(book.author ?? '').toLowerCase();
      if (!title.includes(q) && !author.includes(q)) return false;
    }

    // Winner status filter
    if (winnerChoice === 'all') return true;
    if (!book.award) return winnerChoice === 'no-award';
    if (winnerChoice === 'winner') return Boolean(book.award.is_winner) === true;
    if (winnerChoice === 'nominee') return Boolean(book.award.is_winner) === false;
    return true;
  });

  applySort();
  displayBooks();
    console.log('Filters changed');
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    // TODO: Reset all filter inputs to default values
    // TODO: Reset filteredBooks to show all books
    // TODO: Re-display books
    if(nameFilter) nameFilter.value = '';
    if(winnerFilter) winnerFilter.value = 'all';
    currentSort = {column: 'award', ascending:false};
    updateSortIndicators();
    filteredBooks = [...books];
    applySort();
    displayBooks;
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
    const msgEl = document.getElementById('errorMessage');
    const detailsEl = document.getElementById('errorDetails');
    const retryBtn = document.getElementById('retryLoad');
    if (!errorElement || !msgEl) return;

    // Human-friendly message
    msgEl.textContent = safeText(userMessage || 'An error occurred while loading data.');

    // Show technical detail only if provided and sanitized
    if (technicalDetail) {
        detailsEl.textContent = String(technicalDetail).slice(0, 2000); // cap length
        detailsEl.classList.remove('hidden');
        detailsEl.setAttribute('aria-hidden', 'false');
    } else {
        detailsEl.classList.add('hidden');
        detailsEl.setAttribute('aria-hidden', 'true');
    }

    // Show error area and hide loading state
    errorElement.classList.remove('hidden');
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wire retry button (idempotent)
    if (retryBtn) {
        retryBtn.onclick = () => {
        errorElement.classList.add('hidden');
        loadData(); // attempt reload
        };
    }
    if (show) {
        errorElement.classList.remove('hidden');
        loadingElement.classList.add('hidden');
    } else {
        errorElement.classList.add('hidden');
    }
}
function updateResultsInfo(shown, total) {
    if (!resultsCount) return;
    resultsCount.textContent = `Showing ${shown} of ${total} books`;
  }
function updateSortIndicators() {
    tableHeaders.forEach(h => {
      const col = h.dataset.column;
      const ind = h.querySelector('.sort-indicator');
      if (col === currentSort.column) {
        const arrow = currentSort.ascending ? '^' : 'v';
        h.classList.add('sorted');
        if (ind) ind.textContent = ` ${arrow}`;
      } else {
        h.classList.remove('sorted');
        if (ind) ind.textContent = '';
      }
    });
  }
  //function to map corresponding elements
  function normalizeBook(b = {}) {
    return {
      title: b.title ?? '—',
      author: b.author ?? '—',
      award: (b.award && typeof b.award === 'object') ? {
        year: b.award.year ?? null,
        is_winner: b.award.is_winner ?? false,
        category: b.award.category ?? null
      } : null,
      publisher: b.publisher ?? '—',
      series: (b.series === false) ? false : (b.series ?? null),
      genres: Array.isArray(b.genres) ? b.genres.slice() : (typeof b.genres === 'string' ? [b.genres] : [])
    };
  }

  function populateWinnerFilter() {
    if (!winnerFilter) return;
    winnerFilter.innerHTML = `
      <option value="all">All books</option>
      <option value="winner">Winners only</option>
      <option value="nominee">Nominees only</option>
      <option value="no-award">No award data</option>
    `;
  }

  function textOrDash(v) {
    if (v === null || v === undefined || v === '') return '—';
    return safeText(v);
  }
  
  function debounce(fn, wait) {
    let t = null;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function formatAward(award) {
    if (!award) return '—';
    const yearRaw = award.year ?? '';
    const year = String(yearRaw).trim();
    const label = Boolean(award.is_winner) ? 'Winner' : 'Nominee';
    return year ? `${year} ${label}` : `Unknown ${label}`;
  }
  
  function extractType(award) {
    if (!award || !award.category) return '—';
    return String(award.category);
  }
  /* Series formatting covers three shapes:
   - false => 'None'
   - string => the string
   - object with { name, ... } => display the series name
   Fallback => 'None' */
  function formatSeries(series) {
    if (series === false) return 'None';
    if (!series) return 'None';
    if (typeof series === 'string') return series;
    if (typeof series === 'object' && series.name) return String(series.name);
    return 'None';
  }
  
  function formatGenres(genres) {
    if (!genres || !Array.isArray(genres) || genres.length === 0) return '—';
    return genres.join(', ');
  }
  
  function awardYearAsNumber(book) {
    if (!book || !book.award) return NaN;
    const n = Number(book.award.year);
    return Number.isFinite(n) ? n : NaN;
  }
  
  function stringCompare(a, b) {
    const aa = String(a ?? '').toLowerCase();
    const bb = String(b ?? '').toLowerCase();
    if (aa < bb) return -1;
    if (aa > bb) return 1;
    return 0;
  }
  // Safe text insertion helper: normalizes Unicode and uses textContent
  function safeText(str) {
    if (str === null || str === undefined) return '—';
    try {
      // Normalize to composed form for consistent display
      return String(str).normalize ? String(str).normalize('NFC') : String(str);
    } catch (e) {
      return String(str);
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