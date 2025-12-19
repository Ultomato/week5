const gallery      = document.querySelector("#gallery");
const statusEl     = document.querySelector("#status");

const mediumSelect = document.querySelector("#mediumSelect");
const sortSelect   = document.querySelector("#sortSelect");
const showImages   = document.querySelector("#showImages");

// Source data (never mutate)
let data = [];

// App state (single source of truth for UI)
const state = {
  medium: "All",
  sort: "yearAsc",
  images: true
};

init();

async function init() {
  showStatus("Loading…");

  try {
    const res = await fetch("data/artworks.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();

    // 1) Read URL params -> state
    hydrateStateFromURL();

    // 2) Build UI from data + state
    populateMediumOptions(data);
    applyStateToControls();

    // 3) Render based on state
    updateView();

    // 4) Wire event handlers
    wireControls();

    hideStatus();
  } catch (err) {
    console.error(err);
    showStatus("Failed to load data.", true);
  }
}

function wireControls() {
  mediumSelect.addEventListener("change", () => {
    state.medium = mediumSelect.value;
    syncURLFromState();
    updateView();
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    syncURLFromState();
    updateView();
  });

  showImages.addEventListener("change", () => {
    state.images = showImages.checked;
    syncURLFromState();
    updateView();
  });
}

/* ---------- State <-> URL ---------- */

function hydrateStateFromURL() {
  const params = new URLSearchParams(location.search);

  // medium: string
  state.medium = params.get("medium") ?? "All";

  // sort: one of known values
  state.sort = params.get("sort") ?? "yearAsc";

  // images: "1" or "0" (default true)
  const img = params.get("images");
  state.images = img === null ? true : img === "1";
}

function syncURLFromState() {
  const params = new URLSearchParams();

  // Only include non-defaults (keeps URL clean)
  if (state.medium !== "All") params.set("medium", state.medium);
  if (state.sort !== "yearAsc") params.set("sort", state.sort);
  if (state.images !== true) params.set("images", "0");

  const newUrl = `${location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
  history.replaceState(null, "", newUrl);
}

/* ---------- Controls ---------- */

function populateMediumOptions(list) {
  // gather unique mediums
  const mediums = Array.from(new Set(list.map(a => a.medium))).sort((a,b) => a.localeCompare(b));

  // keep "All" and rebuild others
  mediumSelect.innerHTML = `<option value="All">All</option>`;
  mediums.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    mediumSelect.appendChild(opt);
  });
}

function applyStateToControls() {
  // If URL asked for a medium not in data, fall back to All
  const mediumValues = Array.from(mediumSelect.options).map(o => o.value);
  if (!mediumValues.includes(state.medium)) state.medium = "All";

  mediumSelect.value = state.medium;
  sortSelect.value = state.sort;
  showImages.checked = state.images;
}

/* ---------- View pipeline ---------- */

function updateView() {
  let view = data.slice();

  // filter
  if (state.medium !== "All") {
    view = view.filter(a => a.medium === state.medium);
  }

  // sort
  view = sortByState(view);

  render(view);
}

function sortByState(list) {
  const a = list.slice();

  switch (state.sort) {
    case "yearAsc":
      return a.sort((x, y) => x.year - y.year);
    case "yearDesc":
      return a.sort((x, y) => y.year - x.year);
    case "titleAsc":
      return a.sort((x, y) => x.title.toLowerCase().localeCompare(y.title.toLowerCase()));
    case "titleDesc":
      return a.sort((x, y) => y.title.toLowerCase().localeCompare(x.title.toLowerCase()));
    default:
      return a;
  }
}

/* ---------- Render ---------- */

function render(list) {
  gallery.innerHTML = "";

  if (!list.length) {
    gallery.textContent = "No artworks match this view.";
    return;
  }

  list.forEach(art => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.borderColor = art.color || "#1bb694";

    const imgHtml = (state.images && art.image)
      ? `<img class="thumb" src="${art.image}" alt="" loading="lazy">`
      : "";

    card.innerHTML = `
      ${imgHtml}
      <h3>${art.title}</h3>
      <p><b>Medium:</b> ${art.medium}</p>
      <p><b>Year:</b> ${art.year}</p>
    `;

    gallery.appendChild(card);
  });
}

/* ---------- Status helpers ---------- */

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "tomato" : "#333";
  statusEl.classList.add("show");
}

function hideStatus() {
  statusEl.classList.remove("show");
}
