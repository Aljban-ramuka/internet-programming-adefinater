
(() => {
  // -----------------------------
  // Config
  // -----------------------------
  const MULTI_URLS = [
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json",
  ];
  const SINGLE_URL =
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json";

  const RE_WRITER_SPLIT = /\s*(?:&|and)\s*/i;

  // -----------------------------
  // State
  // -----------------------------
  const state = {
    raw: [],
    rows: [],
    filtered: [],
    sort: { key: "rank", dir: "asc" },
    warnings: 0,
  };
  
  let loadJobId = 0;
  state.warningsList = [];

  // -----------------------------
  // DOM
  // -----------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    loading: $("#loading"),
    error: $("#error"),
    retry: $("#retry-btn"),
    warningBadge: $("#warning-badge"),
    warningCount: $("#warning-count"),
    filterInput: $("#filter-text"),
    table: $("#episodes-table"),
    thead: $("#episodes-table thead"),
    tbody: $("#table-body"),
    warningBadge: $("#warning-badge"),
    warningCount: $("#warning-count"),
    warningsBtn: $("#warnings-view-btn"),        // NEW
    warningsDialog: $("#warnings-dialog"),       
    warningsList: $("#warnings-list"),           
    warningsClose: $("#warnings-close"),         
  };

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    bindEvents();
    loadData();
  }

  function bindEvents() {
    // Retry button
    els.retry?.addEventListener("click", () => {
        setStatus('loading');
        loadData();
    els.warningsBtn?.addEventListener("click", () => {
        renderWarningsList();
        els.warningsDialog?.showModal();
    });
    els.warningsClose?.addEventListener("click", () => {
        els.warningsDialog?.close();
});

    });


    // Sorting: click or Enter on headers
    els.thead?.addEventListener("click", onHeaderActivate);
    els.thead?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const th = e.target.closest("th[data-col]");
        if (th) {
          onHeaderActivate({ target: th });
          e.preventDefault();
        }
      }
    });

    // Filter (debounced)
    const debounced = debounce(() => {
      applyFilter();
      render();
    }, 250);
    els.filterInput?.addEventListener("input", debounced);
  }

  // -----------------------------
  // Data loading
  // -----------------------------
async function loadData() {
  const job = ++loadJobId;          // token for THIS load
  setWarnings(0);                   // reset validation badge
  setStatus("loading");             // show only loading

  try {
    const episodes = await fetchAllData();
    if (job !== loadJobId) return;  // stale → do nothing

    state.raw = Array.isArray(episodes) ? episodes : [];
    state.rows = state.raw.map(normalizeEpisode);
    validateEpisodes(state.rows);
    applyFilter();
    applySort(state.sort.key, state.sort.dir);
    render();

    if (job !== loadJobId) return;
    setStatus("ready");             // hide loading & error
  } catch (err) {
    console.warn("[Fetch] multi-URL failed, trying single URL…", err);

    try {
      const single = await fetchJSON(SINGLE_URL);
      if (job !== loadJobId) return;

      const episodes = Array.isArray(single)
        ? single
        : Array.isArray(single?.episodes) ? single.episodes : [];
      if (!episodes.length) throw new Error("Single file contained no episodes.");

      state.raw = episodes;
      state.rows = state.raw.map(normalizeEpisode);
      validateEpisodes(state.rows);
      applyFilter();
      applySort(state.sort.key, state.sort.dir);
      render();

      if (job !== loadJobId) return;
      setStatus("ready");
    } catch (err2) {
      if (job !== loadJobId) return;
      console.error("[Fetch] single URL failed", err2);
      setStatus("error", "Couldn’t load episodes. Please check your connection and try again.");
    }
  }
}



