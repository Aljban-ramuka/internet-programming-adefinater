/* Doctor Who Episodes Explorer — robust loader + UI */

(() => {
  const cfg = window.APP_CONFIG || {};
  const STRATEGY = cfg.LOAD_STRATEGY || "full";
  const FULL_URL = cfg.FULL_URL;
  const CHUNK_URLS = cfg.CHUNK_URLS || [];
  const DEFAULT_SORT = cfg.defaultSort || { key: "rank", dir: "asc" };

  // DOM
  const tbody = document.getElementById("episodes-tbody");
  const thead = document.querySelector("#episodes-table thead");
  const rowTemplate = document.getElementById("row-template");
  const errorBanner = document.getElementById("error-banner");
  const loadingOverlay = document.getElementById("loading-overlay");
  const resultCount = document.getElementById("result-count");
  const loadStatus = document.getElementById("load-status");

  // Filters
  const fTitle = document.getElementById("filter-title");
  const fEra = document.getElementById("filter-era");
  const fDoctor = document.getElementById("filter-doctor");
  const fCompanion = document.getElementById("filter-companion");
  const fYear = document.getElementById("filter-year");
  const btnReset = document.getElementById("btn-reset");
  const btnExport = document.getElementById("btn-export");

  let allEpisodes = [];
  let viewEpisodes = [];
  let sortState = { ...DEFAULT_SORT };

  /* ---------- UI helpers ---------- */
  const showLoading = (visible) => {
    loadingOverlay.hidden = !visible;
    loadStatus.textContent = visible ? "Loading…" : "";
  };
  const showError = (msg) => {
    console.error(msg);
    errorBanner.textContent = msg;
    errorBanner.hidden = false;
    showLoading(false);
  };
  const clearError = () => {
    errorBanner.hidden = true;
    errorBanner.textContent = "";
  };

  /* ---------- Parsing / normalization ---------- */
  const parseDate = (dstr) => {
    if (!dstr) return null;
    // Supported: YYYY-MM-DD, DD/MM/YYYY, Month DD, YYYY, YYYY
    const fDMY = /^\d{2}\/\d{2}\/\d{4}$/; // 23/11/1963
    const fYear = /^\d{4}$/;
    try {
      if (fDMY.test(dstr)) {
        const [dd, mm, yyyy] = dstr.split("/").map(Number);
        return new Date(yyyy, mm - 1, dd);
      }
      if (fYear.test(dstr)) return new Date(Number(dstr), 0, 1);
      const d = new Date(dstr);
      return isNaN(d) ? null : d;
    } catch {
      return null;
    }
  };
  const extractYear = (dstr) => {
    const d = parseDate(dstr);
    return d ? d.getFullYear() : "";
  };
  const safe = (v, fallback = "—") =>
    v === null || v === undefined || v === "" ? fallback : v;

  const normalizeWriter = (writer) => {
    if (!writer) return "—";
    return String(writer).replace(/\s*(?:&|and)\s*/g, " & ");
  };
  const normalizeDoctor = (d) =>
    d && d.actor && d.incarnation
      ? `${d.actor} (${d.incarnation})`
      : safe(d?.actor || d?.incarnation || "—");
  const normalizeCompanion = (c) =>
    c && c.actor && c.character ? `${c.actor} (${c.character})` : "None";

  // Accept many JSON shapes → always return an array of episode objects.
  const normalizeInput = (json) => {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.episodes)) return json.episodes;
    if (json && Array.isArray(json.data)) return json.data;
    if (json && typeof json === "object") {
      const vals = Object.values(json);
      // If it's an object of episodes keyed by id/rank
      if (vals.length && typeof vals[0] === "object") return vals;
    }
    return [];
  };

  /* ---------- Render ---------- */
  const renderRows = (rows) => {
    tbody.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const ep of rows) {
      const tr = rowTemplate.content.cloneNode(true);
      tr.querySelector(".cell-rank").textContent = ep.rank ?? "—";
      tr.querySelector(".cell-title").textContent = safe(ep.title);
      tr.querySelector(".cell-series").textContent = safe(ep.series);
      tr.querySelector(".cell-era").textContent = safe(ep.era);
      tr.querySelector(".cell-year").textContent = safe(ep.broadcastYear);
      tr.querySelector(".cell-director").textContent = safe(ep.director);
      tr.querySelector(".cell-writer").textContent = safe(ep.writer);
      tr.querySelector(".cell-doctor").textContent = safe(ep.doctorStr);
      tr.querySelector(".cell-companion").textContent = safe(ep.companionStr);
      tr.querySelector(".cell-castcount").textContent = ep.castCount ?? 0;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
    resultCount.textContent = `${rows.length} episode${rows.length === 1 ? "" : "s"}`;
  };

  /* ---------- Filtering ---------- */
  const applyFilters = () => {
    const q = fTitle.value.trim().toLowerCase();
    const era = fEra.value;
    const doc = fDoctor.value;
    const comp = fCompanion.value;
    const yr = fYear.value.trim();

    viewEpisodes = allEpisodes.filter((e) => {
      if (q && !e.title.toLowerCase().includes(q)) return false;
      if (era && e.era !== era) return false;
      if (doc && e.doctorStr !== doc) return false;
      if (comp && e.companionStr !== comp) return false;
      if (yr && String(e.broadcastYear) !== yr) return false;
      return true;
    });
    applySort();
  };
  const resetFilters = () => {
    fTitle.value = "";
    fEra.value = "";
    fDoctor.value = "";
    fCompanion.value = "";
    fYear.value = "";
    sortState = { ...DEFAULT_SORT };
    clearError();
    applyFilters();
  };

  /* ---------- Sorting ---------- */
  const compare = (a, b, key, dir = "asc") => {
    const m = dir === "asc" ? 1 : -1;
    const va = a[key];
    const vb = b[key];
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * m;
    return String(va).localeCompare(String(vb)) * m;
  };
  const applySort = () => {
    viewEpisodes.sort((a, b) => {
      const r = compare(a, b, sortState.key, sortState.dir);
      if (r !== 0) return r;
      return compare(a, b, "title", "asc"); // tiebreak
    });

    document.querySelectorAll("th.sortable").forEach((th) => {
      const key = th.dataset.key;
      const ind = th.querySelector(".sort-indicator");
      if (!ind) return;
      if (key === sortState.key) {
        ind.textContent = sortState.dir === "asc" ? "▲" : "▼";
        th.classList.add("sort-active");
      } else {
        ind.textContent = "▲";
        th.classList.remove("sort-active");
      }
    });

    renderRows(viewEpisodes);
  };
  const handleHeaderClick = (e) => {
    const th = e.target.closest("th.sortable");
    if (!th) return;
    const key = th.dataset.key;
    if (sortState.key === key) sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
    else { sortState.key = key; sortState.dir = "asc"; }
    applySort();
  };

  /* ---------- Dropdowns ---------- */
  const uniqueSorted = (arr) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const populateDropdowns = (episodes) => {
    const doctors = uniqueSorted(episodes.map((e) => e.doctorStr));
    const companions = uniqueSorted(episodes.map((e) => e.companionStr));
    fDoctor.innerHTML =
      '<option value="">All</option>' + doctors.map(d => `<option value="${d}">${d}</option>`).join("");
    fCompanion.innerHTML =
      '<option value="">All</option>' + companions.map(c => `<option value="${c}">${c}</option>`).join("");
  };

  /* ---------- Export CSV ---------- */
  const exportCSV = () => {
    const headers = ["Rank","Title","Series","Era","Broadcast Year","Director","Writer","Doctor","Companion","Cast Count"];
    const lines = [headers.join(",")];
    for (const e of viewEpisodes) {
      const row = [e.rank, e.title, e.series, e.era, e.broadcastYear, e.director, e.writer, e.doctorStr, e.companionStr, e.castCount]
        .map(v => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
        });
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `doctor-who-episodes_${Date.now()}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  /* ---------- Data load ---------- */
  const fetchJSON = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  };

  const fetchAll = async () => {
    clearError();
    showLoading(true);
    try {
      let raw = [];
      if (STRATEGY === "chunks" && CHUNK_URLS.length) {
        for (const u of CHUNK_URLS) {
          const j = await fetchJSON(u);
          raw = raw.concat(normalizeInput(j));
        }
      } else {
        const j = await fetchJSON(FULL_URL);
        raw = normalizeInput(j);
      }
      processData(raw);
    } catch (err) {
      showError(`Failed to load episodes: ${err.message}`);
    } finally {
      showLoading(false);
    }
  };

  const processData = (episodesArr) => {
    if (!Array.isArray(episodesArr)) {
      throw new Error("Data is not an array after normalization");
    }

    allEpisodes = episodesArr.map((e) => {
      const broadcastYear = extractYear(e.broadcast_date);
      const writer = normalizeWriter(e.writer);
      const doctorStr = normalizeDoctor(e.doctor);
      const companionStr = normalizeCompanion(e.companion);
      const castCount = Array.isArray(e.cast) ? e.cast.length : 0;

      return {
        rank: Number(e.rank),
        title: e.title ?? "—",
        series: Number(e.series),
        era: e.era ?? "—",
        broadcastYear,
        director: e.director || "—",
        writer,
        doctorStr,
        companionStr,
        castCount
      };
    });

    populateDropdowns(allEpisodes);
    applyFilters();
  };

  /* ---------- Events ---------- */
  thead.addEventListener("click", handleHeaderClick);
  [fTitle, fEra, fDoctor, fCompanion, fYear].forEach((el) =>
    el.addEventListener("input", applyFilters)
  );
  btnReset.addEventListener("click", resetFilters);
  btnExport.addEventListener("click", exportCSV);

  // Simple keyboard row navigation
  tbody.addEventListener("keydown", (e) => {
    const rows = [...tbody.querySelectorAll("tr")];
    const current = document.activeElement.closest("tr");
    const idx = rows.indexOf(current);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (rows[idx + 1] || rows[0]).focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (rows[idx - 1] || rows[rows.length - 1]).focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
      applySort();
    }
  });

  /* ---------- Init ---------- */
(async () => {
  await fetchAll();
  showLoading(false); // hide overlay
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.remove(); // fully remove it from DOM
})();
})();
