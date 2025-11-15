
const CONFIG = {
  
  SEGMENT_URLS: [
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json",
  ],
  
  FULL_URL:
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json",
  LOCAL_URL: "./doctor-who-episodes-full.json",

  ERA_ORDER: ["Classic", "Modern", "Recent"],
  FILTER_DEBOUNCE: 160
};


const state = {
  episodes: [],
  filtered: [],
  
  sorts: [{ field: "rank", asc: true }],
  warnings: 0,
  seenRanks: new Set()
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupEvents();
  await loadEpisodes();
}

function setupEvents() {
 
  const debouncedFilter = debounce(applyFilters, CONFIG.FILTER_DEBOUNCE);
  document.getElementById("name-filter").addEventListener("input", debouncedFilter);

  ["era-filter","doctor-filter","companion-filter","writer-filter","year-filter"]
    .forEach(id => document.getElementById(id).addEventListener("change", applyFilters));

  document.getElementById("reset-filters").addEventListener("click", () => {
    document.getElementById("name-filter").value = "";
    ["era-filter","doctor-filter","companion-filter","writer-filter","year-filter"].forEach(id => {
      document.getElementById(id).value = "";
    });
    applyFilters();
  });

  document.querySelectorAll("thead th").forEach(th => {
    th.addEventListener("click", (e) => updateSort(th.dataset.sort, e.shiftKey));
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter") updateSort(th.dataset.sort, e.shiftKey);
    });
  });

  document.addEventListener("keydown", (e) => {
    const rows = Array.from(document.querySelectorAll("#episodes-body tr"));
    if (!rows.length) return;
    const focusedIndex = rows.findIndex(r => r === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      rows[Math.min(focusedIndex + 1, rows.length - 1) || 0].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      rows[Math.max((focusedIndex < 0 ? 0 : focusedIndex - 1), 0)].focus();
    }
  });

  document.getElementById("export-csv").addEventListener("click", exportCSV);
}

async function loadEpisodes() {
  showError(""); showLoading(true);
  state.warnings = 0; state.seenRanks.clear(); updateWarningsBadge();

  try {
    let data = await fetchSegments(CONFIG.SEGMENT_URLS);
    if (!data) data = await tryFetch(CONFIG.FULL_URL);
    if (!data) data = await tryFetch(CONFIG.LOCAL_URL);
    if (!data) throw new Error("Could not load data from any source.");

    const episodes = Array.isArray(data) ? data : data.episodes;
    if (!Array.isArray(episodes)) throw new Error("Invalid JSON structure (missing 'episodes').");

    state.episodes = episodes.map(validateAndNormalizeEpisode);
    state.filtered = state.episodes.slice();

    populateFilters(state.episodes);
    applySort();
    showLoading(false);
    document.getElementById("table-wrap").style.display = "block";
  } catch (err) {
    showLoading(false);
    showError(`Failed to load episodes: ${err.message}`);
  }
}

async function fetchSegments(urls) {
  try {
    const resps = await Promise.all(urls.map(u => fetch(u, { cache: "no-store" })));
    if (!resps.every(r => r.ok)) return null;
    const jsons = await Promise.all(resps.map(r => r.json()));
    const merged = jsons.flatMap(j => Array.isArray(j) ? j : (j.episodes || []));
    return merged;
  } catch {
    return null;
  }
}

async function tryFetch(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function validateAndNormalizeEpisode(raw) {
  const ep = { ...raw };

  
  const required = ["rank", "title", "series", "broadcast_date"];
  required.forEach(field => {
    if (ep[field] === undefined || ep[field] === null || ep[field] === "") {
      addWarning(`Missing required field "${field}" for episode "${ep.title || "(untitled)"}"`);
    }
  });

  
  if (typeof ep.rank !== "number") {
    addWarning(`Invalid rank type for "${ep.title || "(untitled)"}"`);
  } else {
    if (state.seenRanks.has(ep.rank)) addWarning(`Duplicate rank detected: ${ep.rank}`);
    state.seenRanks.add(ep.rank);
  }

 
  if (typeof ep.series === "number" && ep.series < 0) {
    addWarning(`Negative series number for "${ep.title || "(untitled)"}"`);
  }

  
  ep.broadcast_year = parseYear(ep.broadcast_date);
  const nowY = new Date().getFullYear();
  if (typeof ep.broadcast_year === "number" && ep.broadcast_year > nowY) {
    addWarning(`Future broadcast year (${ep.broadcast_year}) for "${ep.title || "(untitled)"}"`);
  }

  
  if (!Array.isArray(ep.cast)) ep.cast = [];
  ep.cast_count = ep.cast.length;
  ep.doctor = ep.doctor || null;
  ep.companion = ep.companion || null;

  return ep;
}

function addWarning(msg) {
  console.warn("[DATA WARNING]", msg);
  state.warnings += 1;
  updateWarningsBadge();
}

function updateWarningsBadge() {
  document.getElementById("warnings").textContent = `⚠️ ${state.warnings}`;
}

function parseYear(dateStr) {
  if (dateStr == null) return "—";
  const s = String(dateStr).trim();

  let m = /^(\d{4})$/.exec(s);
  if (m) return Number(m[1]);

  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); // ISO
  if (m) return Number(m[1]);

  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); // UK
  if (m) return Number(m[3]);

  const d = new Date(s);
  if (!isNaN(d)) return d.getFullYear();

  addWarning(`Unrecognized broadcast date format: "${s}"`);
  return "—";
}