async function fetchAllData() {
  const results = await Promise.allSettled(MULTI_URLS.map(fetchJSON));
  const fulfilled = results.filter(r => r.status === "fulfilled").map(r => r.value);

  // Flatten correctly whether the loader returned {episodes:[...]} or [...]
  const merged = fulfilled.flatMap(obj =>
    Array.isArray(obj) ? obj :
    Array.isArray(obj?.episodes) ? obj.episodes : []
  );

  const rejected = results.filter(r => r.status === "rejected");
  if (rejected.length) {
    console.warn(`[Fetch] Some sources failed: ${rejected.length}/${results.length}`);
  }
  if (!merged.length) {
    throw new Error("All multi-URL fetches failed or contained no episodes.");
  }
  return merged;
}


  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  // -----------------------------
  // Validation (Tier 3 option)
  // -----------------------------
  function validateEpisodes(rows) {
  const today = new Date();
  const seenRanks = new Set();
  const list = []; // collect details

  const pushWarn = (code, ep, msg) => {
    list.push({
      code,                               // short code: 'missing', 'future_date', etc.
      title: ep.title || "—",
      rank: isNum(ep.rank) ? ep.rank : "—",
      message: msg
    });
  };

  for (const ep of rows) {
    // Missing essentials (soft rules)
    const missing = [];
    if (!isNum(ep.rank)) missing.push("rank");
    if (!ep.title) missing.push("title");
    if (!ep._rawDateStr) missing.push("broadcast_date");
    if (missing.length) {
      pushWarn("missing", ep, `Missing: ${missing.join(", ")}`);
      console.warn(`[Validation] Missing fields for "${ep.title ?? "?"}" (rank ${ep.rank ?? "?"}): ${missing.join(", ")}`);
    }

    // Future broadcast date
    if (ep._sortTime && ep._sortTime > today.getTime()) {
      pushWarn("future_date", ep, `Future date: ${ep._rawDateStr}`);
      console.warn(`[Validation] Future broadcast date for "${ep.title}" (rank ${ep.rank}): ${ep._rawDateStr}`);
    }

    // Duplicate rank (only if rank is a valid number)
    if (isNum(ep.rank)) {
      if (seenRanks.has(ep.rank)) {
        pushWarn("duplicate_rank", ep, `Duplicate rank: ${ep.rank}`);
        console.warn(`[Validation] Duplicate rank detected: ${ep.rank} ("${ep.title}")`);
      } else {
        seenRanks.add(ep.rank);
      }
    } else {
      // already handled as "missing rank"
    }

    // Negative series only (text like "Special" is OK)
    if (isNum(ep.series) && ep.series < 0) {
      pushWarn("negative_series", ep, `Negative series: ${ep.series}`);
      console.warn(`[Validation] Negative series number for "${ep.title}": ${ep.series}`);
    }
  }

  state.warningsList = list;       // save details
  setWarnings(list.length);        // update badge + button
}


  // -----------------------------
  // Normalize + parsing
  // -----------------------------
