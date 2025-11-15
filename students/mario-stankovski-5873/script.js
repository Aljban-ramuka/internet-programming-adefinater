// Configuration
const CONFIG = {
  // Alternative 1: Single URL (currently used)
  DATA_URL:
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json",

  // Alternative 2: Multiple URLs for +5 bonus points
  MULTI_DATA_URLS: [
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json",
  ],

  USE_MULTI_LOAD: true, // Set to true for +5 bonus points!

  DATE_FORMATS: {
    ISO: "YYYY-MM-DD",
    UK: "DD/MM/YYYY",
    LONG: "MMMM DD, YYYY",
    YEAR: "YYYY",
  },
  ERA_ORDER: ["Classic", "Modern", "Recent"],
};

// State Management
let state = {
  episodes: [], // Original data
  filtered: [], // Filtered results
  loading: true, // Loading state
  error: null, // Error message
  sort: {
    field: "rank", // Current sort field
    ascending: true, // Sort direction
  },
  filters: {
    name: "", // Search text
    era: "", // Selected era
    doctor: "", // Selected doctor
    companion: "", // Selected companion
  },
};

// Performance optimization - debounce filter
let filterTimeout;

// Initialize Application
async function init() {
  setupEventListeners();
  await loadEpisodes();
}

// Event Listeners Setup
function setupEventListeners() {
  // Name filter input with debouncing for performance
  const nameFilter = document.getElementById("name-filter");
  nameFilter.addEventListener("input", (e) => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      state.filters.name = e.target.value.toLowerCase();
      filterEpisodes();
    }, 150); // 150ms debounce
  });

  // Table header clicks for sorting
  const headers = document.querySelectorAll("th[data-sort]");
  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const field = header.getAttribute("data-sort");
      sortEpisodes(field);
    });
  });

  // Enhanced filter dropdowns
  setupEnhancedFilters();

  // Export and clear buttons
  document.getElementById("export-csv").addEventListener("click", exportToCSV);
  document
    .getElementById("clear-filters")
    .addEventListener("click", clearAllFilters);

  // Floating action button
  setupFloatingActionButton();

  // Keyboard navigation
  document.addEventListener("keydown", handleKeyNavigation);
}

