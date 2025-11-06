const DATA_URL = "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json";

let books = [];            // this will be an array of book objects
let filteredBooks = [];
let currentSort = { column: "award", ascending: false };

// DOM elements
let loadingElement, errorElement, tableBody, resultsCount, noResults;
let nameFilter, winnerFilter, clearFiltersBtn;

document.addEventListener("DOMContentLoaded", () => {
    initializeElements();
    setupEventListeners();
    loadData();
});

function initializeElements() {
    loadingElement = document.getElementById("loading");
    errorElement = document.getElementById("error");
    tableBody = document.getElementById("booksTableBody");
    resultsCount = document.getElementById("resultsCount");
    noResults = document.getElementById("noResults");

    nameFilter = document.getElementById("nameFilter");
    winnerFilter = document.getElementById("winnerFilter");
    clearFiltersBtn = document.getElementById("clearFilters");
}

function setupEventListeners() {
    nameFilter.addEventListener("input", handleFilterChange);

    // Populate winner filter and listen for change
    winnerFilter.innerHTML = `
        <option value="all">All books</option>
        <option value="winner">Winners only</option>
        <option value="nominee">Nominees only</option>
    `;
    winnerFilter.addEventListener("change", handleFilterChange);

    clearFiltersBtn.addEventListener("click", clearAllFilters);

    document.querySelectorAll("th.sortable").forEach(th => {
        th.addEventListener("click", () => handleSort(th.dataset.column));
    });
}

/**
 * Load book data.
 * Handles both: top-level array OR { total_books, books: [...] } shapes.
 */
async function loadData() {
    try {
        showLoading(true);
        showError(false);

        const response = await fetch(DATA_URL, { cache: "no-store" });

        if (!response.ok) {
            // HTTP error status (404, 500, etc.)
            const text = await response.text().catch(() => "");
            console.error("Fetch failed: HTTP", response.status, response.statusText, text);
            throw new Error(`Network error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Support both shapes:
        // - data is an array: [ {..}, {..} ]
        // - data is an object: { total_books: N, books: [ ... ] }
        if (Array.isArray(data)) {
            books = data;
        } else if (data && Array.isArray(data.books)) {
            books = data.books;
        } else {
            console.error("Unexpected JSON shape from data URL:", data);
            throw new Error("Unexpected data format received from server");
        }

        // Basic validation: ensure array of objects
        if (!Array.isArray(books)) {
            throw new Error("No books array found in fetched data");
        }

        // Normalise possible missing fields and types for safety
        books = books.map((b, i) => normalizeBook(b, i));

        // Initially show all books
        filteredBooks = [...books];

        // Default sorting: newest award year first
        currentSort = { column: "award", ascending: false };
        sortFilteredBooks();

        displayBooks();
    } catch (err) {
        // Show a useful error message for the user and log full details for debugging
        console.error("Error loading data:", err);
        showError(true, `Error loading data: ${err.message}`);
    } finally {
        showLoading(false);
    }
}

/**
 * Ensure required fields exist and coerce types where appropriate.
 */
function normalizeBook(raw, idx) {
    const book = Object.assign({}, raw);

    // id: coerce to string for consistent comparison
    if (book.id === undefined || book.id === null) {
        book.id = `missing-${idx}`;
        console.warn("Book missing id, assigning placeholder:", book);
    } else {
        book.id = String(book.id);
    }

    book.title = book.title ?? "Untitled";
    book.author = book.author ?? "Unknown";
    book.publisher = book.publisher ?? "Unknown";
    book.genres = Array.isArray(book.genres) ? book.genres : [];
    book.series = book.series === false ? false : book.series ?? false;

    // award safety
    book.award = book.award ?? {};
    book.award.year = typeof book.award.year === "number" ? book.award.year : (Number(book.award.year) || 0);
    book.award.category = book.award.category ?? "Unknown";
    book.award.is_winner = typeof book.award.is_winner === "boolean" ? book.award.is_winner : Boolean(book.award.is_winner);

    return book;
}

/**
 * Render table rows from filteredBooks
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

    filteredBooks.forEach(book => {
        const tr = document.createElement("tr");

        const awardDisplay = `${book.award.year || "—"} ${book.award.is_winner ? "Winner" : "Nominee"}`;

        // Series formatting
        let seriesText = "None";
        if (book.series === false) {
            seriesText = "None";
        } else if (typeof book.series === "string") {
            seriesText = book.series || "None";
        } else if (typeof book.series === "object" && book.series !== null) {
            const name = book.series.name ?? "Series";
            const order = book.series.order !== undefined ? ` (#${book.series.order})` : "";
            seriesText = `${name}${order}`;
        }

        // Genres formatting
        const genresText = (Array.isArray(book.genres) && book.genres.length > 0) ? book.genres.join(", ") : "None";

        // Escape textContent usage to avoid accidental HTML injection
        const td = (text) => {
            const cell = document.createElement("td");
            cell.textContent = text;
            return cell;
        };

        tr.appendChild(td(book.title));
        tr.appendChild(td(book.author));
        tr.appendChild(td(book.award.category || "Unknown"));
        tr.appendChild(td(awardDisplay));
        tr.appendChild(td(book.publisher));
        tr.appendChild(td(seriesText));
        tr.appendChild(td(genresText));

        tableBody.appendChild(tr);
    });
}

/**
 * Sorting entrypoint (toggles / sets direction)
 */
function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }
    sortFilteredBooks();
    displayBooks();
}

