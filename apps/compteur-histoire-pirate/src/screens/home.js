// src/screens/home.js
import { histoires } from '../data/fixtures.js';

const ANCHOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <circle cx="12" cy="5" r="3"/>
  <line x1="12" y1="22" x2="12" y2="8"/>
  <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
</svg>`;

let _navigate = null;
let _initialized = false;

export function initHome(navigate) {
  _navigate = navigate;
  if (_initialized) return;
  _initialized = true;

  const list = document.getElementById('stories-list');
  if (!list) return;

  list.innerHTML = histoires.map(renderCard).join('');

  // Délégation d'événement sur la liste
  list.addEventListener('click', _onCardClick);
  list.addEventListener('keydown', _onCardKeydown);
}

function _onCardClick(e) {
  const card = e.target.closest('.story-card');
  if (!card) return;
  _navigate('intro', card.dataset.id);
}

function _onCardKeydown(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.story-card');
  if (!card) return;
  e.preventDefault();
  _navigate('intro', card.dataset.id);
}

function renderCard(histoire) {
  return `
    <li>
      <article class="story-card"
               tabindex="0"
               role="button"
               data-id="${histoire.id}"
               aria-label="${histoire.titre}, environ ${histoire.dureeEstimee} minutes">
        <div class="story-card__cover">
          <div class="story-card__placeholder" aria-hidden="true">
            ${ANCHOR_SVG}
          </div>
          <img
            src="${histoire.imageVignette || ''}"
            alt=""
            class="story-card__img"
            loading="lazy"
            onerror="this.style.display='none'"
          >
          <span class="story-card__badge">~${histoire.dureeEstimee} min</span>
        </div>
        <div class="story-card__body">
          <h2 class="story-card__title">${histoire.titre}</h2>
        </div>
      </article>
    </li>
  `;
}
