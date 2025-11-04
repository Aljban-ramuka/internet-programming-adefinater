// Doctor Who Episodes – Beginner version that matches your HTML/table
// Works with ./doctor-who-episodes-full.json (object { episodes: [...] } or plain array)
// Tier 1 + Tier 2 covered with simple code and comments.

const DATA_URL = "./doctor-who-episodes-full.json"; // local file

let episodes = [];   // normalized records for display
let filtered = [];   // filtered subset
let sortState = { field: "rank", dir: 1 }; // 1 asc, -1 desc

document.addEventListener("DOMContentLoaded", async () => {
  setStatus("Loading…");
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    // The file is { episodes: [...] } (or could be a plain array)
    const arr = Array.isArray(raw) ? raw : (Array.isArray(raw.episodes) ? raw.episodes : []);
    if (!Array.isArray(arr)) throw new Error("Invalid JSON structure");

    // Normalize every item to the exact fields our table expects
    episodes = arr.map(normalizeEpisode);

    // Basic data validation examples (Tier 3 option if you want to show/calc warnings)
    // We keep it simple: log warnings; you can expand if desired.
    validateData(episodes);

    filtered = episodes.slice();
    initSorting();
    initFiltering();
    render();
    setStatus(""); // clear status
  } catch (err) {
    console.error("Failed to load data:", err);
    setStatus("Failed to load data: " + err.message, true);
  }
});

// ---------- UI status / spinner ----------
function setStatus(msg, isError = false) {
  const status = document.getElementById("status");
  const text = status.querySelector(".status-text");
  const spinnerHost = status; // .loading class toggles spinner via CSS

  text.textContent = msg;
  status.classList.toggle("error", !!isError);

  if (msg && msg.toLowerCase().includes("loading")) {
    spinnerHost.classList.add("loading");
  } else {
    spinnerHost.classList.remove("loading");
  }
}

// ---------- Filtering ----------
function initFiltering() {
  const search = document.getElementById("searchInput");
  const modernOnly = document.getElementById("modernOnly");

  const apply = () => {
    const q = (search.value || "").trim().toLowerCase();
    const modernCheck = modernOnly && modernOnly.checked;

    filtered = episodes.filter(ep => {
      const titleOk = !q || ep.title.toLowerCase().includes(q);
      const eraOk = !modernCheck || (ep.era !== "Classic");
      return titleOk && eraOk;
    });

    render();
  };

  if (search) search.addEventListener("input", apply);
  if (modernOnly) modernOnly.addEventListener("change", apply);
}

// ---------- Sorting ----------
function initSorting() {
  document.querySelectorAll("#episodesTable thead th").forEach(th => {
    th.addEventListener("click", () => {
      const field = th.dataset.field;
      if (!field) return;
      if (sortState.field === field) {
        sortState.dir *= -1; // toggle asc/desc
      } else {
        sortState.field = field;
        sortState.dir = 1;
      }
      render();
      updateSortIndicators();
    });
  });
  updateSortIndicators();
}

function updateSortIndicators() {
  document.querySelectorAll("#episodesTable thead th").forEach(th => {
    const field = th.dataset.field;
    th.classList.remove("asc","desc");
    if (field === sortState.field) {
      th.classList.add(sortState.dir === 1 ? "asc" : "desc");
    }
  });
}

// ---------- Render ----------
function render() {
  const tbody = document.querySelector("#episodesTable tbody");
  const tpl = document.getElementById("rowTemplate");
  tbody.innerHTML = "";

  // Sort a copy of the current filtered list
  const items = filtered.slice().sort((a, b) => compare(a, b, sortState.field) * sortState.dir);

  for (const ep of items) {
    const row = tpl.content.cloneNode(true);

    // Use textContent to render safely (handles special characters correctly)
    row.querySelector(".rank").textContent      = show(ep.rank);
    row.querySelector(".title").textContent     = show(ep.title);
    row.querySelector(".series").textContent    = show(ep.series);
    row.querySelector(".era").textContent       = show(ep.era);
    row.querySelector(".year").textContent      = show(ep.broadcastYear);
    row.querySelector(".director").textContent  = show(ep.director);
    row.querySelector(".writer").textContent    = show(ep.writer);
    row.querySelector(".doctor").textContent    = show(ep.doctor);
    row.querySelector(".companion").textContent = show(ep.companion);
    row.querySelector(".cast").textContent      = show(ep.castCount);

    tbody.appendChild(row);
  }
}