function populateFilters(list) {
  const uniq = (arr) => Array.from(new Set(arr)).filter(Boolean);
  const escape = (v) => String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const eras = uniq(list.map(e => e.era)).sort((a,b)=>String(a).localeCompare(String(b)));
  fillSelect("era-filter", eras);

  const doctors = uniq(list.map(e => e?.doctor?.actor)).sort((a,b)=>String(a).localeCompare(String(b)));
  fillSelect("doctor-filter", doctors);

  const companions = uniq(list.map(e => e?.companion?.actor)).sort((a,b)=>String(a).localeCompare(String(b)));
  fillSelect("companion-filter", companions);

  const writers = uniq(list.flatMap(e => splitWriters(e.writer))).sort((a,b)=>String(a).localeCompare(String(b)));
  fillSelect("writer-filter", writers);

  const years = uniq(list.map(e => e.broadcast_year).filter(y => y !== "—")).sort((a,b)=>a-b);
  fillSelect("year-filter", years);

  function fillSelect(id, items) {
    const sel = document.getElementById(id);
    const keepFirst = sel.firstElementChild?.outerHTML || '<option value="">All</option>';
    sel.innerHTML = keepFirst + items.map(v => `<option value="${escape(v)}">${escape(v)}</option>`).join("");
  }
}

function splitWriters(w) {
  if (!w) return [];
  return String(w).split(/(?:\s*&\s*|\s+and\s+)/i).map(s => s.trim()).filter(Boolean);
}


function applyFilters() {
  const q = document.getElementById("name-filter").value.trim().toLowerCase();
  const era = document.getElementById("era-filter").value;
  const doc = document.getElementById("doctor-filter").value;
  const comp = document.getElementById("companion-filter").value;
  const writer = document.getElementById("writer-filter").value;
  const year = document.getElementById("year-filter").value;

  let results = state.episodes.filter(ep => {
    if (era && ep.era !== era) return false;
    if (doc && ep?.doctor?.actor !== doc) return false;
    if (comp && ep?.companion?.actor !== comp) return false;
    if (writer && !splitWriters(ep.writer).includes(writer)) return false;
    if (year && String(ep.broadcast_year) !== String(year)) return false;
    if (q) {
      const title = (ep.title || "").toLowerCase();
      const any = [
        ep.title, ep.director, ep.writer,
        ep?.doctor?.actor, ep?.doctor?.incarnation,
        ep?.companion?.actor, ep?.companion?.character
      ].join(" ").toLowerCase();
      if (!title.includes(q) && !any.includes(q)) return false;
    }
    return true;
  });

 
  if (q) {
    const score = (ep) => {
      const t = (ep.title || "").toLowerCase();
      const any = [
        ep.title, ep.director, ep.writer,
        ep?.doctor?.actor, ep?.doctor?.incarnation,
        ep?.companion?.actor, ep?.companion?.character
      ].join(" ").toLowerCase();
      if (t === q) return 1;
      if (t.includes(q)) return 2;
      if (any.includes(q)) return 3;
      return 4;
    };
    results.sort((a, b) => {
      const sa = score(a), sb = score(b);
      if (sa !== sb) return sa - sb;
      return (a.rank ?? Infinity) - (b.rank ?? Infinity);
    });
    state.filtered = results;
    displayEpisodes(state.filtered);
    updateSortIndicators(); 
    return;
  }

  state.filtered = results;
  applySort(); 
}


function updateSort(field, addLevel) {
  if (!field) return;

  if (addLevel) {
    const idx = state.sorts.findIndex(s => s.field === field);
    if (idx >= 0) state.sorts[idx].asc = !state.sorts[idx].asc;
    else state.sorts.push({ field, asc: true });
  } else {
    const first = state.sorts[0];
    if (first && first.field === field) first.asc = !first.asc;
    else state.sorts = [{ field, asc: true }];
  }
  applySort();
}

function applySort() {
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  const get = (ep, field) => {
    switch (field) {
      case "broadcast_year": return ep.broadcast_year === "—" ? -Infinity : ep.broadcast_year;
      case "doctor": return `${ep?.doctor?.actor || ""} (${ep?.doctor?.incarnation || ""})`;
      case "companion": return `${ep?.companion?.actor || ""} (${ep?.companion?.character || ""})`;
      case "cast_count": return ep.cast_count ?? 0;
      default: return ep[field];
    }
  };

  state.filtered.sort((a, b) => {
    for (const lvl of state.sorts) {
      const A = get(a, lvl.field), B = get(b, lvl.field);
      let cmp = 0;
      if (typeof A === "number" && typeof B === "number") {
        cmp = A === B ? 0 : (A < B ? -1 : 1);
      } else {
        cmp = collator.compare(String(A ?? ""), String(B ?? ""));
      }
      if (cmp !== 0) return lvl.asc ? cmp : -cmp;
    }
    return 0;
  });

  displayEpisodes(state.filtered);
  updateSortIndicators();
}

