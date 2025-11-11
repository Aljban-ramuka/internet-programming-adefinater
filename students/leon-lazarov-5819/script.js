const urls = [
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json"
];

const tableBody = document.querySelector("#episodesTable tbody");
const searchInput = document.getElementById("searchInput");
const eraFilter = document.getElementById("eraFilter");
const doctorFilter = document.getElementById("doctorFilter");
const errorDiv = document.getElementById("error");
const loadingDiv = document.getElementById("loading");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageIndicator = document.getElementById("pageIndicator");
const exportBtn = document.getElementById("exportCSV");

let episodes = [];
let filteredEpisodes = [];
let currentPage = 1;
const pageSize = 10;
let warnings = [];
let sortColumn = null;
let sortAsc = true;

// --- Fetch all episode data ---
async function loadEpisodes() {
  loadingDiv.style.display = "block";
  errorDiv.style.display = "none";
  warnings = [];
  episodes = [];

  try {
    for (let url of urls) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const data = await res.json();
      if (data.episodes && Array.isArray(data.episodes)) {
        episodes.push(...data.episodes);
      }
    }

    validateData(episodes);
    populateDoctorFilter(episodes);
    applyFilters();
  } catch (err) {
    errorDiv.style.display = "block";
    errorDiv.textContent = "Failed to load data: " + err.message;
    console.error("Failed to load data:", err);
  } finally {
    loadingDiv.style.display = "none";
  }
}

// --- Validate data ---
function validateData(episodes) {
  episodes.forEach(ep => {
    if (!ep.title) {
      warnings.push(`Missing title (Rank ${ep.rank})`);
      ep.title = "Untitled";
      ep._missingTitle = true;
    }
    if (!ep.series) ep.series = "—";
    if (ep.rank < 0) ep._negativeRank = true;
    if (!ep.companion) ep.companion = { actor: "—", character: "—" };
    if (!ep.cast || ep.cast.length === 0) ep._emptyCast = true;
    if (ep.writer && (ep.writer.includes("&") || ep.writer.includes(",") || ep.writer.includes(" and "))) {
      ep._multipleWriters = true;
    }
  });

  if (warnings.length > 0) {
    console.warn("Validation warnings:", warnings);
    errorDiv.style.display = "block";
    errorDiv.textContent = `Validation warnings: ${warnings.join(", ")}`;
  }
}

// --- Populate doctor filter ---
function populateDoctorFilter(episodes) {
  const doctors = [...new Set(episodes.map(ep => ep.doctor?.actor).filter(Boolean))];
  doctors.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc;
    opt.textContent = doc;
    doctorFilter.appendChild(opt);
  });
}

// --- Apply search and filters ---
function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const era = eraFilter.value;
  const doctor = doctorFilter.value;

  filteredEpisodes = episodes.filter(ep => {
    let matches = true;
    if (search) {
      matches = ep.title.toLowerCase().includes(search) || ep.writer.toLowerCase().includes(search);
    }
    if (matches && era) matches = ep.era === era;
    if (matches && doctor) matches = ep.doctor.actor === doctor;
    return matches;
  });

  currentPage = 1;
  renderTable();
}

// --- Render table ---
function renderTable() {
  tableBody.innerHTML = "";

  // Sort if column selected
  if (sortColumn) {
    filteredEpisodes.sort((a, b) => {
      let valA, valB;
      if (sortColumn === "year") {
        valA = parseInt(extractYear(a.broadcast_date)) || 0;
        valB = parseInt(extractYear(b.broadcast_date)) || 0;
      } else if (sortColumn === "doctor") {
        valA = a.doctor.actor.toLowerCase();
        valB = b.doctor.actor.toLowerCase();
      } else {
        valA = a[sortColumn] ? a[sortColumn].toString().toLowerCase() : "";
        valB = b[sortColumn] ? b[sortColumn].toString().toLowerCase() : "";
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredEpisodes.slice(start, end);

  pageItems.forEach(ep => {
    const tr = document.createElement("tr");
    tr.setAttribute("tabindex", "0"); // for arrow keys

    tr.innerHTML = `
      <td ${ep._negativeRank ? 'style="color:red;"' : ""}>${ep.rank}</td>
      <td ${ep._missingTitle ? 'style="color:red;"' : ""}>${ep.title}</td>
      <td>${ep.series}</td>
      <td>${ep.era}</td>
      <td>${extractYear(ep.broadcast_date)}</td>
      <td>${ep.director || "—"}</td>
      <td ${ep._multipleWriters ? 'style="color:orange;"' : ""}>${ep.writer || "—"}</td>
      <td>${ep.doctor.actor} (${ep.doctor.incarnation})</td>
      <td>${ep.companion.actor} (${ep.companion.character})</td>
      <td ${ep._emptyCast ? 'style="color:gray;"' : ""}>${ep.cast ? ep.cast.length : 0}</td>
    `;
    tableBody.appendChild(tr);
  });

  pageIndicator.textContent = `Page ${currentPage} / ${Math.ceil(filteredEpisodes.length / pageSize) || 1}`;
}

// --- Extract year ---
function extractYear(date) {
  if (!date) return "—";
  const match = date.match(/\d{4}/);
  return match ? match[0] : "—";
}

// --- Pagination ---
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < Math.ceil(filteredEpisodes.length / pageSize)) {
    currentPage++;
    renderTable();
  }
});

// --- Filters ---
searchInput.addEventListener("input", applyFilters);
eraFilter.addEventListener("change", applyFilters);
doctorFilter.addEventListener("change", applyFilters);

// --- Keyboard navigation ---
document.addEventListener("keydown", (e) => {
  const rows = Array.from(tableBody.querySelectorAll("tr"));
  if (rows.length === 0) return;

  let index = rows.findIndex(r => r.classList.contains("focused"));

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (index >= 0) rows[index].classList.remove("focused");
    index = index < rows.length - 1 ? index + 1 : 0;
    rows[index].classList.add("focused");
    rows[index].focus();
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (index >= 0) rows[index].classList.remove("focused");
    index = index > 0 ? index - 1 : rows.length - 1;
    rows[index].classList.add("focused");
    rows[index].focus();
  }
});

// --- Column sorting ---
document.querySelectorAll("#episodesTable th").forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.column;
    if (sortColumn === col) {
      sortAsc = !sortAsc;
    } else {
      sortColumn = col;
      sortAsc = true;
    }
    renderTable();
  });
});

// --- Export CSV ---
exportBtn.addEventListener("click", () => {
  if (filteredEpisodes.length === 0) return;

  const headers = ["Rank","Title","Series","Era","Year","Director","Writer","Doctor","Companion","Cast"];
  const rows = filteredEpisodes.map(ep => [
    ep.rank, ep.title, ep.series, ep.era, extractYear(ep.broadcast_date),
    ep.director || "—", ep.writer || "—",
    `${ep.doctor.actor} (${ep.doctor.incarnation})`,
    `${ep.companion.actor} (${ep.companion.character})`,
    ep.cast ? ep.cast.length : 0
  ]);

  const csvContent = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "doctor_who_episodes.csv";
  link.click();
  URL.revokeObjectURL(url);
});

// --- Initialize ---
loadEpisodes();