// Data Loading with Alternative 2 (Multiple URLs) for +5 bonus points
async function loadEpisodes() {
  try {
    showLoading(true);
    showError(""); // Clear any previous errors

    let data;

    if (CONFIG.USE_MULTI_LOAD) {
      // Alternative 2: Load from multiple URLs (+5 bonus points)
      console.log(
        "🚀 Using Alternative 2: Loading from multiple URLs for +5 bonus points"
      );
      data = await loadFromMultipleUrls();
    } else {
      // Alternative 1: Single URL
      console.log("Fetching data from single URL:", CONFIG.DATA_URL);
      const response = await fetch(CONFIG.DATA_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      data = await response.json();
    }

    console.log("Received data type:", typeof data);
    console.log("Data sample:", data);

    // Handle different data formats - the API might return an object with episodes array
    let episodes;
    if (Array.isArray(data)) {
      episodes = data;
      console.log("Data is array with length:", data.length);
    } else if (data && Array.isArray(data.episodes)) {
      episodes = data.episodes;
      console.log("Found episodes array with length:", data.episodes.length);
    } else if (data && typeof data === "object") {
      // Try to find the episodes array in the response
      console.log("Data keys:", Object.keys(data));
      const possibleArrays = Object.values(data).filter((val) =>
        Array.isArray(val)
      );
      if (possibleArrays.length > 0) {
        episodes = possibleArrays[0];
        console.log("Found array in object with length:", episodes.length);
      } else {
        throw new Error("No episodes array found in data");
      }
    } else {
      throw new Error(
        "Invalid data format: expected array or object with episodes"
      );
    }

    if (!episodes || episodes.length === 0) {
      throw new Error("No episodes found in the data");
    }

    console.log("Processing", episodes.length, "episodes");

    state.episodes = episodes.map((episode) => processEpisode(episode));

    // Validate data and log warnings
    validateData(state.episodes);

    state.filtered = [...state.episodes];

    // Populate filter dropdowns with loaded data
    populateFilters();

    // Update hero statistics
    updateHeroStats();

    // Initial sort by rank
    sortEpisodes("rank");
  } catch (error) {
    console.error("Failed to load episodes:", error);
    showError("Failed to load episodes: " + error.message);
    state.episodes = [];
    state.filtered = [];
  } finally {
    showLoading(false);
  }
}

// Display Functions
function displayEpisodes(episodes) {
  const tbody = document.getElementById("episodes-body");
  const table = document.getElementById("episodes-table");
  const noResults = document.getElementById("no-results");
  const stats = document.getElementById("episode-stats");

  // Clear existing content
  tbody.innerHTML = "";

  // Update stats
  updateStats(episodes.length, state.episodes.length);

  if (episodes.length === 0) {
    table.style.display = "none";
    noResults.style.display = "block";
    return;
  }

  table.style.display = "table";
  noResults.style.display = "none";

  // Reset focused row index when displaying new data
  focusedRowIndex = -1;

  // Add fade-in animation
  table.style.opacity = "0";
  setTimeout(() => {
    table.style.opacity = "1";
  }, 50);

  episodes.forEach((episode, index) => {
    const row = document.createElement("tr");

    // Add staggered animation delay for smooth loading effect
    row.style.animationDelay = `${index * 0.03}s`;

    // Create cells for each column with proper error handling and data attributes
    row.innerHTML = `
            <td>${episode.rank || "N/A"}</td>
            <td>${escapeHtml(episode.title) || "Unknown Title"}</td>
            <td>${episode.series || "N/A"}</td>
            <td data-era="${episode.era || "Unknown"}">${
      episode.era || "Unknown"
    }</td>
            <td>${episode.broadcast_year || "Unknown"}</td>
            <td>${escapeHtml(episode.director) || "Unknown"}</td>
            <td>${escapeHtml(formatWriter(episode.writer))}</td>
            <td>${escapeHtml(formatDoctor(episode.doctor))}</td>
            <td>${escapeHtml(formatCompanion(episode.companion))}</td>
            <td><span class="cast-count">${episode.cast_count}</span></td>
        `;

    tbody.appendChild(row);
  });
}

function updateStats(showing, total) {
  const stats = document.getElementById("episode-stats");
  if (stats) {
    if (showing === total) {
      stats.innerHTML = `📺 Showing <strong>${total}</strong> episodes`;
    } else {
      stats.innerHTML = `🔍 Showing <strong>${showing}</strong> of <strong>${total}</strong> episodes`;
    }

    // Add animation
    stats.style.opacity = "0";
    setTimeout(() => {
      stats.style.opacity = "1";
    }, 50);
  }
}

// Sorting Functions
function sortEpisodes(field) {
  // Toggle direction if same field, otherwise set ascending
  if (state.sort.field === field) {
    state.sort.ascending = !state.sort.ascending;
  } else {
    state.sort.field = field;
    state.sort.ascending = true;
  }

  // Update visual indicators
  updateSortIndicators(field, state.sort.ascending);

  // Sort the filtered episodes
  state.filtered.sort((a, b) => {
    let aVal = getSortValue(a, field);
    let bVal = getSortValue(b, field);

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) aVal = "";
    if (bVal === null || bVal === undefined) bVal = "";

    // Convert to string for comparison if needed
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    let result = 0;
    if (aVal < bVal) result = -1;
    else if (aVal > bVal) result = 1;

    return state.sort.ascending ? result : -result;
  });

  displayEpisodes(state.filtered);
}

// Enhanced Filtering Functions
function filterEpisodes() {
  const { name, era, doctor, companion } = state.filters;

  state.filtered = state.episodes.filter((episode) => {
    // Name filter (search in multiple fields)
    let nameMatch = true;
    if (name) {
      const searchText = [
        episode.title,
        episode.director,
        episode.writer,
        formatDoctor(episode.doctor),
        formatCompanion(episode.companion),
        episode.era,
      ]
        .join(" ")
        .toLowerCase();

      nameMatch = searchText.includes(name);
    }

    // Era filter
    let eraMatch = true;
    if (era) {
      eraMatch = episode.era === era;
    }

    // Doctor filter
    let doctorMatch = true;
    if (doctor) {
      doctorMatch = formatDoctor(episode.doctor) === doctor;
    }

    // Companion filter
    let companionMatch = true;
    if (companion) {
      companionMatch = formatCompanion(episode.companion) === companion;
    }

    return nameMatch && eraMatch && doctorMatch && companionMatch;
  });

  // Re-apply current sort
  sortEpisodes(state.sort.field);
}

// Utility Functions
function formatDate(dateStr) {
  if (!dateStr) return "Unknown";

  // Handle different date formats and extract year
  try {
    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.split("-")[0];
    }

    // UK format: DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr.split("/")[2];
    }

    // Long format: Month DD, YYYY
    if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(dateStr)) {
      return dateStr.split(", ")[1];
    }

    // Year only: YYYY
    if (/^\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // Fallback: try to extract 4-digit year
    const yearMatch = dateStr.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : "Unknown";
  } catch (e) {
    return "Unknown";
  }
}

