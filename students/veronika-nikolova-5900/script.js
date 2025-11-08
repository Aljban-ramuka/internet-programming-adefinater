/* Doctor Who Episodes Explorer
 * Vanilla JS (ES6+). Meets exam spec with extras.
 * Performance: debounced filtering + client-side pagination (default 50).
 * Notes: For 1000+ rows, consider true virtualization (e.g., IntersectionObserver + windowed rows).
 */

// ---- Data endpoints ---------------------------------------------------------


const URL_SINGLE = "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-full.json";

const URL_CHUNKED = [
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-01-10.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-11-20.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-21-30.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-31-40.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-41-50.json",
  "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-51-65.json",
];

// ---- Elements ---------------------------------------------------------------
const loader = document.getElementById("loader");
const statusMsg = document.getElementById("statusMsg");
const tbody = document.getElementById("episodesBody");
const table = document.getElementById("episodesTable");
const rowTemplate = document.getElementById("rowTemplate");

const titleFilter = document.getElementById("titleFilter");
const eraFilter = document.getElementById("eraFilter");
const doctorFilter = document.getElementById("doctorFilter");
const companionFilter = document.getElementById("companionFilter");
const warningsToggle = document.getElementById("warningsToggle");
const warningsCountEl = document.getElementById("warningsCount");
const warningsDialog = document.getElementById("warningsDialog");
const warningsList = document.getElementById("warningsList");
const closeWarnings = document.getElementById("closeWarnings");

const exportCsvBtn = document.getElementById("exportCsvBtn");
const useChunkedChk = document.getElementById("useChunked");

const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const pageSizeSel = document.getElementById("pageSize");

// ---- App state --------------------------------------------------------------
let rawEpisodes = [];     // original raw objects from API(s)
let normalized = [];      // normalized/derived fields for display + sorting
let filtered = [];        // filtered (and relevance-scored) list
let paged = [];           // current page slice
let sortState = [];       // [{key, dir}] last = primary; Shift+click adds
let warnings = [];        // validation warnings
let currentPage = 1;
let pageSize = parseInt(pageSizeSel.value, 10);

// ---- Utilities --------------------------------------------------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Normalize possible JSON response shapes to a flat array of episodes
function normalizeToArray(j) {
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.episodes)) return j.episodes;
  if (j && Array.isArray(j.data)) return j.data;
  return [];
}

function showLoader(msg = "Loading…") {
  loader.classList.remove("hidden");
  statusMsg.textContent = msg;
}
function hideLoader() {
  loader.classList.add("hidden");
  statusMsg.textContent = "";
}
function setStatus(msg = "", isError = false) {
  statusMsg.textContent = msg;
  statusMsg.style.color = isError ? "#ffb0b0" : "";
}

function text(v) { return v == null ? "" : String(v); }

function toTitleCase(str) {
  return str.replace(/\w\S*/g, s => s[0].toUpperCase() + s.slice(1).toLowerCase());
}

// Robust date parsing for "YYYY-MM-DD", "DD/MM/YYYY", "Month DD, YYYY", "YYYY"
function parseBroadcastDate(value) {
  if (!value) return null;
  let d = null;

  // YYYY (year-only)
  if (/^\d{4}$/.test(value)) {
    d = new Date(Number(value), 0, 1);
  }
  // YYYY-MM-DD
  else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split("-").map(Number);
    d = new Date(y, m - 1, day);
  }
  // DD/MM/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, m, y] = value.split("/").map(Number);
    d = new Date(y, m - 1, day);
  }
  // Month DD, YYYY
  else if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(value)) {
    d = new Date(value);
  }

  if (d && !isNaN(d.getTime())) return d;
  return null;
}

// Writer formatting (handles "&" or "and")
function normalizeWriters(w) {
  if (w == null) return "—";
  // Split on ' & ' or ' and ' (with optional spaces)
  const parts = String(w).split(/\s*(?:&|and)\s*/i).filter(Boolean);
  return parts.join(", ");
}

function fmtDoctor(doctor) {
  if (!doctor || (!doctor.actor && !doctor.incarnation)) return "—";
  const a = text(doctor.actor);
  const inc = text(doctor.incarnation);
  return inc ? `${a} (${inc})` : a || "—";
}

