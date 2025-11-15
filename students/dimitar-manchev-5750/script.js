// ====== Hugo Award Books Explorer - script.js ======

// Data URL (official remote JSON)
const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json';

// App State
let books = [];
let filteredBooks = [];
let currentSort = { column: 'award', ascending: false }; // Default: sort by year, newest first

// DOM Elements
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  loadData();
});

// Get all needed DOM elements
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

// Use debounce to optimize filtering performance
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Attach event listeners for filtering, sorting, clearing
function setupEventListeners() {
  nameFilter.addEventListener('input', debounce(handleFilterChange, 250));
  winnerFilter.addEventListener('change', handleFilterChange);
  clearFiltersBtn.addEventListener('click', clearAllFilters);
  // Sorting
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => handleSort(th.dataset.column));
  });
}

// Load book data remotely & process
async function loadData() {
  try {
    showLoading(true);
    showError(false);
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Failed to fetch data');
    const jsonData = await response.json();
    // Use the .books array from wrapper object
    books = Array.isArray(jsonData.books) ? jsonData.books : [];
    validateData(books);
    filteredBooks = [...books];
    populateWinnerFilter();
    handleSort(currentSort.column, true);
  } catch (err) {
    console.error('Error loading data:', err);
    showError(true);
  } finally {
    showLoading(false);
  }
}

// Validate data for required and suspicious fields (console warnings)
function validateData(data) {
  const ids = new Set();
  let warningCount = 0;
  data.forEach(book => {
    if (!book.id) { console.warn('Missing id in book:', book); warningCount++; }
    if (!book.title) { console.warn(`Missing title in book ID ${book.id}`); warningCount++; }
    if (!book.award || typeof book.award.year !== 'number' || typeof book.award.is_winner !== 'boolean') {
      console.warn(`Invalid or missing award info in book ID ${book.id}`); warningCount++;
    }
    if (ids.has(String(book.id))) {
      console.warn(`Duplicate book id detected: ${book.id}`); warningCount++;
    }
    ids.add(String(book.id));
    if (book.award && book.award.year > new Date().getFullYear()) {
      console.warn(`Future award year detected in book ID ${book.id}: ${book.award.year}`); warningCount++;
    }
  });
  // Optionally: display warningCount in UI (Tier 3 feature)
}

// Populate winner/nominee filter dropdown
function populateWinnerFilter() {
  winnerFilter.innerHTML = `
    <option value="all">All books</option>
    <option value="winner">Winners only</option>
    <option value="nominee">Nominees only</option>
  `;
}

// Filtering logic for text input & winner filter
function handleFilterChange() {
  const text = nameFilter.value.trim().toLowerCase();
  const status = winnerFilter.value;
  filteredBooks = books.filter(book => {
    const matchesText =
      !text ||
      (book.title && book.title.toLowerCase().includes(text)) ||
      (book.author && book.author.toLowerCase().includes(text));
    const matchesStatus =
      status === 'all' ||
      (status === 'winner' && book.award?.is_winner === true) ||
      (status === 'nominee' && book.award?.is_winner === false);
    return matchesText && matchesStatus;
  });
  handleSort(currentSort.column, true);
}

// Sorting logic (toggle on repeated click)
function handleSort(column, skipToggle = false) {
  if (!skipToggle) {
    if (currentSort.column === column) {
      currentSort.ascending = !currentSort.ascending;
    } else {
      currentSort.column = column;
      currentSort.ascending = true;
    }
  }
  filteredBooks.sort((a, b) => {
    let valA, valB;
    switch (column) {
      case 'title':
      case 'author':
      case 'publisher':
        valA = (a[column] || '').toLowerCase();
        valB = (b[column] || '').toLowerCase();
        return currentSort.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'award':
        valA = a.award?.year || 0;
        valB = b.award?.year || 0;
        return currentSort.ascending ? valA - valB : valB - valA;
      case 'category':
        valA = (a.award?.category || '').toLowerCase();
        valB = (b.award?.category || '').toLowerCase();
        return currentSort.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'series':
        const getSeriesName = s => !s ? '' : (typeof s === 'string' ? s : (s.name || ''));
        valA = getSeriesName(a.series).toLowerCase();
        valB = getSeriesName(b.series).toLowerCase();
        return currentSort.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'genres':
        valA = (a.genres && a.genres.length ? a.genres[0].toLowerCase() : '');
        valB = (b.genres && b.genres.length ? b.genres[0].toLowerCase() : '');
        return currentSort.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      default: return 0;
    }
  });
  updateSortIndicators();
  displayBooks();
}