function processEpisode(episode) {
  return {
    ...episode,
    broadcast_year: formatDate(episode.broadcast_date),
    cast_count: Array.isArray(episode.cast) ? episode.cast.length : 0,
  };
}

function formatDoctor(doctor) {
  if (!doctor || !doctor.actor) return "Unknown";
  const actor = doctor.actor || "Unknown Actor";
  const incarnation = doctor.incarnation || "Unknown";
  return `${actor} (${incarnation})`;
}

function formatCompanion(companion) {
  if (!companion || companion === null) return "None";
  if (!companion.actor) return "Unknown";

  const actor = companion.actor || "Unknown Actor";
  const character = companion.character || "Unknown Character";
  return `${actor} (${character})`;
}

function formatWriter(writer) {
  if (!writer) return "Unknown";

  // Handle multiple writers - replace & and "and" with commas for better display
  return writer.replace(/\s+&\s+/g, ", ").replace(/\s+and\s+/g, ", ");
}

function escapeHtml(text) {
  if (typeof text !== "string") return text;
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getSortValue(episode, field) {
  switch (field) {
    case "rank":
      return Number(episode.rank) || 0;
    case "series":
      return Number(episode.series) || 0;
    case "broadcast_date":
      return parseDateForSort(episode.broadcast_date);
    case "doctor":
      return formatDoctor(episode.doctor);
    case "companion":
      return formatCompanion(episode.companion);
    case "cast":
      return episode.cast_count;
    default:
      return episode[field] || "";
  }
}

function parseDateForSort(dateStr) {
  if (!dateStr) return new Date(0);

  try {
    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // UK format: DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split("/");
      return new Date(year, month - 1, day);
    }

    // Long format: Month DD, YYYY
    if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // Year only: YYYY
    if (/^\d{4}$/.test(dateStr)) {
      return new Date(dateStr, 0, 1);
    }

    // Fallback
    return new Date(dateStr);
  } catch (e) {
    return new Date(0);
  }
}

function updateSortIndicators(field, ascending) {
  // Clear all existing sort indicators
  document.querySelectorAll("th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  // Add indicator to current sort column
  const currentHeader = document.querySelector(`th[data-sort="${field}"]`);
  if (currentHeader) {
    currentHeader.classList.add(ascending ? "sort-asc" : "sort-desc");
  }
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
  document.getElementById("episodes-table").style.display = show
    ? "none"
    : "block";
  document.getElementById("no-results").style.display = "none";
}

function showError(message) {
  const errorElement = document.getElementById("error");
  if (message) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  } else {
    errorElement.style.display = "none";
  }
}

// Data Validation Functions
function validateData(episodes) {
  let warningCount = 0;
  const currentYear = new Date().getFullYear();

  episodes.forEach((episode, index) => {
    // Check for missing required fields
    if (!episode.title) {
      console.warn(`Episode ${index + 1}: Missing title`);
      warningCount++;
    }

    if (!episode.rank) {
      console.warn(`Episode ${index + 1}: Missing rank`);
      warningCount++;
    }

    // Check for invalid ranks
    if (episode.rank <= 0) {
      console.warn(`Episode ${index + 1}: Invalid rank (${episode.rank})`);
      warningCount++;
    }

    // Check for negative series numbers
    if (episode.series < 0) {
      console.warn(
        `Episode ${index + 1}: Negative series number (${episode.series})`
      );
      warningCount++;
    }

    // Check for future broadcast dates
    const broadcastYear = parseInt(episode.broadcast_year);
    if (broadcastYear > currentYear) {
      console.warn(
        `Episode ${index + 1}: Future broadcast date (${
          episode.broadcast_year
        })`
      );
      warningCount++;
    }
  });

  // Check for duplicate ranks
  const ranks = episodes.map((e) => e.rank).filter((r) => r);
  const uniqueRanks = new Set(ranks);
  if (ranks.length !== uniqueRanks.size) {
    console.warn("Duplicate ranks found in data");
    warningCount++;
  }

  if (warningCount > 0) {
    console.warn(`Data validation complete: ${warningCount} warnings found`);
  }

  return warningCount;
}

