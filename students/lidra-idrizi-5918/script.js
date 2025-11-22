const DATA_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/hugo-books-full.json';
let books = [];
let filteredBooks = [];
let currentSort = { column: 'award', ascending: false };

let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;

document.addEventListener('DOMContentLoaded', () => {
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

async function loadData() {
  try {
    showLoading(true);
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Failed to fetch data');
    const data = await response.json();
    books = Array.isArray(data) ? data : data.books || [];
    if (!Array.isArray(books)) throw new Error('Invalid data format');
    filteredBooks = [...books];
    populateWinnerFilter();
    displayBooks();
  } catch (error) {
    console.error('Error loading data:', error);
    showError(true);
  } finally {
    showLoading(false);
  }
}

function populateWinnerFilter() {
  ['winners', 'nominees'].forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
    winnerFilter.appendChild(option);
  });
}

function setupEventListeners() {
  nameFilter.addEventListener('input', handleFilterChange);
  winnerFilter.addEventListener('change', handleFilterChange);
  clearFiltersBtn.addEventListener('click', clearAllFilters);
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => handleSort(header.dataset.column));
  });
}

function handleFilterChange() {
  const nameValue = nameFilter.value.toLowerCase();
  const winnerValue = winnerFilter.value;

  filteredBooks = books.filter(book => {
    const matchesName =
      book.title?.toLowerCase().includes(nameValue) ||
      book.author?.toLowerCase().includes(nameValue);

    const isWinner = book.award?.is_winner;

    if (winnerValue === 'winners' && !isWinner) return false;
    if (winnerValue === 'nominees' && isWinner) return false;

    return matchesName;
  });

  displayBooks();
}

function clearAllFilters() {
  nameFilter.value = '';
  winnerFilter.value = 'all';
  filteredBooks = [...books];
  displayBooks();
}

function handleSort(column) {
  if (currentSort.column === column) {
    currentSort.ascending = !currentSort.ascending;
  } else {
    currentSort.column = column;
    currentSort.ascending = true;
  }

  filteredBooks.sort((a, b) => {
    let valA = a[column];
    let valB = b[column];

    if (column === 'award') {
      valA = a.award?.year || 0;
      valB = b.award?.year || 0;
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return currentSort.ascending ? -1 : 1;
    if (valA > valB) return currentSort.ascending ? 1 : -1;
    return 0;
  });

  updateSortIndicators();
  displayBooks();
}

function updateSortIndicators() {
  document.querySelectorAll('.sortable').forEach(header => {
    header.classList.remove('sort-asc', 'sort-desc');
    if (header.dataset.column === currentSort.column) {
      header.classList.add(currentSort.ascending ? 'sort-asc' : 'sort-desc');
    }
  });
}

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
    const row = document.createElement('tr');

    const awardText = book.award
      ? `${book.award.year} <span class="winner-badge ${book.award.is_winner ? 'winner' : 'nominee'}">${book.award.is_winner ? 'Winner' : 'Nominee'}</span>`
      : '—';

    const seriesText = book.series === false
      ? '<span class="no-series">None</span>'
      : typeof book.series === 'string'
        ? `<span class="series-name">${book.series}</span>`
        : book.series?.name
          ? `<span class="series-name">${book.series.name} (#${book.series.order})</span>`
          : '<span class="no-series">—</span>';

    const genresText = Array.isArray(book.genres) && book.genres.length > 0
      ? book.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')
      : '<span class="no-genres">None</span>';

    row.innerHTML = `
      <td>${book.title || '—'}</td>
      <td>${book.author || '—'}</td>
      <td>${book.award?.category || '—'}</td>
      <td>${awardText}</td>
      <td>${book.publisher || '—'}</td>
      <td>${seriesText}</td>
      <td>${genresText}</td>
    `;

    tableBody.appendChild(row);
  });
}


    function showLoading(show) {
        if (loadingElement) {
          loadingElement.classList.toggle('hidden', !show);
        }
        if (errorElement) {
          errorElement.classList.add('hidden');
        }
      }
      
      function showError(show) {
        if (errorElement) {
          errorElement.classList.toggle('hidden', !show);
        }
        if (loadingElement) {
          loadingElement.classList.add('hidden');
        }
      }
      