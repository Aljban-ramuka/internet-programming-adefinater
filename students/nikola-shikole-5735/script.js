// Configuration and constants
let focusedRowIndex = -1;
let books = [];
let filteredBooks = [];
let currentSort = { column: 'award', ascending: false };

// DOM elements (will be populated when DOM loads)
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;

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
}

/**
 * Debounce helper - delays a function call until user stops typing
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}


/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {

    // 🔍 Filter input (debounced for performance)
    const debouncedFilter = debounce(handleFilterChange, 300);
    nameFilter.addEventListener("input", debouncedFilter);


  // 🏆 Winner dropdown (we’ll fill options next)
  winnerFilter.innerHTML = `
    <option value="all">All books</option>
    <option value="winners">Winners only</option>
    <option value="nominees">Nominees only</option>
  `;
  winnerFilter.addEventListener("change", handleFilterChange);

  // ❌ Clear filters button
  clearFiltersBtn.addEventListener("click", clearAllFilters);

  // ↕ Sorting on column headers
  document.querySelectorAll(".sortable").forEach((header) => {
    header.addEventListener("click", () => handleSort(header.dataset.column));
  });

    // 🎹 Keyboard navigation (improved)
document.addEventListener("keydown", (event) => {
  const rows = Array.from(tableBody.querySelectorAll("tr"));
  const headers = Array.from(document.querySelectorAll(".sortable"));

  if (rows.length === 0) return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusRow(focusedRowIndex + 1);
      break;

    case "ArrowUp":
      event.preventDefault();
      focusRow(focusedRowIndex - 1);
      break;

    case "Enter":
      event.preventDefault();
      // If a row is focused → open its link (if any)
      if (focusedRowIndex >= 0 && focusedRowIndex < rows.length) {
        const cells = rows[focusedRowIndex].querySelectorAll("td");
        // For extra polish: if the book has a URL, open it in a new tab
        const book = filteredBooks[focusedRowIndex];
        if (book?.url) {
          window.open(book.url, "_blank");
        } else {
          console.log("Selected:", book?.title || "No title");
        }
      } else {
        // If no row is focused → default to sorting by Title
        const titleHeader = headers.find((h) => h.dataset.column === "title");
        if (titleHeader) handleSort(titleHeader.dataset.column);
      }
      break;

    case "Escape":
      event.preventDefault();
      clearFocus();
      break;

    default:
      break;
  }
});


}

function formatAward(award) {
  if (!award || !award.year) return "—";
  const year = award.year ?? "Unknown Year";
  const status = award.is_winner ? "Winner" : "Nominee";
  return `${year} ${status}`;
}

/**
 * Format series in all its possible forms
 */
function formatSeries(series) {
  // Handle false explicitly first
  if (series === false) return "None";

  if (typeof series === "string") return series;

  if (typeof series === "object" && series !== null) {
    return series.order
      ? `${series.name} (#${series.order})`
      : series.name || "—";
  }

  // Catch null, undefined, or anything else weird
  if (!series) return "—";

  return "—";
}

/**
 * Format genres nicely
 */
function formatGenres(genres) {
  if (!Array.isArray(genres) || genres.length === 0) return "None";
  return genres.join(", ");
}

/**
 * Load book data from JSON file
 */
async function loadData() {
  const urlsBonus = [
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_books.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_edges.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo_novellas.json",
  ];

  const urlSingle =
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json";

  try {
    showLoading(true);
    let data = [];

    // Try BONUS multi-source first
    try {
      const responses = await Promise.all(urlsBonus.map((u) => fetch(u)));
      const allOk = responses.every((res) => res.ok);
      if (!allOk) throw new Error("One of the bonus URLs failed");
      const arrays = await Promise.all(responses.map((res) => res.json()));
      data = arrays.flat(); // merge all arrays
      console.log("✅ Loaded from BONUS multi-source (Tier 1 +5 pts)");
    } catch {
      // Fallback to single source
      const res = await fetch(urlSingle);
      if (!res.ok) throw new Error("Single source failed");
      data = await res.json();
      console.log("✅ Loaded from single-source JSON");
    }

    // ✅ Handle multi-source merged structure
    if (Array.isArray(data)) {
      // Each element may contain a "books" array
      books = data.flatMap(entry => entry.books || []);
    } else {
      // Single-source fallback
      books = data.books || [];
    }

    filteredBooks = [...books];
    displayBooks();
    validateData();
  } catch (error) {
    console.error("Error loading data:", error);
    showError(true);
  } finally {
    showLoading(false);
  }
}

function validateData() {
  const warnings = [];
  const seenIds = new Set();
  const currentYear = new Date().getFullYear();

  books.forEach((book, index) => {
    // Missing required fields
    if (!book.title || !book.author || !book.award) {
      warnings.push(`Book #${index + 1}: missing required fields`);
    }

    // Duplicate IDs
    if (book.id) {
      if (seenIds.has(String(book.id))) {
        warnings.push(`Duplicate ID found: ${book.id}`);
      } else {
        seenIds.add(String(book.id));
      }
    }

    // Future award year
    if (book.award?.year > currentYear) {
      warnings.push(
        `${book.title || "Unknown title"} has future award year: ${book.award.year}`
      );
    }

    // Invalid winner status
    if (
      book.award &&
      typeof book.award.is_winner !== "boolean" &&
      book.award.is_winner !== undefined
    ) {
      warnings.push(`${book.title || "Unknown title"}: invalid winner status`);
    }
  });

  // Show count in UI
  const warningElement = document.getElementById("warningCount");
  if (warnings.length > 0) {
    warningElement.textContent = `⚠ ${warnings.length} data issues found (see console)`;
    console.warn("⚠ Data Validation Warnings:", warnings);
  } else {
    warningElement.textContent = "✅ No data validation issues found";
    console.log("✅ Data validated successfully – no issues detected");
  }
}