// Alternative 2: Load from multiple URLs for +5 bonus points
async function loadFromMultipleUrls() {
  console.log(
    "📦 Loading episodes from",
    CONFIG.MULTI_DATA_URLS.length,
    "different endpoints..."
  );

  const promises = CONFIG.MULTI_DATA_URLS.map(async (url, index) => {
    try {
      console.log(
        `🔄 Fetching batch ${index + 1}/${
          CONFIG.MULTI_DATA_URLS.length
        }: ${url}`
      );
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} for URL ${index + 1}`
        );
      }

      const batchData = await response.json();
      console.log(
        `✅ Batch ${index + 1} loaded:`,
        Array.isArray(batchData) ? batchData.length : "object",
        "episodes"
      );
      return Array.isArray(batchData) ? batchData : batchData.episodes || [];
    } catch (error) {
      console.error(`❌ Failed to load batch ${index + 1}:`, error);
      return []; // Return empty array for failed batches
    }
  });

  // Wait for all requests to complete
  const batches = await Promise.all(promises);

  // Combine all episodes from different batches
  const allEpisodes = batches.flat();

  console.log(
    "🎉 Multi-URL loading complete! Total episodes loaded:",
    allEpisodes.length
  );
  console.log(
    "📊 Episodes per batch:",
    batches.map((batch) => batch.length)
  );

  return allEpisodes;
}

// Enhanced Filters Setup (+5 bonus points)
function setupEnhancedFilters() {
  // Era filter
  const eraFilter = document.getElementById("era-filter");
  eraFilter.addEventListener("change", (e) => {
    state.filters.era = e.target.value;
    filterEpisodes();
  });

  // Doctor filter
  const doctorFilter = document.getElementById("doctor-filter");
  doctorFilter.addEventListener("change", (e) => {
    state.filters.doctor = e.target.value;
    filterEpisodes();
  });

  // Companion filter
  const companionFilter = document.getElementById("companion-filter");
  companionFilter.addEventListener("change", (e) => {
    state.filters.companion = e.target.value;
    filterEpisodes();
  });
}

// Populate filter dropdowns with data
function populateFilters() {
  if (state.episodes.length === 0) return;

  // Get unique values
  const eras = [
    ...new Set(state.episodes.map((ep) => ep.era).filter(Boolean)),
  ].sort();
  const doctors = [
    ...new Set(
      state.episodes.map((ep) => formatDoctor(ep.doctor)).filter(Boolean)
    ),
  ].sort();
  const companions = [
    ...new Set(
      state.episodes
        .map((ep) => formatCompanion(ep.companion))
        .filter((c) => c !== "None")
    ),
  ].sort();

  // Populate Era dropdown
  const eraSelect = document.getElementById("era-filter");
  eraSelect.innerHTML = '<option value="">All Eras</option>';
  eras.forEach((era) => {
    eraSelect.innerHTML += `<option value="${era}">${era}</option>`;
  });

  // Populate Doctor dropdown
  const doctorSelect = document.getElementById("doctor-filter");
  doctorSelect.innerHTML = '<option value="">All Doctors</option>';
  doctors.forEach((doctor) => {
    doctorSelect.innerHTML += `<option value="${escapeHtml(
      doctor
    )}">${escapeHtml(doctor)}</option>`;
  });

  // Populate Companion dropdown
  const companionSelect = document.getElementById("companion-filter");
  companionSelect.innerHTML = '<option value="">All Companions</option>';
  companions.forEach((companion) => {
    companionSelect.innerHTML += `<option value="${escapeHtml(
      companion
    )}">${escapeHtml(companion)}</option>`;
  });

  console.log("🎛️ Filters populated:", {
    eras: eras.length,
    doctors: doctors.length,
    companions: companions.length,
  });
}

// Clear all filters
function clearAllFilters() {
  document.getElementById("name-filter").value = "";
  document.getElementById("era-filter").value = "";
  document.getElementById("doctor-filter").value = "";
  document.getElementById("companion-filter").value = "";

  state.filters = { name: "", era: "", doctor: "", companion: "" };
  filterEpisodes();

  // Visual feedback
  const btn = document.getElementById("clear-filters");
  const originalText = btn.innerHTML;
  btn.innerHTML = "✅ Cleared!";
  setTimeout(() => {
    btn.innerHTML = originalText;
  }, 1000);
}

