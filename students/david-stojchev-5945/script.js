

const CONFIG = {
  DATA_URLS: [
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json"
  ],
  FILTER_DEBOUNCE_MS: 250,
};

// ---------------------- STATE ----------------------
let state = {
  episodes: [],
  filtered: [],
  sortLevels: [], // [{field, ascending}]
  filters: { name: "", era: "", doctor: "" },
  collapsedDecades: new Set()
};

// ---------------------- DOM REFS ----------------------
const refs = {
  table: null,
  tbody: null,
  loading: null,
  error: null,
  noResults: null,
  nameFilter: null,
  eraFilter: null,
  doctorFilter: null,
  exportBtn: null,
};

// ---------------------- INIT ----------------------
document.addEventListener("DOMContentLoaded", async () => {
  refs.table = document.getElementById("episodes-table");
  refs.tbody = document.getElementById("episodes-body");
  refs.loading = document.getElementById("loading");
  refs.error = document.getElementById("error");
  refs.noResults = document.getElementById("no-results");
  refs.nameFilter = document.getElementById("name-filter");

  // Inject extra filters + export button
  injectExtraFilters();

  await loadEpisodes();
  setupEventListeners();
});

// ---------------------- UI HELPERS ----------------------
function showLoading(show) {
  refs.loading.style.display = show ? "block" : "none";
}

function showError(msg) {
  refs.error.textContent = msg || "";
  refs.error.style.display = msg ? "block" : "none";
}

// ---------------------- DATA LOADING ----------------------
async function loadEpisodes() {
  showLoading(true);
  showError(null);

  try {
    const all = [];
    for (const url of CONFIG.DATA_URLS) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      if (Array.isArray(data)) all.push(...data);
    }

    state.episodes = all.map(normalizeEpisode);
    populateFilters();
    state.filtered = [...state.episodes];
    renderTable();

  } catch (err) {
    showError("Failed to load episodes: " + err.message);
  } finally {
    showLoading(false);
  }
}

// Normalize structure
function normalizeEpisode(ep) {
  const date = parseDate(ep.broadcast_date);
  const year = date ? date.getFullYear() : null;
  const decade = year ? Math.floor(year / 10) * 10 : "Unknown";

  return {
    rank: ep.rank ?? null,
    title: ep.title ?? "—",
    series: ep.series ?? null,
    era: ep.era ?? "—",
    broadcast_date: ep.broadcast_date ?? "—",
    _year: year,
    _decade: decade,
    director: ep.director ?? "—",
    writer: Array.isArray(ep.writer) ? ep.writer.join(", ") : (ep.writer ?? "—"),
    doctor: formatDoctor(ep.doctor),
    companion: formatCompanion(ep.companion),
    cast: Array.isArray(ep.cast) ? ep.cast : [],
  };
}

// ---------------------- FILTERS ----------------------
function injectExtraFilters() {
  const filtersDiv = document.querySelector(".filters");

  // Era
  const eraLabel = document.createElement("label");
  eraLabel.textContent = "Era:";
  const eraSelect = document.createElement("select");
  eraSelect.id = "era-filter";
  eraSelect.innerHTML = `<option value="">All</option>`;
  eraLabel.appendChild(eraSelect);
  filtersDiv.appendChild(eraLabel);

  // Doctor
  const docLabel = document.createElement("label");
  docLabel.textContent = "Doctor:";
  const docSelect = document.createElement("select");
  docSelect.id = "doctor-filter";
  docSelect.innerHTML = `<option value="">All</option>`;
  docLabel.appendChild(docSelect);
  filtersDiv.appendChild(docLabel);

  // Export
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export CSV";
  exportBtn.id = "export-csv";
  filtersDiv.appendChild(exportBtn);

  refs.eraFilter = eraSelect;
  refs.doctorFilter = docSelect;
  refs.exportBtn = exportBtn;
}

function populateFilters() {
  const eras = [...new Set(state.episodes.map(e => e.era).filter(Boolean))];
  const doctors = [...new Set(state.episodes.map(e => e.doctor).filter(Boolean))];

  refs.eraFilter.innerHTML = `<option value="">All</option>` + eras.map(e => `<option>${e}</option>`).join("");
  refs.doctorFilter.innerHTML = `<option value="">All</option>` + doctors.map(d => `<option>${d}</option>`).join("");
}

function applyFilters() {
  const nameQ = refs.nameFilter.value.trim().toLowerCase();
  const eraQ = refs.eraFilter.value;
  const docQ = refs.doctorFilter.value;

  state.filtered = state.episodes.filter(ep => {
    const nameMatch = ep.title.toLowerCase().includes(nameQ);
    const eraMatch = !eraQ || ep.era === eraQ;
    const docMatch = !docQ || ep.doctor === docQ;
    return nameMatch && eraMatch && docMatch;
  });

  applySort();
  renderTable();
}