/**
 * Display books in the table
 */
function displayBooks() {
  tableBody.innerHTML = "";

  resultsCount.textContent = `Showing ${filteredBooks.length} of ${books.length} books`;

  if (filteredBooks.length === 0) {
    noResults.classList.remove("hidden");
    return;
  } else {
    noResults.classList.add("hidden");
  }

  filteredBooks.forEach((book) => {
    const tr = document.createElement("tr");

    // Define each column cell
    const tdTitle = document.createElement("td");
    tdTitle.textContent = book.title || "—";

    const tdAuthor = document.createElement("td");
    tdAuthor.textContent = book.author || "—";

    const tdType = document.createElement("td");
    tdType.textContent = book.award?.category || "—";

    const tdAward = document.createElement("td");
    tdAward.textContent = formatAward(book.award);

    const tdPublisher = document.createElement("td");
    tdPublisher.textContent = book.publisher || "—";

    const tdSeries = document.createElement("td");
    tdSeries.textContent = formatSeries(book.series);

    const tdGenres = document.createElement("td");
    tdGenres.textContent = formatGenres(book.genres);

    // Append cells safely
    tr.append(
      tdTitle,
      tdAuthor,
      tdType,
      tdAward,
      tdPublisher,
      tdSeries,
      tdGenres
    );

    tableBody.appendChild(tr);
  });
}

/**
 * Keyboard navigation helpers (Tier 3)
 */
function focusRow(index) {
  const rows = tableBody.querySelectorAll("tr");
  if (rows.length === 0) return;
  rows.forEach((row) => row.classList.remove("focused-row"));

  if (index < 0) index = 0;
  if (index >= rows.length) index = rows.length - 1;

  rows[index].classList.add("focused-row");
  rows[index].scrollIntoView({ behavior: "smooth", block: "nearest" });
  focusedRowIndex = index;
}

function clearFocus() {
  tableBody.querySelectorAll("tr").forEach((row) => row.classList.remove("focused-row"));
  focusedRowIndex = -1;
}


/**
 * Handle sorting by column
 */
function handleSort(column) {
  if (currentSort.column === column) {
    currentSort.ascending = !currentSort.ascending;
  } else {
    currentSort.column = column;
    currentSort.ascending = true;
  }

  filteredBooks.sort((a, b) => {
    let valA = getValue(a, column);
    let valB = getValue(b, column);

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return currentSort.ascending ? -1 : 1;
    if (valA > valB) return currentSort.ascending ? 1 : -1;
    return 0;
  });

  updateSortIndicators();
  displayBooks();
}

function getValue(book, column) {
  switch (column) {
    case "title": return book.title;
    case "author": return book.author;
    case "category": return book.award?.category || "";
    case "award": return book.award?.year || 0;
    case "publisher": return book.publisher || "";
    case "series":
      return typeof book.series === "object" ? book.series.name : book.series || "";
    case "genres":
      return (book.genres && book.genres.join(", ")) || "";
    default: return "";
  }
}

function updateSortIndicators() {
  document.querySelectorAll(".sortable").forEach((header) => {
    header.classList.remove("sort-asc", "sort-desc");
    if (header.dataset.column === currentSort.column) {
      header.classList.add(currentSort.ascending ? "sort-asc" : "sort-desc");
    }
  });
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
  const searchTerm = nameFilter.value.toLowerCase().trim();
  const winnerStatus = winnerFilter.value;

  // Filter books first
  filteredBooks = books.filter((book) => {
    const title = book.title ? book.title.toLowerCase() : "";
    const author = book.author ? book.author.toLowerCase() : "";

    const matchesSearch =
      searchTerm === "" ||
      title.includes(searchTerm) ||
      author.includes(searchTerm);

    let matchesWinner = true;
    if (winnerStatus === "winners") matchesWinner = book.award?.is_winner;
    else if (winnerStatus === "nominees")
      matchesWinner = !book.award?.is_winner;

    return matchesSearch && matchesWinner;
  });

  // Smart relevance sort only if search term entered
  if (searchTerm !== "") {
    filteredBooks.sort((a, b) => {
      const score = (book) => {
        const title = book.title?.toLowerCase() || "";
        const author = book.author?.toLowerCase() || "";

        if (title === searchTerm) return 4;          // exact title match
        if (title.includes(searchTerm)) return 3;    // partial title match
        if (author.includes(searchTerm)) return 2;   // author match
        return 1;                                    // default fallback
      };

      const scoreA = score(a);
      const scoreB = score(b);

      // Higher score first; tie-breaker = award year (descending)
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.award?.year || 0) - (a.award?.year || 0);
    });
  }

  displayBooks();
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    nameFilter.value = "";
    winnerFilter.value = "all";
    filteredBooks = [...books];
    displayBooks();
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