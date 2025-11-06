const DATA_URLS = [
    'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_books.json',
    'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_edges.json',
    'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_novellas.json'
  ];
  
  let books = [];
  let filteredBooks = [];
  let currentSort = { column: 'award', ascending: false };
  let currentPage = 1;
  const pageSize = 50;
  
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
  
  function setupEventListeners() {
    nameFilter.addEventListener('input', debounce(handleFilterChange));
    winnerFilter.addEventListener('change', handleFilterChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  
    document.querySelectorAll('.sortable').forEach(header => {
      header.addEventListener('click', () => handleSort(header.dataset.column));
    });
  }
  
  async function loadData() {
    try {
      showLoading(true);
      const responses = await Promise.all(DATA_URLS.map(url => fetch(url)));
      const jsonArrays = await Promise.all(responses.map(res => res.json()));
      books = jsonArrays.map(a=> a.books).flat();
      filteredBooks = [...books];
      displayBooks();
    } catch (error) {
      console.error('Error loading data:', error);
      showError(true);
    } finally {
      showLoading(false);
    }
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
  
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageBooks = filteredBooks.slice(start, end);
  
    pageBooks.forEach(book => {
      const safe = val => val ?? '—';
      const awardText = `${safe(book.award?.year)} ${book.award?.is_winner ? 'Winner' : 'Nominee'}`;
      const seriesText = book.series === false
        ? 'None'
        : typeof book.series === 'string'
          ? book.series
          : book.series?.name
            ? `${book.series.name} (#${book.series.order})`
            : 'Unknown';
  
      const genresHTML = book.genres?.length
        ? book.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')
        : '<span class="no-genres">None</span>';
  
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${safe(book.title)}</td>
        <td>${safe(book.author)}</td>
        <td class="book-type">${safe(book.award?.category)}</td>
        <td><span class="winner-badge ${book.award?.is_winner ? 'winner' : 'nominee'}">${awardText}</span></td>
        <td>${safe(book.publisher)}</td>
        <td class="${book.series === false ? 'no-series' : 'series-name'}">${seriesText}</td>
        <td><span class="genres-list">${genresHTML}</span></td>
      `;
      tableBody.appendChild(row);
    });
  
    renderPaginationControls();
  }
  
  function renderPaginationControls() {
    const totalPages = Math.ceil(filteredBooks.length / pageSize);
    const footer = document.querySelector('footer');
    footer.innerHTML = '<p>&copy; 2025 Hugo Award Books Explorer</p>';
  
    if (totalPages <= 1) return;
  
    const nav = document.createElement('div');
    nav.className = 'pagination';
  
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = i === currentPage ? 'active' : '';
      btn.addEventListener('click', () => {
        currentPage = i;
        displayBooks();
      });
      nav.appendChild(btn);
    }
  
    footer.appendChild(nav);
  }
  
  function handleFilterChange() {
    const nameQuery = nameFilter.value.toLowerCase();
    const winnerValue = winnerFilter.value;
  
    filteredBooks = books.filter(book => {
      const matchesName =
        book.title?.toLowerCase().includes(nameQuery) ||
        book.author?.toLowerCase().includes(nameQuery);
  
      const matchesWinner =
        winnerValue === 'all' ||
        (winnerValue === 'winner' && book.award?.is_winner) ||
        (winnerValue === 'nominee' && !book.award?.is_winner);
  
      return matchesName && matchesWinner;
    });
  
    filteredBooks.sort((a, b) => {
      const query = nameQuery;
  
      const score = book => {
        if (book.title?.toLowerCase() === query) return 3;
        if (book.title?.toLowerCase().includes(query)) return 2;
        if (
          book.author?.toLowerCase().includes(query) ||
          book.publisher?.toLowerCase().includes(query) ||
          book.genres?.some(g => g.toLowerCase().includes(query))
        ) return 1;
        return 0;
      };
  
      return score(b) - score(a) || b.award?.year - a.award?.year;
    });
  
    currentPage = 1;
    displayBooks();
  }
  
  function clearAllFilters() {
    nameFilter.value = '';
    winnerFilter.value = 'all';
    filteredBooks = [...books];
    currentPage = 1;
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
      let valA = column === 'award' ? a.award?.year : a[column];
      let valB = column === 'award' ? b.award?.year : b[column];
  
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
  
  function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }
  