// ---------------------- SORTING ----------------------
function setupEventListeners() {
  // Debounce name filter
  refs.nameFilter.addEventListener("input", debounce(applyFilters, CONFIG.FILTER_DEBOUNCE_MS));
  refs.eraFilter.addEventListener("change", applyFilters);
  refs.doctorFilter.addEventListener("change", applyFilters);
  refs.exportBtn.addEventListener("click", exportCSV);

  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", e => handleSortClick(th, e.shiftKey));
  });
}

function handleSortClick(th, isMulti) {
  const field = th.dataset.sort;
  let existing = state.sortLevels.find(s => s.field === field);

  if (!isMulti) {
    // reset sort levels if no shift
    if (existing) existing.ascending = !existing.ascending;
    else state.sortLevels = [{ field, ascending: true }];
  } else {
    if (existing) existing.ascending = !existing.ascending;
    else state.sortLevels.push({ field, ascending: true });
  }

  applySort();
  renderTable();
}

function applySort() {
  if (!state.sortLevels.length) return;

  const comparators = state.sortLevels.map(({ field, ascending }) => {
    const dir = ascending ? 1 : -1;
    return (a, b) => {
      let va = a[field], vb = b[field];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    };
  });

  state.filtered.sort((a, b) => {
    for (const cmp of comparators) {
      const res = cmp(a, b);
      if (res !== 0) return res;
    }
    return 0;
  });
}

// ---------------------- RENDERING ----------------------
function renderTable() {
  refs.tbody.innerHTML = "";

  if (!state.filtered.length) {
    refs.table.style.display = "none";
    refs.noResults.style.display = "block";
    return;
  }

  refs.table.style.display = "table";
  refs.noResults.style.display = "none";

  // Group by decade
  const grouped = {};
  for (const ep of state.filtered) {
    const decade = ep._decade || "Unknown";
    if (!grouped[decade]) grouped[decade] = [];
    grouped[decade].push(ep);
  }

  const frag = document.createDocumentFragment();

  for (const [decade, eps] of Object.entries(grouped)) {
    const trDecade = document.createElement("tr");
    trDecade.className = "decade-row";
    if (state.collapsedDecades.has(decade)) trDecade.classList.add("collapsed");
    const tdDecade = document.createElement("td");
    tdDecade.colSpan = 10;
    tdDecade.textContent = `${decade}s (${eps.length} episodes)`;
    trDecade.appendChild(tdDecade);
    trDecade.addEventListener("click", () => toggleDecade(decade));
    frag.appendChild(trDecade);

    if (!state.collapsedDecades.has(decade)) {
      eps.forEach(ep => frag.appendChild(renderEpisodeRow(ep)));
    }
  }

  refs.tbody.appendChild(frag);
}

function renderEpisodeRow(ep) {
  const tr = document.createElement("tr");
  const fields = ["rank", "title", "series", "era", "_year", "director", "writer", "doctor", "companion"];
  fields.forEach(f => {
    const td = document.createElement("td");
    td.textContent = ep[f] ?? "—";
    tr.appendChild(td);
  });
  const tdCast = document.createElement("td");
  tdCast.innerHTML = `<span class="cast-count">${ep.cast.length}</span>`;
  tr.appendChild(tdCast);
  return tr;
}

function toggleDecade(decade) {
  if (state.collapsedDecades.has(decade)) state.collapsedDecades.delete(decade);
  else state.collapsedDecades.add(decade);
  renderTable();
}

// ---------------------- EXPORT CSV ----------------------
function exportCSV() {
  if (!state.filtered.length) return alert("No data to export!");
  const headers = ["Rank", "Title", "Series", "Era", "Year", "Director", "Writer", "Doctor", "Companion", "Cast Count"];
  const rows = state.filtered.map(ep => [
    ep.rank,
    ep.title,
    ep.series,
    ep.era,
    ep._year,
    ep.director,
    ep.writer,
    ep.doctor,
    ep.companion,
    ep.cast.length
  ]);

  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "doctor_who_episodes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------- HELPERS ----------------------
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function formatDoctor(doctor) {
  if (!doctor) return "—";
  if (Array.isArray(doctor)) return doctor.map(formatDoctor).join(", ");
  if (typeof doctor === "object")
    return `${doctor.actor || doctor.name || "Unknown"}${doctor.incarnation ? ` (${doctor.incarnation})` : ""}`;
  return String(doctor);
}

function formatCompanion(companion) {
  if (!companion) return "—";
  if (Array.isArray(companion)) return companion.map(formatCompanion).join(", ");
  if (typeof companion === "object")
    return `${companion.actor || "Unknown"}${companion.character ? ` (${companion.character})` : ""}`;
  return String(companion);
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
