const gallery = document.querySelector("#gallery");
const statusEl = document.querySelector("#status");

const mediumSelect = document.querySelector("#mediumSelect");
const sortSelect = document.querySelector("#sortSelect");
const showImages = document.querySelector("#showImages");
const countLine = document.querySelector("#countLine");
const meterFill = document.querySelector("#meterFill");
const percentLine = document.querySelector("#percentLine");
const activeFilters = document.querySelector("#activeFilters");
const clearFilters = document.querySelector("#clearFilters");
const mediumCounts = document.querySelector("#mediumCounts");
const mediumCheckboxes = document.querySelector("#mediumCheckboxes");

// Source data (never mutate)
let data = [];

// App state (single source of truth for UI)
const state = {
  mediums: [], // for checkbox filtering.
  //medium: "All", //original
  sort: "yearAsc",
  images: true,
};

init();

async function init() {
  showStatus("Loading…");

  try {
    const res = await fetch("data/artworks.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error(err);
    showStatus("Failed to load data.", true);
  }
  // 1) Read URL params -> state
  hydrateStateFromURL();

  // 2) Build UI from data + state
  populateMediumOptions(data); // this is a bit redundant with line below and could be removed
  populateMediumCheckboxes(data);
  applyStateToControls();
  updateMediumCounts();

  // 3) Render based on state
  updateView();

  // 4) Wire event handlers
  wireControls();

  hideStatus();
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

  clearFilters.addEventListener("click", () => {
    state.medium = "All";
    state.sort = "yearAsc";
    state.images = true;

    applyStateToControls();
    syncURLFromState();
    updateView();
  });
}

/* ---------- State <-> URL ---------- */

function hydrateStateFromURL() {
  const params = new URLSearchParams(location.search);

  // medium: string
  //state.medium = params.get("medium") ?? "All"; //original for drop-down only
  const mediumParam = params.get("mediums");
  state.mediums = mediumParam ? mediumParam.split(",") : [];

  // sort: one of known values
  state.sort = params.get("sort") ?? "yearAsc";

  // images: "1" or "0" (default true)
  const img = params.get("images");
  state.images = img === null ? true : img === "1";
}

function syncURLFromState() {
  const params = new URLSearchParams();

  // Only include non-defaults (keeps URL clean)
  // if (state.medium !== "All") params.set("medium", state.medium); //original for drop-down filter only
  if (state.mediums.length) {
    params.set("mediums", state.mediums.join(","));
  }
  if (state.sort !== "yearAsc") params.set("sort", state.sort);
  if (state.images !== true) params.set("images", "0");

  const newUrl = `${location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
  history.replaceState(null, "", newUrl);
}

/* ---------- Controls ---------- */

function populateMediumOptions(list) {
  // gather unique mediums
  const mediums = Array.from(new Set(list.map((a) => a.medium))).sort((a, b) =>
    a.localeCompare(b),
  );

  // keep "All" and rebuild others
  mediumSelect.innerHTML = `<option value="All">All</option>`;
  mediums.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    mediumSelect.appendChild(opt);
  });
}

function applyStateToControls() {
  // If URL asked for a medium not in data, fall back to All
  const mediumValues = Array.from(mediumSelect.options).map((o) => o.value);
  if (!mediumValues.includes(state.medium)) state.medium = "All";

  mediumSelect.value = state.medium;
  sortSelect.value = state.sort;
  showImages.checked = state.images;
}

/* ---------- View pipeline ---------- */

function updateView() {
  let view = data.slice();

  // original filter for drop-down only
  // if (state.medium !== "All") {
  //   view = view.filter((a) => a.medium === state.medium);
  // }
  // replacement for checkbox filter
  if (state.mediums.length) {
    view = view.filter((a) => state.mediums.includes(a.medium));
  }

  // sort
  view = sortByState(view);
  updateSummary(view);

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
      return a.sort((x, y) =>
        x.title.toLowerCase().localeCompare(y.title.toLowerCase()),
      );
    case "titleDesc":
      return a.sort((x, y) =>
        y.title.toLowerCase().localeCompare(x.title.toLowerCase()),
      );
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

  list.forEach((art) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.borderColor = art.color || "#1bb694";

    const imgHtml =
      state.images && art.image
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

function updateSummary(view) {
  // 1) X of Y
  countLine.textContent = `Showing ${view.length} of ${data.length} artworks`;
  const pct = data.length ? (view.length / data.length) * 100 : 0;
  meterFill.style.width = `${pct}%`;
  percentLine.textContent = `${Math.round(pct)}% of artworks showing`;

  // 2) Active filter summary
  const parts = [];

  if (state.medium === "All") parts.push("Medium: All");
  else parts.push(`Medium: ${state.medium}`);

  parts.push(`Sort: ${labelSort(state.sort)}`);

  parts.push(state.images ? "Images: On" : "Images: Off");

  activeFilters.textContent = parts.join(" | ");
}

function labelSort(sortKey) {
  switch (sortKey) {
    case "yearAsc":
      return "Year ↑";
    case "yearDesc":
      return "Year ↓";
    case "titleAsc":
      return "Title A→Z";
    case "titleDesc":
      return "Title Z→A";
    default:
      return sortKey;
  }
}

function updateMediumCounts() {
  const counts = {};

  data.forEach((art) => {
    counts[art.medium] = (counts[art.medium] || 0) + 1;
  });

  const parts = Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([medium, count]) => `${medium} (${count})`);

  mediumCounts.textContent = parts.join(" | ");
}

function populateMediumCheckboxes(list) {
  const mediums = Array.from(new Set(list.map((a) => a.medium))).sort((a, b) =>
    a.localeCompare(b),
  );

  mediumCheckboxes.innerHTML = "";

  mediums.forEach((medium) => {
    const label = document.createElement("label");
    label.style.marginRight = "0.75rem";

    label.innerHTML = `
      <input type="checkbox" value="${medium}">
      ${medium}
    `;

    const input = label.querySelector("input");

    input.checked = state.mediums.includes(medium);

    input.addEventListener("change", () => {
      const checkedValues = Array.from(
        mediumCheckboxes.querySelectorAll("input:checked"),
      ).map((input) => input.value);

      state.mediums = checkedValues;
      syncURLFromState();
      updateView();
    });

    mediumCheckboxes.appendChild(label);
  });
}
