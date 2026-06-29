const DataService = {
  STORAGE_KEY: "op_data",
  STORAGE_TIMESTAMP_KEY: "op_data_timestamp",
  data: [],

  async fetchData() {
    const cached = localStorage.getItem(this.STORAGE_KEY);
    if (cached) {
      this.data = JSON.parse(cached);
      return this.data;
    }

    try {
      const response = await fetch("data/one-piece.json");
      const data = await response.json();
      this.data = data;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(this.STORAGE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      this.data = [];
    }

    return this.data;
  },

  getData() {
    return this.data;
  },

  async refreshData() {
    const response = await fetch(`data/one-piece.json?t=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    this.data = data;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(this.STORAGE_TIMESTAMP_KEY, Date.now().toString());
    return this.data;
  },
};

const ProgressService = {
  STORAGE_KEY: "op_current_arc",

  setCurrentArc(arcId) {
    localStorage.setItem(this.STORAGE_KEY, arcId);
  },

  getCurrentArcId() {
    return localStorage.getItem(this.STORAGE_KEY);
  },
};

const SummaryService = {
  keyEpisode(number) {
    return `op_summary_ep_${number}`;
  },

  keyArc(id) {
    return `op_summary_arc_${id}`;
  },

  getCached(key) {
    return localStorage.getItem(key) || null;
  },

  saveToCache(key, text) {
    localStorage.setItem(key, text);
  },

  async callGemini(prompt) {
    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error("Erreur API Gemini");
    const data = await res.json();
    return data.text;
  },

  async generateForEpisode(number, title) {
    const prompt = `Donne-moi un résumé en français de l'épisode ${number} de One Piece intitulé "${title}". En 3-4 phrases maximum, décris ce qui s'y passe sans spoiler les arcs suivants.`;
    return await this.callGemini(prompt);
  },

  async generateForArc(arcName, episodes) {
    const first = episodes[0].number;
    const last = episodes[episodes.length - 1].number;
    const prompt = `Donne-moi un résumé en français de l'arc filler "${arcName}" de One Piece (épisodes ${first} à ${last}). En 5-6 phrases maximum, décris les grandes lignes sans spoiler la suite.`;
    return await this.callGemini(prompt);
  },
};

const FilterEngine = {
  applyFilters(arcs, activeFilters) {
    return arcs.filter((arc) => activeFilters.includes(arc.type));
  },
};

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

const UIRenderer = {
  allArcs: [],
  activeFilters: ["canon", "filler", "mixte"],

  renderArcList(arcs) {
    this.allArcs = arcs;
    this.activeFilters = ["canon", "filler", "mixte"];
    const app = document.getElementById("app");
    app.innerHTML = `
      <header class="app-header">
        🏴‍☠️ One Piece Tracker
        <button id="refresh-btn" class="refresh-button" title="Actualiser les épisodes" aria-label="Actualiser les épisodes">⟳</button>
      </header>
      <input type="search" id="search" placeholder="Rechercher un arc...">
      <div class="filter-bar">
        <button class="filter-btn active" data-filter="canon">Canon</button>
        <button class="filter-btn active" data-filter="filler">Filler</button>
        <button class="filter-btn active" data-filter="mixte">Mixte</button>
        <button id="reset-filters" class="reset-btn">Réinitialiser</button>
      </div>
      <div id="arc-list"></div>
    `;
    this.refresh({ scrollToCurrent: true });

    document.getElementById("search").addEventListener("input", () => this.refresh());

    document.getElementById("refresh-btn").addEventListener("click", async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      btn.classList.add("spinning");
      try {
        const data = await DataService.refreshData();
        this.renderArcList(data);
      } finally {
        btn.disabled = false;
        btn.classList.remove("spinning");
      }
    });

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.filter;
        if (this.activeFilters.includes(type)) {
          this.activeFilters = this.activeFilters.filter((t) => t !== type);
          btn.classList.remove("active");
        } else {
          this.activeFilters.push(type);
          btn.classList.add("active");
        }
        this.refresh();
      });
    });

    document.getElementById("reset-filters").addEventListener("click", () => {
      this.activeFilters = ["canon", "filler", "mixte"];
      document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.add("active"));
      document.getElementById("search").value = "";
      this.refresh();
    });
  },

  refresh(options = {}) {
    const query = document.getElementById("search").value.toLowerCase();
    const byType = FilterEngine.applyFilters(this.allArcs, this.activeFilters);
    const filtered = byType.filter((arc) => arc.name.toLowerCase().includes(query));
    this.renderCards(filtered, options);
  },

  renderCards(arcs, options = {}) {
    const currentArcId = ProgressService.getCurrentArcId();
    const list = document.getElementById("arc-list");
    list.innerHTML = arcs
      .map(
        (arc) => `
      <div class="arc-card type-${arc.type} ${arc.id === currentArcId ? "current-arc" : ""}" data-arc-id="${arc.id}">
        <div class="arc-card-row arc-card-main">
          <span class="arc-name">${arc.name}</span>
          <span class="badge badge-${arc.type}">${arc.type}</span>
          <span class="chevron">▶</span>
        </div>
        <div class="arc-card-row arc-card-footer">
          <span class="arc-episode-count">${arc.episodes.length} épisodes</span>
          <button class="mark-current-btn" data-arc-id="${arc.id}">⚓ Je suis ici</button>
        </div>
        ${
          arc.type === "filler"
            ? `
        <div class="arc-card-row summary-row">
          <button class="btn-summary-arc" data-arc-id="${arc.id}" data-arc-name="${escapeAttr(arc.name)}">
            ${SummaryService.getCached(SummaryService.keyArc(arc.id)) ? "💾" : "📖"} Résumé de l'arc
          </button>
        </div>
        <div class="summary-block" id="summary-arc-${arc.id}" style="display:none"></div>
        `
            : ""
        }
      </div>
    `
      )
      .join("");

    list.querySelectorAll(".arc-card-main").forEach((row) => {
      row.addEventListener("click", () => {
        const card = row.closest(".arc-card");
        const arc = arcs.find((a) => a.id === card.dataset.arcId);
        this.renderArcDetail(arc);
      });
    });

    list.querySelectorAll(".mark-current-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        ProgressService.setCurrentArc(btn.dataset.arcId);
        this.refresh();
      });
    });

    if (!list.dataset.summaryBound) {
      list.dataset.summaryBound = "true";
      list.addEventListener("click", async (event) => {
        const btn = event.target.closest(".btn-summary-arc");
        if (!btn) return;
        event.stopPropagation();

        const arcId = btn.dataset.arcId;
        const arcName = btn.dataset.arcName;
        const arc = this.allArcs.find((a) => a.id === arcId);
        const key = SummaryService.keyArc(arcId);
        const block = document.getElementById(`summary-arc-${arcId}`);

        const cached = SummaryService.getCached(key);
        if (cached) {
          block.innerHTML = cached;
          block.style.display = block.style.display === "none" ? "block" : "none";
          return;
        }

        if (!navigator.onLine) {
          block.innerHTML = "📶 Connexion requise pour générer ce résumé";
          block.style.display = "block";
          return;
        }

        btn.disabled = true;
        btn.textContent = "⏳ Génération…";
        try {
          const text = await SummaryService.generateForArc(arcName, arc.episodes);
          SummaryService.saveToCache(key, text);
          block.innerHTML = text;
          block.style.display = "block";
          btn.textContent = "💾 Résumé de l'arc";
          btn.disabled = false;
        } catch {
          block.innerHTML = "❌ Résumé indisponible";
          block.style.display = "block";
          btn.textContent = "📖 Résumé de l'arc";
          btn.disabled = false;
        }
      });
    }

    if (options.scrollToCurrent) {
      const currentCard = list.querySelector(".arc-card.current-arc");
      if (currentCard) currentCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },

  renderArcDetail(arc) {
    const app = document.getElementById("app");
    app.innerHTML = `
      <header class="app-header detail-header">
        <button id="back-button" class="back-button">← Retour</button>
        <span class="arc-detail-name">${arc.name}</span>
      </header>
      <div id="episode-list">
        ${arc.episodes
          .map(
            (episode) => `
          <div class="episode-row">
            <span class="episode-number">#${episode.number}</span>
            <span class="episode-title">${episode.title}</span>
            <span class="badge badge-${episode.type}">${episode.type}</span>
          </div>
          ${
            episode.type === "filler"
              ? `
          <div class="summary-row">
            <button class="btn-summary" data-ep-number="${episode.number}" data-ep-title="${escapeAttr(episode.title)}">
              ${SummaryService.getCached(SummaryService.keyEpisode(episode.number)) ? "💾" : "📖"} Résumé
            </button>
          </div>
          <div class="summary-block" id="summary-ep-${episode.number}" style="display:none"></div>
          `
              : ""
          }
        `
          )
          .join("")}
      </div>
    `;
    document.getElementById("back-button").addEventListener("click", () => {
      this.renderArcList(this.allArcs);
    });

    document.getElementById("episode-list").addEventListener("click", async (event) => {
      const btn = event.target.closest(".btn-summary");
      if (!btn) return;

      const number = btn.dataset.epNumber;
      const title = btn.dataset.epTitle;
      const key = SummaryService.keyEpisode(number);
      const block = document.getElementById(`summary-ep-${number}`);

      const cached = SummaryService.getCached(key);
      if (cached) {
        block.innerHTML = cached;
        block.style.display = block.style.display === "none" ? "block" : "none";
        return;
      }

      if (!navigator.onLine) {
        block.innerHTML = "📶 Connexion requise pour générer ce résumé";
        block.style.display = "block";
        return;
      }

      btn.disabled = true;
      btn.textContent = "⏳ Génération…";
      try {
        const text = await SummaryService.generateForEpisode(number, title);
        SummaryService.saveToCache(key, text);
        block.innerHTML = text;
        block.style.display = "block";
        btn.textContent = "💾 Résumé";
        btn.disabled = false;
      } catch {
        block.innerHTML = "❌ Résumé indisponible";
        block.style.display = "block";
        btn.textContent = "📖 Résumé";
        btn.disabled = false;
      }
    });
  },
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

DataService.fetchData().then(() => {
  UIRenderer.renderArcList(DataService.getData());
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DataService, ProgressService, SummaryService, FilterEngine, escapeAttr };
}