/**
 * Actual sort logic applied to filteredBooks
 */
function sortFilteredBooks() {
    filteredBooks.sort((a, b) => {
        let valA, valB;

        switch (currentSort.column) {
            case "award":
                valA = a.award.year || 0;
                valB = b.award.year || 0;
                break;
            case "genres":
                valA = (a.genres || []).join(", ");
                valB = (b.genres || []).join(", ");
                break;
            case "series":
                valA = (typeof a.series === "object" && a.series) ? (a.series.name || "") : (a.series === false ? "" : String(a.series || ""));
                valB = (typeof b.series === "object" && b.series) ? (b.series.name || "") : (b.series === false ? "" : String(b.series || ""));
                break;
            default:
                valA = (a[currentSort.column] ?? "").toString();
                valB = (b[currentSort.column] ?? "").toString();
        }

        // numeric compare when possible
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
            return currentSort.ascending ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
        }

        // string compare
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();

        if (valA < valB) return currentSort.ascending ? -1 : 1;
        if (valA > valB) return currentSort.ascending ? 1 : -1;
        return 0;
    });
}

/**
 * Filter handler
 */
function handleFilterChange() {
    const text = nameFilter.value.trim().toLowerCase();
    const winnerSetting = winnerFilter.value;

    filteredBooks = books.filter(book => {
        const matchesText = !text || (
            (book.title && book.title.toLowerCase().includes(text)) ||
            (book.author && book.author.toLowerCase().includes(text))
        );

        const matchesWinner =
            winnerSetting === "all" ||
            (winnerSetting === "winner" && book.award.is_winner) ||
            (winnerSetting === "nominee" && !book.award.is_winner);

        return matchesText && matchesWinner;
    });

    // Apply current sort after filtering
    sortFilteredBooks();
    displayBooks();
}

function clearAllFilters() {
    nameFilter.value = "";
    winnerFilter.value = "all";
    filteredBooks = [...books];
    sortFilteredBooks();
    displayBooks();
}

/**
 * UI helpers
 */
function showLoading(show) {
    loadingElement.classList.toggle("hidden", !show);
    if (show) {
        // hide error while loading
        errorElement.classList.add("hidden");
    }
}

function showError(show, message) {
    if (show) {
        errorElement.classList.remove("hidden");
        // Optionally display a more helpful message inside the error element
        const p = errorElement.querySelector("p");
        if (p) p.textContent = message || "Error loading data. Please try again.";
    } else {
        errorElement.classList.add("hidden");
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