// src/screens/intro.js
import { histoires } from '../data/fixtures.js';
import * as tts from '../tts.js';

let _navigate = null;
let _currentHistoireId = null;

// DOM refs — cached une seule fois
let _bgImg, _bgPlaceholder, _loadingEl, _badgeEl, _titleEl, _subtitleEl;
let _btnBack, _btnPrimary;

export function initIntro(navigate) {
  _navigate = navigate;

  _bgImg         = document.getElementById('intro-bg-img');
  _bgPlaceholder = document.querySelector('#screen-intro .intro-bg__placeholder');
  _loadingEl     = document.querySelector('#screen-intro .intro-loading');
  _badgeEl       = document.getElementById('intro-badge');
  _titleEl       = document.getElementById('intro-title');
  _subtitleEl    = document.getElementById('intro-subtitle');
  _btnBack       = document.getElementById('intro-btn-back');
  _btnPrimary    = document.getElementById('intro-btn-primary');

  _btnBack.addEventListener('click', () => _navigate('home'));
  _btnPrimary.addEventListener('click', _onListen);
}

export function showIntro(histoireId) {
  _currentHistoireId = histoireId;

  const histoire = histoires.find(h => h.id === histoireId) || histoires[0];

  // Mettre à jour les textes
  _badgeEl.textContent    = `~${histoire.dureeEstimee} min`;
  _titleEl.textContent    = histoire.titre;
  _subtitleEl.textContent = histoire.sousTitre;
  _btnPrimary.setAttribute('aria-label', `Écouter l'histoire ${histoire.titre}`);

  // Charger l'image de fond
  if (histoire.imageIntro) {
    const bg = _bgImg.closest('.intro-bg');
    bg.classList.add('intro-bg--loading');

    _bgImg.onload  = () => bg.classList.remove('intro-bg--loading');
    _bgImg.onerror = () => {
      bg.classList.remove('intro-bg--loading');
      _bgImg.style.display = 'none';
    };
    _bgImg.style.display = '';
    _bgImg.src = histoire.imageIntro;
  } else {
    _bgImg.style.display = 'none';
  }

  // Réactiver le bouton s'il était en état loading
  _btnPrimary.classList.remove('btn-primary--loading');
}

function _onListen() {
  if (!_currentHistoireId) return;

  // iOS Safari : prime TTS dans le contexte du gesture
  tts.prime();

  _btnPrimary.classList.add('btn-primary--loading');
  _navigate('reader', _currentHistoireId);
}