// Draw the table with the filtered and sorted data
function displayBooks() {
  tableBody.innerHTML = '';
  resultsCount.textContent = `Showing ${filteredBooks.length} of ${books.length} books`;
  if (filteredBooks.length === 0) {
    noResults.classList.remove('hidden');
    return;
  } else {
    noResults.classList.add('hidden');
  }
  filteredBooks.forEach(book => {
    const tr = document.createElement('tr');

    // Title (clickable link to more info if available)
    const tdTitle = document.createElement('td');
    if (book.url) {
      const link = document.createElement('a');
      link.href = book.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = book.title || '—';
      tdTitle.appendChild(link);
    } else {
      tdTitle.textContent = book.title || '—';
    }
    tr.appendChild(tdTitle);

    // Author
    const tdAuthor = document.createElement('td');
    tdAuthor.textContent = book.author || '—';
    tr.appendChild(tdAuthor);

    // Award Category field
    const tdCategory = document.createElement('td');
    tdCategory.textContent = book.award?.category || '—';
    tr.appendChild(tdCategory);

    // Award (Winner/Nominee badge)
    const tdAward = document.createElement('td');
    if (book.award) {
      tdAward.textContent = `${book.award.year} ${book.award.is_winner ? 'Winner' : 'Nominee'}`;
      tdAward.className = book.award.is_winner ? 'winner-badge winner' : 'winner-badge nominee';
    } else {
      tdAward.textContent = '—';
    }
    tr.appendChild(tdAward);

    // Publisher
    const tdPublisher = document.createElement('td');
    tdPublisher.textContent = book.publisher || '—';
    tr.appendChild(tdPublisher);

    // Series (all edge cases)
    const tdSeries = document.createElement('td');
    if (book.series === false || book.series === null) {
      tdSeries.textContent = 'None';
      tdSeries.classList.add('no-series');
    } else if (typeof book.series === 'string') {
      tdSeries.textContent = book.series;
      tdSeries.classList.add('series-name');
    } else if (typeof book.series === 'object') {
      tdSeries.textContent = `${book.series.name} (#${book.series.order || '?'})`;
      tdSeries.classList.add('series-name');
    } else {
      tdSeries.textContent = 'None';
      tdSeries.classList.add('no-series');
    }
    tr.appendChild(tdSeries);

    // Genres as tags
    const tdGenres = document.createElement('td');
    if (book.genres && book.genres.length > 0) {
      tdGenres.innerHTML = book.genres.map(
        g => `<span class="genre-tag">${g}</span>`
      ).join(' ');
      tdGenres.classList.add('genres-list');
    } else {
      tdGenres.textContent = 'None';
      tdGenres.classList.add('no-genres');
    }
    tr.appendChild(tdGenres);

    tableBody.appendChild(tr);
  });
}

// Reset all filters and show all books
function clearAllFilters() {
  nameFilter.value = '';
  winnerFilter.value = 'all';
  filteredBooks = [...books];
  handleSort(currentSort.column, true);
}

// Add or remove sorted state to table headers
function updateSortIndicators() {
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.column === currentSort.column) {
      th.classList.add(currentSort.ascending ? 'sort-asc' : 'sort-desc');
    }
  });
}

// Show or hide loading indicator
function showLoading(show) {
  if (show) {
    loadingElement.classList.remove('hidden');
    errorElement.classList.add('hidden');
  } else {
    loadingElement.classList.add('hidden');
  }
}

// Show or hide error indicator
function showError(show) {
  if (show) {
    errorElement.classList.remove('hidden');
    loadingElement.classList.add('hidden');
  } else {
    errorElement.classList.add('hidden');
  }
}

// ====== End of script.js ======
