document.addEventListener("DOMContentLoaded", () => {
  const nameFilter = document.getElementById("name-filter");
  const eraFilter = document.getElementById("era-filter");
  const doctorFilter = document.getElementById("doctor-filter");
  const companionFilter = document.getElementById("companion-filter");
  const episodesBody = document.getElementById("episodes-body");
  const loading = document.getElementById("loading");
  const noResults = document.getElementById("no-results");
  const table = document.getElementById("episodes-table");
  const warningsDiv = document.getElementById("warnings");

  let episodes = [];
  let filteredEpisodes = [];
  let sortColumn = "rank";
  let sortDirection = 1;

  const DATA_URLS = [
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-01-10.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-11-20.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-21-30.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-31-40.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-41-50.json",
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-51-65.json"
  ];
  const SINGLE_URL =
    "https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json";
  const LOCAL_FALLBACK = "doctor-who-episodes-full.json";

  /* ---------- Load Data ---------- */
  async function loadEpisodes() {
    try {
      loading.style.display = "block";
      table.style.display = "none";

      let all = [];
      for (const url of DATA_URLS) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Segmented fetch failed");
        const json = await resp.json();
        all.push(...(json.episodes ?? json));
      }
      episodes = cleanEpisodes(all);
      console.log(`✅ Loaded ${episodes.length} episodes (multi-source)`);
    } catch (err) {
      console.warn("⚠ Multi-source failed, trying fallback...", err);
      try {
        const resp = await fetch(SINGLE_URL);
        if (!resp.ok) throw new Error("Full file fetch failed");
        const json = await resp.json();
        episodes = cleanEpisodes(json.episodes ?? json);
      } catch {
        try {
          const resp = await fetch(LOCAL_FALLBACK);
          const json = await resp.json();
          episodes = cleanEpisodes(json.episodes ?? json);
        } catch (finalErr) {
          document.getElementById("error").textContent =
            "Failed to load episodes. Please run using Live Server.";
          document.getElementById("error").style.display = "block";
          console.error(finalErr);
          return;
        }
      }
    }

    filteredEpisodes = [...episodes];
    populateFilters();
    renderTable(filteredEpisodes);
    validateEpisodes(episodes);
    loading.style.display = "none";
    table.style.display = "table";
  }

  /* ---------- Cleaning ---------- */
  function cleanEpisodes(list) {
    return list.map(e => ({
      rank: e.rank ?? "—",
      title: e.title?.replace(/[<>]/g, "") || "Untitled",
      series: e.series ?? "—",
      era: e.era ?? "—",
      year: extractYear(e.broadcast_date),
      director: e.director ?? "—",
      writer: e.writer?.replace(/ and /gi, " & ") || "—",
      doctor: e.doctor
        ? `${e.doctor.actor} (${e.doctor.incarnation})`
        : "—",
      companion: e.companion
        ? `${e.companion.actor} (${e.companion.character})`
        : "—",
      cast: Array.isArray(e.cast) ? e.cast.length : 0
    }));
  }

  function extractYear(dateStr) {
    if (!dateStr) return "—";
    const patterns = [
      { regex: /^\d{4}-\d{2}-\d{2}$/, fn: d => d.split("-")[0] },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, fn: d => d.split("/")[2] },
      { regex: /^[A-Za-z]+ \d{2}, \d{4}$/, fn: d => d.split(", ")[1] },
      { regex: /^\d{4}$/, fn: d => d }
    ];
    for (const { regex, fn } of patterns) if (regex.test(dateStr)) return fn(dateStr);
    return "—";
  }

  /* ---------- Filters ---------- */
  function populateFilters() {
    const doctors = [...new Set(episodes.map(e => e.doctor))].sort();
    const companions = [...new Set(episodes.map(e => e.companion))].sort();

    doctors.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      doctorFilter.appendChild(opt);
    });
    companions.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      companionFilter.appendChild(opt);
    });
  }

  function filterEpisodes() {
    const term = nameFilter.value.toLowerCase();
    filteredEpisodes = episodes.filter(ep =>
      (!term || ep.title.toLowerCase().includes(term)) &&
      (!eraFilter.value || ep.era === eraFilter.value) &&
      (!doctorFilter.value || ep.doctor === doctorFilter.value) &&
      (!companionFilter.value || ep.companion === companionFilter.value)
    );
    renderTable(filteredEpisodes);
  }

  [nameFilter, eraFilter, doctorFilter, companionFilter].forEach(el => {
    el.addEventListener("input", filterEpisodes);
    el.addEventListener("change", filterEpisodes);
  });

  /* ---------- Rendering ---------- */
  function renderTable(data) {
    episodesBody.innerHTML = "";
    if (data.length === 0) {
      noResults.style.display = "block";
      table.style.display = "none";
      return;
    }
    noResults.style.display = "none";
    table.style.display = "table";

    data.forEach(ep => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${ep.rank}</td>
        <td>${ep.title}</td>
        <td>${ep.series}</td>
        <td>${ep.era}</td>
        <td>${ep.year}</td>
        <td>${ep.director}</td>
        <td>${ep.writer}</td>
        <td>${ep.doctor}</td>
        <td>${ep.companion}</td>
        <td>${ep.cast}</td>`;
      episodesBody.appendChild(tr);
    });
  }

  /* ---------- Sorting ---------- */
  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      sortDirection = sortColumn === col ? -sortDirection : 1;
      sortColumn = col;

      filteredEpisodes.sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av < bv) return -1 * sortDirection;
        if (av > bv) return 1 * sortDirection;
        return 0;
      });

      renderTable(filteredEpisodes);
      updateSortIndicators(col);
    });
  });

  function updateSortIndicators(activeCol) {
    document.querySelectorAll("th").forEach(th =>
      th.classList.remove("sort-asc", "sort-desc")
    );
    const th = document.querySelector(`th[data-sort="${activeCol}"]`);
    if (th) th.classList.add(sortDirection === 1 ? "sort-asc" : "sort-desc");
  }

  /* ---------- CSV Export ---------- */
  document.getElementById("export-csv").addEventListener("click", () => {
    if (filteredEpisodes.length === 0) return;
    const headers = Object.keys(filteredEpisodes[0]);
    const csv = [
      headers.join(","),
      ...filteredEpisodes.map(e => headers.map(h => `"${e[h]}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "doctor_who_episodes.csv";
    a.click();
  });

  /* ---------- Validation ---------- */
  function validateEpisodes(list) {
    const warnings = [];
    const seenRanks = new Set();

    list.forEach((e, i) => {
      if (!e.title) warnings.push(`Episode ${i + 1}: Missing title`);
      if (seenRanks.has(e.rank)) warnings.push(`Duplicate rank: ${e.rank}`);
      seenRanks.add(e.rank);
      if (e.rank < 0) warnings.push(`Negative rank: ${e.rank}`);
      if (Number(e.series) < 0) warnings.push(`Negative series: ${e.series}`);
    });

    if (warnings.length > 0) {
      warningsDiv.innerHTML = `
        ⚠ ${warnings.length} data warnings found
        <button id="toggle-warn">Show Details</button>
        <div id="warn-details" style="display:none;">
          ${warnings.map(w => `<div>${w}</div>`).join("")}
        </div>`;
      warningsDiv.style.display = "block";

      document.getElementById("toggle-warn").addEventListener("click", () => {
        const det = document.getElementById("warn-details");
        const show = det.style.display === "none";
        det.style.display = show ? "block" : "none";
        document.getElementById("toggle-warn").textContent = show
          ? "Hide Details"
          : "Show Details";
      });
    }
  }

  /* ---------- Start ---------- */
  loadEpisodes();
});