// ---------- Normalization helpers ----------
function normalizeEpisode(src) {
  // rank (number; if invalid, keep as "-")
  const rank = toNumberOrNull(src.rank);

  // title (string; if missing, "-")
  const title = valStr(src.title);

  // series: some items have "Special" or even negative; rubric says "number"
  // We'll keep numeric when possible, else "-"
  const seriesNum = toNumberOrNull(src.series);
  const series = seriesNum != null ? seriesNum : (isFinite(parseInt(src.series)) ? parseInt(src.series, 10) : "-");

  // era as-is (Classic/Modern/Recent)
  const era = valStr(src.era);

  // broadcastYear from various date formats
  const broadcastYear = parseYear(src.broadcast_date);

  // director (string)
  const director = valStr(src.director);

  // writer: could have multiple, separated by commas/&/and
  const writer = joinWriters(src.writer);

  // doctor "Actor (Incarnation)"
  const d = src.doctor || {};
  const doctorActor = valStr(d.actor);
  const doctorInc   = valStr(d.incarnation);
  const doctor = doctorActor ? (doctorInc ? `${doctorActor} (${doctorInc})` : doctorActor) : "-";

  // companion can be null or object; "Actor (Character)"
  const c = src.companion || null;
  let companion = "-";
  if (c && (c.actor || c.character)) {
    const compActor = valStr(c.actor);
    const compChar  = valStr(c.character);
    companion = compActor ? (compChar ? `${compActor} (${compChar})` : compActor) : (compChar || "-");
  }

  // castCount from cast array (empty array is 0; null → 0)
  const castCount = Array.isArray(src.cast) ? src.cast.length : 0;

  return {
    rank: rank != null ? rank : "-",
    title,
    series,
    era,
    broadcastYear: broadcastYear != null ? broadcastYear : "-",
    director,
    writer,
    doctor,
    companion,
    castCount
  };
}

function parseYear(dateStr) {
  if (!dateStr) return null;

  // Already just a year like "2024"
  if (/^\d{4}$/.test(dateStr)) return parseInt(dateStr, 10);

  // UK format DD/MM/YYYY (e.g., 25/12/2024)
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const m1 = uk.exec(dateStr);
  if (m1) return parseInt(m1[3], 10);

  // "December 25 2024" / "December 25, 2024"
  const long = /^([A-Za-z]+)\s+\d{1,2},?\s+(\d{4})$/;
  const m2 = long.exec(dateStr);
  if (m2) return parseInt(m2[2], 10);

  // ISO like 2024-12-25
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.getFullYear();

  return null; // unknown format
}

function joinWriters(w) {
  if (!w) return "-";
  // Split by comma, ampersand, or " and "
  const parts = String(w).split(/,|&| and /i).map(s => s.trim()).filter(Boolean);
  if (!parts.length) return "-";
  // De-duplicate while preserving order
  const seen = new Set();
  const list = [];
  for (const p of parts) {
    if (!seen.has(p)) { seen.add(p); list.push(p); }
  }
  return list.join(", ");
}

// ---------- Compare/sort helpers ----------
function compare(a, b, field) {
  const va = a[field];
  const vb = b[field];

  // numeric columns
  if (["rank", "series", "broadcastYear", "castCount"].includes(field)) {
    const na = typeof va === "number" ? va : Number.NEGATIVE_INFINITY;
    const nb = typeof vb === "number" ? vb : Number.NEGATIVE_INFINITY;
    return na - nb;
  }
  // string compare (case-insensitive)
  return String(va ?? "").toLowerCase().localeCompare(String(vb ?? "").toLowerCase());
}

// ---------- small utils ----------
function valStr(v) {
  if (v == null) return "";
  return String(v);
}
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function show(v) {
  return (v == null || v === "") ? "-" : v;
}

// ---------- (Optional) basic data validation logging ----------
function validateData(list) {
  const nowYear = (new Date()).getFullYear();
  const seenRanks = new Set();

  for (const ep of list) {
    // Missing required fields
    if (!ep.title) console.warn("Missing title for rank:", ep.rank);
    if (ep.rank === "-") console.warn("Missing/invalid rank for title:", ep.title);

    // Duplicate ranks
    if (typeof ep.rank === "number") {
      if (seenRanks.has(ep.rank)) console.warn("Duplicate rank:", ep.rank, "title:", ep.title);
      seenRanks.add(ep.rank);
    }

    // Negative series numbers
    if (typeof ep.series === "number" && ep.series < 0) {
      console.warn("Negative series number at rank:", ep.rank, "title:", ep.title);
    }

    // Future broadcast year
    if (typeof ep.broadcastYear === "number" && ep.broadcastYear > nowYear) {
      console.warn("Future broadcast year:", ep.broadcastYear, "at rank:", ep.rank, "title:", ep.title);
    }
  }
}