function updateSortIndicators() {
  document.querySelectorAll("thead th").forEach(th => {
    th.classList.remove("sort-asc","sort-desc");
    th.removeAttribute("data-sort-index");
  });
  state.sorts.forEach((lvl, i) => {
    const th = document.querySelector(`thead th[data-sort="${lvl.field}"]`);
    if (!th) return;
    th.classList.add(lvl.asc ? "sort-asc" : "sort-desc");
    th.setAttribute("data-sort-index", String(i + 1));
  });
}


function displayEpisodes(list) {
  const tbody = document.getElementById("episodes-body");
  const noRes = document.getElementById("no-results");
  tbody.innerHTML = "";

  if (!list.length) { noRes.style.display = "block"; return; }
  noRes.style.display = "none";

  const frag = document.createDocumentFragment();
  for (const ep of list) {
    const tr = document.createElement("tr");
    tr.tabIndex = 0; // keyboard focus
    tr.innerHTML = `
      <td>${ep.rank ?? "—"}</td>
      <td>${escapeHtml(ep.title)}</td>
      <td>${ep.series ?? "—"}</td>
      <td>${ep.era ?? "—"}</td>
      <td>${ep.broadcast_year ?? "—"}</td>
      <td>${escapeHtml(ep.director || "—")}</td>
      <td>${escapeHtml(splitWriters(ep.writer).join(", ") || "—")}</td>
      <td>${escapeHtml(formatDoctor(ep.doctor))}</td>
      <td>${escapeHtml(formatCompanion(ep.companion))}</td>
      <td>${ep.cast_count ?? 0}</td>
    `;
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
}

function exportCSV() {
  const rows = [
    ["Rank","Title","Series","Era","Year","Director","Writer","Doctor","Companion","Cast"]
  ];

  state.filtered.forEach(ep => {
    rows.push([
      ep.rank ?? "",
      ep.title ?? "",
      ep.series ?? "",
      ep.era ?? "",
      ep.broadcast_year ?? "",
      ep.director ?? "",
      splitWriters(ep.writer).join("; "),
      formatDoctor(ep.doctor),
      formatCompanion(ep.companion),
      ep.cast_count ?? 0
    ]);
  });

  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "doctor-who-episodes.csv";
  document.body.appendChild(a); a.click();
  URL.revokeObjectURL(url); a.remove();
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

function escapeHtml(v) {
  return String(v ?? "—")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}
function formatDoctor(doc) {
  if (!doc) return "—";
  const actor = doc.actor || "Unknown";
  const inc = doc.incarnation ? ` (${doc.incarnation})` : "";
  return actor + inc;
}
function formatCompanion(comp) {
  if (!comp) return "—";
  const actor = comp.actor || "Unknown";
  const ch = comp.character ? ` (${comp.character})` : "";
  return actor + ch;
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
  document.getElementById("table-wrap").style.display = show ? "none" : "block";
}
function showError(msg) {
  const el = document.getElementById("error");
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

let warningsArray = [];

function addWarning(msg) {
  console.warn("[DATA WARNING]", msg);
  state.warnings++;
  warningsArray.push(msg);
  updateWarningsBadge();
}


const warnBtn = document.getElementById("warnings-btn");
const warnModal = document.getElementById("warnings-modal");
const warnList = document.getElementById("warnings-list");
const closeWarn = document.getElementById("close-warnings");

warnBtn.addEventListener("click", () => {
  warnList.innerHTML = warningsArray.length
    ? warningsArray.map(w => `<li>${escapeHtml(w)}</li>`).join("")
    : "<li>No warnings found ✅</li>";
  warnModal.style.display = "flex";
});
closeWarn.addEventListener("click", () => warnModal.style.display = "none");
warnModal.addEventListener("click", e => {
  if (e.target === warnModal) warnModal.style.display = "none";
});


const castModal = document.getElementById("cast-modal");
const modalTitle = document.getElementById("modal-title");
const modalYear = document.getElementById("modal-year");
const modalCast = document.getElementById("modal-cast");
const closeCast = document.getElementById("close-cast");

document.getElementById("episodes-body").addEventListener("click", e => {
  const row = e.target.closest("tr");
  if (!row) return;
  const idx = Array.from(row.parentNode.children).indexOf(row);
  const ep = state.filtered[idx];
  modalTitle.textContent = ep.title;
  modalYear.textContent = `Year: ${ep.broadcast_year}`;
  if (!ep.cast || !ep.cast.length) {
    modalCast.innerHTML = "<p>No cast data available.</p>";
  } else {
    modalCast.innerHTML =
      "<ul>" +
      ep.cast.map(c => `<li>${escapeHtml(c.actor)} — ${escapeHtml(c.character)}</li>`).join("") +
      "</ul>";
  }
  castModal.style.display = "flex";
});

closeCast.addEventListener("click", () => castModal.style.display = "none");
castModal.addEventListener("click", e => {
  if (e.target === castModal) castModal.style.display = "none";
});