function fmtCompanion(comp) {
  if (!comp) return "—";
  const a = text(comp.actor);
  const c = text(comp.character);
  if (!a && !c) return "—";
  return c ? `${a} (${c})` : a || c || "—";
}

// Data validation helpers
function addWarning(msg, item) {
  const entry = { msg, item };
  warnings.push(entry);
  console.warn("[WARN]", msg, item);
}

// ---- Fetch & normalize ------------------------------------------------------
async function fetchAll(useChunked) {
  showLoader(useChunked ? "Loading 6-part dataset…" : "Loading full dataset…");
  setStatus("");

  try {
    let arr = [];
    if (!useChunked) {
      const r = await fetch(URL_SINGLE);
      if (!r.ok) throw new Error(`HTTP ${r.status} while loading full dataset`);
      arr = normalizeToArray(await r.json());
    } else {
      const results = await Promise.all(URL_CHUNKED.map(url => fetch(url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} at ${url}`);
        return r.json();
      })));
      arr = results.map(normalizeToArray).flat();
    }

    rawEpisodes = arr;
    normalized = arr.map((e,i) => normaEpisode(e,i));
    autoFixRanks(normalized);
    postLoadValidation(normalized);

    populateFilters(normalized);
    applyFiltersAndSort(); // builds filtered + paged + renders
    setStatus(`Loaded ${normalized.length} episodes.`);
  } catch (err) {
    console.error(err);
    // Retry with alternate mode once
    try {
      if (!useChunked) {
        setStatus("Retrying with 6-part dataset…");
        await fetchAll(true);
        return;
      } else {
        setStatus("Retrying with full dataset…");
        await fetchAll(false);
        return;
      }
    } catch (_) {
      // ignore; proceed to next fallback
    }

    // Try URL parameter ?data=
    try {
      const params = new URLSearchParams(location.search);
      const dataUrl = params.get('data');
      if (dataUrl) {
        const altResp = await fetch(dataUrl, { cache: 'no-store' });
        if (altResp.ok) {
          const altJson = await altResp.json();
          const arr = normalizeToArray(altJson);
          rawEpisodes = arr;
          normalized = arr.map((e,i) => normaEpisode(e,i));
          autoFixRanks(normalized);
          postLoadValidation(normalized);
          populateFilters(normalized);
          applyFiltersAndSort();
          setStatus(`Loaded ${normalized.length} episodes from parameter.`);
          return;
        }
      }
    } catch (_) { /* continue */ }

    // Final fallback: minimal inline sample so UI isn't empty
    try {
      const SAMPLE = [
        { rank: 1, title: "Rose", series: 1, era: "Modern", broadcast_date: "2005-03-26", director: "Keith Boak", writer: "Russell T Davies", doctor: { actor:"Christopher Eccleston", incarnation:"9th" }, companion: { actor:"Billie Piper", character:"Rose Tyler" }, cast: ["Eccleston","Piper"] },
        { rank: 2, title: "The End of the World", series: 1, era: "Modern", broadcast_date: "2005-04-02", director: "Euros Lyn", writer: "Russell T Davies", doctor: { actor:"Christopher Eccleston", incarnation:"9th" }, companion: { actor:"Billie Piper", character:"Rose Tyler" }, cast: ["Eccleston","Piper"] }
      ];
      rawEpisodes = SAMPLE;
      normalized = SAMPLE.map((e,i) => normaEpisode(e,i));
      autoFixRanks(normalized);
      postLoadValidation(normalized);
      populateFilters(normalized);
      applyFiltersAndSort();
      setStatus("Loaded fallback sample (network failed).", true);
    } catch (finalErr) {
      setStatus(`Error: ${err.message}`, true);
      tbody.innerHTML = `<tr><td colspan="10" style="color:#ffb0b0">Failed to load episodes. Please try again.</td></tr>`;
    }
  } finally {
    hideLoader();
  }
}

function normaEpisode(e, i) {
  // Gracefully accept missing fields; pad with placeholders and safe numbers
  const bd = parseBroadcastDate(e.broadcast_date);
  const year = bd ? bd.getFullYear() : null;

  const castCount = Array.isArray(e.cast) ? e.cast.length : 0;

  let r = Number(e.rank);
  const s = Number(e.series);

  return {
    raw: e,
    rank: Number.isFinite(r) ? r : (typeof i === "number" ? i + 1 : null),
    title: (text(e.title) || "—"),
    series: Number.isFinite(s) ? s : null,
    era: (text(e.era) || "—"),
    year,
    director: text(e.director),
    writer: normalizeWriters(e.writer),
    doctorFmt: fmtDoctor(e.doctor),
    companionFmt: fmtCompanion(e.companion),
    castCount: Number.isFinite(castCount) ? castCount : 0,

    // For sorting by real broadcast time if needed
    _date: bd,
  };
}

// Ensure ranks are unique and sequential based on current list order
function autoFixRanks(list) {
  for (let i = 0; i < list.length; i++) {
    list[i].rank = i + 1;
  }
}

function postLoadValidation(list) {
  warnings.length = 0;

  list.forEach((it, idx) => {
    // Only warn on missing title to reduce noise
    if (!it.title || (typeof it.title === 'string' && it.title.trim() === '')) {
      addWarning(`Missing required field "title" at index ${idx}`, it.raw);
    }
  });

  warningsCountEl.textContent = warnings.length;
}

// ---- Filters, sorting, relevance -------------------------------------------
function getActiveFilter() {
  return {
    title: titleFilter.value.trim().toLowerCase(),
    era: eraFilter.value,
    doctor: doctorFilter.value,
    companion: companionFilter.value,
  };
}

function matchesFilters(item, f) {
  if (f.title) {
    const t = item.title.toLowerCase();
    if (!t.includes(f.title)) return false;
  }
  if (f.era && item.era !== f.era) return false;
  if (f.doctor && item.doctorFmt !== f.doctor) return false;
  if (f.companion && item.companionFmt !== f.companion) return false;
  return true;
}

function computeRelevance(item, f) {
  if (!f.title && !f.era && !f.doctor && !f.companion) return { score: 0, tier: 4 };
  // Smart relevance tiers:
  // 1 exact title, 2 title contains, 3 any field contains, 4 default rank
  const q = f.title;
  if (q) {
    const titleLC = item.title.toLowerCase();
    if (titleLC === q) return { score: 1000, tier: 1 };
    if (titleLC.includes(q)) return { score: 800, tier: 2 };
    const any = [
      item.director, item.writer, item.doctorFmt, item.companionFmt, item.era, String(item.series), String(item.year)
    ].join(" ").toLowerCase();
    if (any.includes(q)) return { score: 500, tier: 3 };
  }
  return { score: 0, tier: 4 };
}

function sortByState(arr) {
  // Helper: normalize values so null/NaN go to the end
  const norm = (val) => {
    if (val == null) return { t: 'null', v: Infinity };
    if (val instanceof Date) return { t: 'num', v: isNaN(val) ? Infinity : val.getTime() };
    if (typeof val === 'number') return { t: 'num', v: Number.isFinite(val) ? val : Infinity };
    return { t: 'str', v: String(val).toLowerCase() };
  };

  // Default sort by rank with null/NaN at the end
  if (!sortState.length) return arr.sort((a,b)=> {
    const A = norm(a.rank); const B = norm(b.rank);
    if (A.t === 'num' && B.t === 'num') return A.v - B.v;
    return 0;
  });

  const keys = [...sortState]; // [{key, dir}]
  return arr.sort((a,b) => {
    for (let i=keys.length-1; i>=0; i--) { // last added = primary
      const {key, dir} = keys[i];
      const A = norm(a[key]);
      const B = norm(b[key]);
      if (A.t === 'num' && B.t === 'num') {
        if (A.v !== B.v) return (A.v - B.v) * (dir === 'asc' ? 1 : -1);
      } else {
        if (A.v < B.v) return dir === 'asc' ? -1 : 1;
        if (A.v > B.v) return dir === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });
}

function applyFiltersAndSort() {
  const f = getActiveFilter();
  const base = normalized.filter(it => matchesFilters(it, f));

  // Smart relevance: when any filter is active, order by relevance tier/score, then apply explicit sorts.
  const withRel = base.map(it => {
    const rel = computeRelevance(it, f);
    return {...it, _relScore: rel.score, _relTier: rel.tier};
  });

  // First: explicit sort; if none, default rank; but we also keep relevance precedence.
  const explicitlySorted = sortByState([...withRel]);

  // Now interleave relevance (tier ASC, score DESC) ahead of explicit sorting when filters are active.
  const final = [...explicitlySorted].sort((a,b) => {
    if (!f.title && !f.era && !f.doctor && !f.companion) return 0;
    if (a._relTier !== b._relTier) return a._relTier - b._relTier;
    if (a._relScore !== b._relScore) return b._relScore - a._relScore;
    return 0;
  });

  filtered = final;
  currentPage = 1;
  renderPage();
}

// ---- Rendering & pagination -------------------------------------------------
function renderPage() {
  pageSize = parseInt(pageSizeSel.value, 10);
  const total = filtered.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  paged = filtered.slice(start, end);

  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();

  paged.forEach(ep => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    const cells = row.children;

    // Use textContent to avoid HTML issues with special chars
    cells[0].textContent = ep.rank ?? "—";
    cells[1].textContent = ep.title || "—";
    cells[2].textContent = ep.series ?? "—";
    cells[3].textContent = ep.era || "—";
    cells[4].textContent = ep.year ?? "—";
    cells[5].textContent = ep.director || "—";
    cells[6].textContent = ep.writer || "—";
    cells[7].textContent = ep.doctorFmt || "—";
    cells[8].textContent = ep.companionFmt || "—";
    cells[9].textContent = typeof ep.castCount === "number" ? ep.castCount : "0";

    frag.appendChild(row);
  });

  tbody.appendChild(frag);

  // Pagination UI
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;

  // Update header sort indicators
  refreshHeaderSortUI();
}

// ---- Header sorting (click & Shift+click) ----------------------------------
function refreshHeaderSortUI() {
  const ths = table.tHead.querySelectorAll("th");
  ths.forEach(th => {
    th.classList.remove("sort-asc", "sort-desc", "multi");
    th.removeAttribute("data-sort-index");
  });

  // oldest is index 0; latest is primary at the end
  sortState.forEach((s, i) => {
    const th = table.tHead.querySelector(`th[data-sort-key="${s.key}"]`);
    if (!th) return;
    th.classList.add(s.dir === "asc" ? "sort-asc" : "sort-desc");
    if (sortState.length > 1) {
      th.classList.add("multi");
      th.setAttribute("data-sort-index", i + 1);
    }
  });
}

function toggleSort(key, multi) {
  // Find if already exists
  const idx = sortState.findIndex(s => s.key === key);
  if (idx >= 0) {
    // toggle direction
    sortState[idx].dir = sortState[idx].dir === "asc" ? "desc" : "asc";
    // bump to top (primary) if not multi
    if (!multi) {
      const [s] = sortState.splice(idx, 1);
      sortState = [s];
    }
  } else {
    const entry = { key, dir: "asc" };
    if (multi) {
      sortState.push(entry);
    } else {
      sortState = [entry];
    }
  }
  applyFiltersAndSort();
}

// ---- Keyboard navigation ----------------------------------------------------
function focusRow(index) {
  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (!rows.length) return;
  const i = Math.max(0, Math.min(rows.length - 1, index));
  rows[i].focus();
}

function getFocusedRowIndex() {
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const idx = rows.findIndex(r => r === document.activeElement);
  return idx;
}

// ---- CSV export -------------------------------------------------------------
function escapeCsvCell(value) {
  const v = value == null ? "" : String(value);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function exportCurrentViewAsCSV() {
  const headers = ["Rank","Title","Series","Era","Broadcast Year","Director","Writer","Doctor","Companion","Cast Count"];
  const lines = [headers.map(escapeCsvCell).join(",")];

  filtered.forEach(ep => {
    const row = [
      ep.rank ?? "",
      ep.title ?? "",
      ep.series ?? "",
      ep.era ?? "",
      ep.year ?? "",
      ep.director ?? "",
      ep.writer ?? "",
      ep.doctorFmt ?? "",
      ep.companionFmt ?? "",
      typeof ep.castCount === "number" ? ep.castCount : "",
    ];
    lines.push(row.map(escapeCsvCell).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "doctor-who-episodes.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---- Filters population -----------------------------------------------------
function uniqueSorted(list) {
  return Array.from(new Set(list)).filter(Boolean).sort((a,b)=> a.localeCompare(b));
}

function populateFilters(list) {
  const eras = uniqueSorted(list.map(x => x.era));
  const doctors = uniqueSorted(list.map(x => x.doctorFmt));
  const companions = uniqueSorted(list.map(x => x.companionFmt));

  fillSelect(eraFilter, eras, "All Eras");
  fillSelect(doctorFilter, doctors, "All Doctors");
  fillSelect(companionFilter, companions, "All Companions");
}

function fillSelect(sel, values, firstLabel) {
  const current = sel.value;
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = firstLabel;
  sel.appendChild(opt0);

  values.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  });

  // try to keep previous selection if still present
  if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

// ---- Debounce for filter input ---------------------------------------------
function debounce(fn, wait=250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
const debouncedFilter = debounce(applyFiltersAndSort, 220);

// ---- Events ----------------------------------------------------------------
table.tHead.addEventListener("click", (e) => {
  const th = e.target.closest("th");
  if (!th) return;
  const key = th.getAttribute("data-sort-key");
  if (!key) return;
  const multi = e.shiftKey;
  toggleSort(key, multi);
});

titleFilter.addEventListener("input", debouncedFilter);
eraFilter.addEventListener("change", applyFiltersAndSort);
doctorFilter.addEventListener("change", applyFiltersAndSort);
companionFilter.addEventListener("change", applyFiltersAndSort);

exportCsvBtn.addEventListener("click", exportCurrentViewAsCSV);

warningsToggle.addEventListener("click", () => {
  // Toggle dialog visibility
  if (!warnings.length) {
    setStatus("No validation warnings.");
    return;
  }
  warningsList.innerHTML = "";
  warnings.forEach(w => {
    const div = document.createElement("div");
    div.className = "warn";
    div.textContent = w.msg;
    warningsList.appendChild(div);
  });
  warningsDialog.showModal();
});
closeWarnings.addEventListener("click", () => warningsDialog.close());

useChunkedChk.addEventListener("change", async () => {
  await fetchAll(useChunkedChk.checked);
});

// Pagination
prevPageBtn.addEventListener("click", () => {
  currentPage -= 1;
  renderPage();
});
nextPageBtn.addEventListener("click", () => {
  currentPage += 1;
  renderPage();
});
pageSizeSel.addEventListener("change", () => {
  currentPage = 1;
  renderPage();
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  const activeEl = document.activeElement;
  const isInTable = activeEl && activeEl.tagName === "TR" && activeEl.closest("tbody") === tbody;

  // Enter on header = sort by focused column (accessibility)
  if (e.key === "Enter" && activeEl && activeEl.tagName === "TH") {
    const th = activeEl;
    const key = th.getAttribute("data-sort-key");
    if (key) {
      toggleSort(key, e.shiftKey);
      e.preventDefault();
    }
  }

  if (!isInTable) return;

  if (e.key === "ArrowDown") {
    const idx = getFocusedRowIndex();
    focusRow((idx ?? -1) + 1);
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    const idx = getFocusedRowIndex();
    focusRow((idx ?? 0) - 1);
    e.preventDefault();
  } else if (e.key === "Enter") {
    // Sort by the last clicked header again (or default rank)
    const last = sortState.at(-1) || { key: "rank" };
    toggleSort(last.key, e.shiftKey);
    e.preventDefault();
  }
});

// Make table headers focusable for Enter sorting
Array.from(table.tHead.querySelectorAll("th")).forEach(th => th.tabIndex = 0);

// ---- Init -------------------------------------------------------------------
(async function init(){
  // Prefer explicit data URL if provided
  try {
    const params = new URLSearchParams(location.search);
    const dataUrl = params.get('data');
    if (dataUrl) {
      showLoader("Loading custom dataset…");
      const r = await fetch(dataUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status} at ${dataUrl}`);
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j && Array.isArray(j.episodes) ? j.episodes : []);
      rawEpisodes = arr;
      normalized = arr.map((e,i) => normaEpisode(e,i));
      postLoadValidation(normalized);
      populateFilters(normalized);
      applyFiltersAndSort();
      setStatus(`Loaded ${normalized.length} episodes.`);
      hideLoader();
      return;
    }
  } catch (e) {
    console.warn("Param data load failed, falling back:", e);
    hideLoader();
  }

  await fetchAll(false); // default: full dataset (Alt 1)
})();