// CSV Export functionality (+5 bonus points)
function exportToCSV() {
  try {
    const episodes =
      state.filtered.length > 0 ? state.filtered : state.episodes;

    if (episodes.length === 0) {
      alert("No episodes to export!");
      return;
    }

    // CSV headers
    const headers = [
      "Rank",
      "Title",
      "Series",
      "Era",
      "Year",
      "Director",
      "Writer",
      "Doctor",
      "Companion",
      "Cast Count",
    ];

    // Convert episodes to CSV rows
    const rows = episodes.map((episode) => [
      episode.rank || "N/A",
      `"${(episode.title || "Unknown").replace(/"/g, '""')}"`, // Escape quotes
      episode.series || "N/A",
      episode.era || "Unknown",
      episode.broadcast_year || "Unknown",
      `"${(episode.director || "Unknown").replace(/"/g, '""')}"`,
      `"${formatWriter(episode.writer).replace(/"/g, '""')}"`,
      `"${formatDoctor(episode.doctor).replace(/"/g, '""')}"`,
      `"${formatCompanion(episode.companion).replace(/"/g, '""')}"`,
      episode.cast_count,
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `doctor-who-episodes-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Visual feedback
    const btn = document.getElementById("export-csv");
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ Exported!";
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);

    console.log("📊 CSV exported:", episodes.length, "episodes");
  } catch (error) {
    console.error("❌ Export failed:", error);
    alert("Export failed: " + error.message);
  }
}

// Update hero statistics
function updateHeroStats() {
  const totalEpisodes = state.episodes.length;
  const uniqueDoctors = [
    ...new Set(state.episodes.map((ep) => formatDoctor(ep.doctor))),
  ].length;

  // Animate the numbers
  animateCounter("total-episodes", totalEpisodes, 2000);
  animateCounter("total-doctors", uniqueDoctors, 1500);
}

// Animate counter numbers
function animateCounter(elementId, targetValue, duration) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const startValue = 0;
  const startTime = performance.now();

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for smooth animation
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.floor(
      startValue + (targetValue - startValue) * easeOutQuart
    );

    element.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = targetValue.toLocaleString();
    }
  }

  requestAnimationFrame(updateCounter);
}

// Floating Action Button
function setupFloatingActionButton() {
  const fab = document.getElementById("scroll-to-top");

  // Show/hide based on scroll position
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      fab.classList.add("visible");
    } else {
      fab.classList.remove("visible");
    }
  });

  // Scroll to top on click
  fab.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// Keyboard Navigation
let focusedRowIndex = -1;

function handleKeyNavigation(e) {
  const table = document.getElementById("episodes-table");
  const rows = table.querySelectorAll("tbody tr");

  if (rows.length === 0) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      focusedRowIndex = Math.min(focusedRowIndex + 1, rows.length - 1);
      updateRowFocus(rows);
      break;

    case "ArrowUp":
      e.preventDefault();
      focusedRowIndex = Math.max(focusedRowIndex - 1, 0);
      updateRowFocus(rows);
      break;

    case "Enter":
      e.preventDefault();
      if (focusedRowIndex >= 0) {
        // Sort by rank when Enter is pressed
        sortEpisodes("rank");
      }
      break;

    case "Home":
      e.preventDefault();
      focusedRowIndex = 0;
      updateRowFocus(rows);
      break;

    case "End":
      e.preventDefault();
      focusedRowIndex = rows.length - 1;
      updateRowFocus(rows);
      break;
  }
}

function updateRowFocus(rows) {
  // Clear previous focus
  rows.forEach((row) => row.classList.remove("focused"));

  // Add focus to current row
  if (focusedRowIndex >= 0 && focusedRowIndex < rows.length) {
    const focusedRow = rows[focusedRowIndex];
    focusedRow.classList.add("focused");
    focusedRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Keyboard Navigation (Advanced Feature)
function handleKeyNavigation(event) {
  // Only handle keyboard navigation when not typing in inputs
  if (event.target.tagName === "INPUT") return;

  const table = document.getElementById("episodes-table");
  const rows = table.querySelectorAll("tbody tr");

  if (rows.length === 0) return;

  let currentRow = table.querySelector("tr.focused");
  let currentIndex = currentRow ? Array.from(rows).indexOf(currentRow) : -1;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      currentIndex = Math.min(currentIndex + 1, rows.length - 1);
      focusRow(rows[currentIndex]);
      break;

    case "ArrowUp":
      event.preventDefault();
      currentIndex = Math.max(currentIndex - 1, 0);
      focusRow(rows[currentIndex]);
      break;

    case "Enter":
      if (currentRow) {
        // Sort by the first column (rank) when Enter is pressed
        sortEpisodes("rank");
      }
      break;
  }
}

function focusRow(row) {
  // Remove previous focus
  const previouslyFocused = document.querySelector("tr.focused");
  if (previouslyFocused) {
    previouslyFocused.classList.remove("focused");
  }

  // Add focus to new row
  row.classList.add("focused");
  row.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("DOMContentLoaded", init);