function normalizeEpisode(raw) {
  const writerStr = safeText(raw?.writer);
  const writers = writerStr
    ? writerStr.split(/\s*(?:,|&|and)\s*/i).map(w => w.trim()).filter(Boolean)
    : [];

  const { displayYear, sortTimestamp } = parseBroadcastDate(safeText(raw?.broadcast_date));

  const rawSeries = raw?.series;
  const seriesNum = Number.isFinite(Number(rawSeries)) ? Number(rawSeries) : NaN;
  const seriesDisplay = Number.isFinite(seriesNum) ? seriesNum : safeText(rawSeries) || "—";

  return {
    _rawDateStr: safeText(raw?.broadcast_date),
    _sortTime: sortTimestamp,

    rank: Number(raw?.rank),
    title: safeText(raw?.title),
    series: seriesNum,            // numeric for sorting
    seriesDisplay,                // shown in the table
    era: safeText(raw?.era),
    broadcastYear: displayYear,
    director: safeText(raw?.director),
    writer: writers.length ? writers.join(" & ") : "—",
    doctor: joinDisplay(safeText(raw?.doctor?.actor), safeText(raw?.doctor?.incarnation)),
    companion: raw?.companion == null
      ? "—"
      : joinDisplay(safeText(raw?.companion?.actor), safeText(raw?.companion?.character)),
    castCount: Array.isArray(raw?.cast) ? raw.cast.length : 0,
  };
}

   

  function joinDisplay(a, b) {
    const A = a || "—";
    const B = b || "";
    return B ? `${A} (${B})` : `${A}`;
  }

  // Accepts: "YYYY-MM-DD", "DD/MM/YYYY", "Month DD, YYYY", "YYYY"
  function parseBroadcastDate(str) {
    let displayYear = "—";
    let ts = 0;

    if (!str) return { displayYear, sortTimestamp: ts };

    const trimmed = String(str).trim();

    // Year only
    const yearOnly = /^\d{4}$/.test(trimmed);
    if (yearOnly) {
      displayYear = trimmed;
      ts = new Date(Number(trimmed), 0, 1).getTime();
      return { displayYear, sortTimestamp: isFinite(ts) ? ts : 0 };
    }

    // ISO YYYY-MM-DD
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (iso) {
      const d = new Date(trimmed);
      if (!isNaN(d)) {
        displayYear = String(d.getFullYear());
        return { displayYear, sortTimestamp: d.getTime() };
      }
    }

    // DD/MM/YYYY
    const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (slash) {
      const [ , dd, mm, yyyy ] = slash;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d)) {
        displayYear = String(d.getFullYear());
        return { displayYear, sortTimestamp: d.getTime() };
      }
    }

    // Month DD, YYYY (let Date.parse try it)
    const d2 = new Date(trimmed);
    if (!isNaN(d2)) {
      displayYear = String(d2.getFullYear());
      return { displayYear, sortTimestamp: d2.getTime() };
    }

    // Last resort: try to grab any 4-digit year
    const y = trimmed.match(/\b(\d{4})\b/);
    if (y) {
      displayYear = y[1];
      ts = new Date(Number(y[1]), 0, 1).getTime();
    }
    return { displayYear, sortTimestamp: isFinite(ts) ? ts : 0 };
  }

  // -----------------------------
  // Filtering & sorting
  // -----------------------------
  function applyFilter() {
    const term = (els.filterInput?.value || "").trim().toLowerCase();
    if (!term) {
      state.filtered = state.rows.slice();
      return;
    }
    state.filtered = state.rows.filter((ep) => ep.title.toLowerCase().includes(term));
  }

  function onHeaderActivate(evt) {
    const th = evt.target.closest("th[data-col]");
    if (!th) return;
    const key = th.getAttribute("data-col");

    // Toggle direction if same column, otherwise default to asc
    if (state.sort.key === key) {
      state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
    } else {
      state.sort.key = key;
      state.sort.dir = "asc";
    }
    applySort(state.sort.key, state.sort.dir);
    render();
  }

  function applySort(key, dir) {
    const sign = dir === "asc" ? 1 : -1;

    const cmpText = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }) * sign;
    const cmpNum = (a, b) => (a - b) * sign;

    const getVal = (row) => {
      switch (key) {
        case "rank": return toNum(row.rank);
        case "series": return toNum(row.series);
        case "broadcastYear": return toNum(row.broadcastYear) || toNum(new Date(row._sortTime).getFullYear());
        case "castCount": return toNum(row.castCount);
        default: return String(row[key] ?? "");
      }
    };

    state.filtered.sort((A, B) => {
      const a = getVal(A);
      const b = getVal(B);

      if (typeof a === "number" && typeof b === "number" && !isNaN(a) && !isNaN(b)) {
        const r = cmpNum(a, b);
        if (r !== 0) return r;
      } else {
        const r = cmpText(String(a), String(b));
        if (r !== 0) return r;
      }
      // tie-break by rank asc
      return (toNum(A.rank) - toNum(B.rank)) * (dir === "asc" ? 1 : -1);
    });

    updateAriaSort(key, dir);
  }

  function updateAriaSort(activeKey, dir) {
    $$("#episodes-table thead th[data-col]").forEach((th) => {
      const key = th.getAttribute("data-col");
      th.setAttribute("aria-sort", key === activeKey ? (dir === "asc" ? "ascending" : "descending") : "none");
    });
  }

  // -----------------------------
  // Render
  // -----------------------------
 function render() {
  const tbody = document.getElementById("table-body");
  if (!tbody) return;
  tbody.textContent = ""; // clear

  for (const ep of state.filtered) {
    const tr = document.createElement("tr");

    // ORDER MUST MATCH THE THEAD:
    // Rank, Title, Series, Era, Broadcast Year, Director, Writer, Doctor, Companion, Cast Count
    cell(tr, ep.rank,         true);                    // Rank (right)
    cell(tr, ep.title);                                 // Title
    cell(tr, ep.seriesDisplay ?? ep.series, true);      // Series (right) (handles "Special")
    cell(tr, ep.era || "—");                            // Era
    cell(tr, ep.broadcastYear || "—", true);            // Broadcast Year (right)
    cell(tr, ep.director || "—");                       // Director
    cell(tr, ep.writer || "—");                         // Writer
    cell(tr, ep.doctor || "—");                         // Doctor
    cell(tr, ep.companion || "—");                      // Companion
    cell(tr, isFinite(ep.castCount) ? ep.castCount : 0, true); // Cast Count (right)

    tbody.appendChild(tr);
  }

  if (!state.filtered.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 10;
    td.textContent = "No episodes match your search.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

function cell(tr, value, rightAlign = false) {
  const td = document.createElement("td");
  if (rightAlign) td.classList.add("col-r");
  td.textContent = (value == null || value === "") ? "—" : String(value);
  tr.appendChild(td);
}



  function appendCell(tr, value, opts = {}) {
    const td = document.createElement("td");
    if (opts.right) td.classList.add("col-r");

    // For era, we can add a pill look by wrapping span with class (matches existing CSS)
    if (opts.asPill) {
      const span = document.createElement("span");
      span.className = "pill";
      span.textContent = value ?? "—";
      td.appendChild(span);
    } else if (typeof value === "string" && /^<span class="pill/.test(value)) {
      // if already formatted (not used here)
      td.innerHTML = value;
    } else {
      td.textContent = value == null || value === "" ? "—" : String(value);
    }

    tr.appendChild(td);
  }

  function formatEra(era) {
    // We'll render plain text; your HTML example had CSS classes .pill.* if you want to upgrade:
    // You can switch to pill by using appendCell with opts.asPill and adding class by era.
    return era || "—";
  }

  // -----------------------------
  // UI helpers
  // -----------------------------
  function setLoading(is) {
    if (!els.loading) return;
    els.loading.hidden = !is;
  }

  function setError(is, msg) {
    if (!els.error) return;
    els.error.hidden = !is;
    if (is && msg) els.error.textContent = msg;
  }

  function renderWarningsList() {
  if (!els.warningsList) return;
  els.warningsList.textContent = "";

  if (!state.warningsList?.length) {
    const li = document.createElement("li");
    li.textContent = "No warnings 🎉";
    els.warningsList.appendChild(li);
    return;
  }

  for (const w of state.warningsList) {
    const li = document.createElement("li");
    li.style.margin = "6px 0";
    li.textContent = `[${w.code}] "${w.title}" (rank ${w.rank}) — ${w.message}`;
    els.warningsList.appendChild(li);
  }
}


    function setWarnings(n) {
    state.warnings = n;
     if (els.warningCount) els.warningCount.textContent = String(n);
    if (els.warningBadge) els.warningBadge.hidden = n <= 0;
    if (els.warningsBtn) els.warningsBtn.hidden = n <= 0;
    }


  function setStatus(mode, msg = "") {
  // modes: 'loading' | 'error' | 'ready'
  if (els.loading) els.loading.hidden = mode !== 'loading';
  if (els.error) {
    els.error.hidden = mode !== 'error';
    if (mode === 'error' && msg) els.error.textContent = msg;
  }
}


  // -----------------------------
  // Utils
  // -----------------------------
  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function safeText(v) {
    return (v == null ? "" : String(v));
  }

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  function isNum(v) {
    return typeof v === "number" && Number.isFinite(v);
  }

  // Start!
  document.addEventListener("DOMContentLoaded", init);
})();
