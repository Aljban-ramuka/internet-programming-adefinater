const tableBody = document.querySelector("#episodes-table tbody");
const searchInput = document.getElementById("search-input");
const sortButton = document.getElementById("sort-button");
const loading = document.getElementById("loading");
const error = document.getElementById("error");

let episodes = [];
let sortAsc = true;

async function fetchEpisodes() {
  loading.classList.remove("hidden");
  error.classList.add("hidden");

  try {
    // ✅ Local mock data with 10 episodes
    episodes = [
      {
        rank: 1,
        title: "Rose",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-03-26",
        director: "Keith Boak",
        writer: "Russell T Davies",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper"]
      },
      {
        rank: 2,
        title: "The End of the World",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-04-02",
        director: "Euros Lyn",
        writer: "Russell T Davies",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "Zoë Wanamaker"]
      },
      {
        rank: 3,
        title: "Dalek",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-04-30",
        director: "Joe Ahearne",
        writer: "Robert Shearman",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "Corey Johnson"]
      },
      {
        rank: 4,
        title: "Father's Day",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-05-14",
        director: "Joe Ahearne",
        writer: "Paul Cornell",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "Shaun Dingwall"]
      },
      {
        rank: 5,
        title: "The Empty Child",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-05-21",
        director: "James Hawes",
        writer: "Steven Moffat",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "John Barrowman"]
      },
      {
        rank: 6,
        title: "The Doctor Dances",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-05-28",
        director: "James Hawes",
        writer: "Steven Moffat",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "John Barrowman"]
      },
      {
        rank: 7,
        title: "Boom Town",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-06-04",
        director: "Joe Ahearne",
        writer: "Russell T Davies",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "Annette Badland"]
      },
      {
        rank: 8,
        title: "Bad Wolf",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-06-11",
        director: "Joe Ahearne",
        writer: "Russell T Davies",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "Jo Joyner"]
      },
      {
        rank: 9,
        title: "The Parting of the Ways",
        series: "1",
        era: "Revival",
        broadcast_date: "2005-06-18",
        director: "Joe Ahearne",
        writer: "Russell T Davies",
        doctor: { actor: "Christopher Eccleston", incarnation: "Ninth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["Christopher Eccleston", "Billie Piper", "John Barrowman"]
      },
      {
        rank: 10,
        title: "The Christmas Invasion",
        series: "2",
        era: "Revival",
        broadcast_date: "2005-12-25",
        director: "James Hawes",
        writer: "Russell T Davies",
        doctor: { actor: "David Tennant", incarnation: "Tenth" },
        companion: { actor: "Billie Piper", character: "Rose Tyler" },
        cast: ["David Tennant", "Billie Piper", "Camille Coduri"]
      }
    ];

    renderTable(episodes);
  } catch (err) {
    error.textContent = `Failed to load episodes: ${err.message}`;
    error.classList.remove("hidden");
    console.error("Fetch error:", err);
  } finally {
    loading.classList.add("hidden");
  }
}

function renderTable(data) {
  tableBody.innerHTML = "";

  data.forEach(ep => {
    const row = document.createElement("tr");

    const companion = ep.companion
      ? `${ep.companion.actor} (${ep.companion.character})`
      : "—";

    const doctor = ep.doctor
      ? `${ep.doctor.actor} (${ep.doctor.incarnation})`
      : "—";

    const writers = ep.writer
      ? ep.writer.replace(/&|and/gi, ",")
      : "—";

    const broadcastYear = parseBroadcastYear(ep.broadcast_date);
    const castCount = Array.isArray(ep.cast) ? ep.cast.length : 0;

    row.innerHTML = `
      <td>${ep.rank ?? "—"}</td>
      <td>${sanitize(ep.title)}</td>
      <td>${ep.series ?? "—"}</td>
      <td>${ep.era ?? "—"}</td>
      <td>${broadcastYear}</td>
      <td>${ep.director ?? "—"}</td>
      <td>${writers}</td>
      <td>${doctor}</td>
      <td>${companion}</td>
      <td>${castCount}</td>
    `;
    tableBody.appendChild(row);
  });
}

function sanitize(text) {
  return text?.replace(/["']/g, "") ?? "—";
}

function parseBroadcastYear(date) {
  if (!date) return "—";
  const match = date.match(/\d{4}/);
  return match ? match[0] : "—";
}

function applyFilters() {
  const term = searchInput.value.toLowerCase();
  const filtered = episodes.filter(ep =>
    ep.title?.toLowerCase().includes(term)
  );
  renderTable(filtered);
}

function toggleSort() {
  episodes.sort((a, b) => {
    const titleA = a.title?.toLowerCase() ?? "";
    const titleB = b.title?.toLowerCase() ?? "";
    return sortAsc ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
  });
  sortAsc = !sortAsc;
  renderTable(episodes);
}

searchInput.addEventListener("input", applyFilters);
sortButton.addEventListener("click", toggleSort);

fetchEpisodes();
