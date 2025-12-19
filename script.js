const gallery   = document.querySelector("#gallery");
const statusEl  = document.querySelector("#status");

const sortBtn   = document.querySelector("#sortYear");
const filterBtn = document.querySelector("#filterDigital");
const shuffleBtn= document.querySelector("#shuffle");
const resetBtn  = document.querySelector("#reset");

let data = [];  // full dataset from JSON
let view = [];  // what we're currently showing

init(); // standard entry point

async function init() {
  showStatus("Loading artworks…");
  try {
    const res = await fetch("data/artworks.json");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    data = await res.json();
    // Apply URL filter if present eg http://127.0.0.1:5500/index.html?medium=Digital
    const params = new URLSearchParams(location.search);
    const mediumFilter = params.get("medium");

    if (mediumFilter) {
    view = data.filter(a => a.medium === mediumFilter);
    } else {
    view = data.slice();
    }
    render(view);
    hideStatus();

  } catch (err) {
    console.error(err);
    showStatus("Failed to load artworks.", true);
  }
}

function render(list) {
  gallery.innerHTML = "";

  if (!list.length) {
    gallery.textContent = "No artworks match this view.";
    return;
  }

  list.forEach(art => {
    const card = document.createElement("div");
    card.className = "card";

    card.style.setProperty("--bg-image", art.image ? `url(${art.image})` : "none");

    card.innerHTML = `
      <div class="card-body">
        <h3>${art.title}</h3>
        <p>${art.medium} • ${art.year}</p>
      </div>
    `;

    gallery.appendChild(card);
  });
}

// Status helpers
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "tomato" : "#333";
  statusEl.classList.add("show");
}

function hideStatus() {
  statusEl.classList.remove("show");
}

// Button event handlers____________________________________
// Sort by year (ascending)
sortBtn.addEventListener("click", () => {
  view = view.slice().sort((a, b) => a.year - b.year);
  render(view);
});

// Filter to Digital medium only
filterBtn.addEventListener("click", () => {
  view = data.filter(a => a.medium === "Digital");
  render(view);
});

// Shuffle current view
shuffleBtn.addEventListener("click", () => {
  view = shuffleArray(view);
  render(view);
});

// Reset to original data
resetBtn.addEventListener("click", () => {
  view = data.slice();
  render(view);
});

// Fisher–Yates shuffle (returns a new array)
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
