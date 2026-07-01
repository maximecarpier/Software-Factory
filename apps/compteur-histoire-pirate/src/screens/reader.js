// src/screens/reader.js
import { histoires } from '../data/fixtures.js';
import * as tts from '../tts.js';

let _navigate = null;
let _histoire = null;
let _isPlaying = false;
let _autoplayTimer = null;
let _endTimer = null;
let _lastToggleTime = 0;

// DOM refs — cachées une seule fois
let _titleEl, _bannerEl, _paragraphsEl, _progressFill;
let _btnBack, _btnPlayPause, _btnRestart;

export function initReader(navigate) {
  _navigate = navigate;

  _titleEl      = document.getElementById('reader-title');
  _bannerEl     = document.getElementById('reader-banner');
  _paragraphsEl = document.getElementById('reader-paragraphs');
  _progressFill = document.getElementById('reader-progress-fill');
  _btnBack      = document.getElementById('reader-btn-back');
  _btnPlayPause = document.getElementById('reader-btn-playpause');
  _btnRestart   = document.getElementById('reader-btn-restart');

  _btnBack.addEventListener('click', _onBack);
  _btnPlayPause.addEventListener('click', _onTogglePlay);
  _btnRestart.addEventListener('click', _onRestart);

  // iOS : mettre en pause si l'app passe en arrière-plan
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && _isPlaying) _doPause();
  });
}

export function showReader(histoireId) {
  // Annuler les timers pendants de la session précédente
  clearTimeout(_autoplayTimer);
  clearTimeout(_endTimer);

  _histoire = histoires.find(h => h.id === histoireId) || histoires[0];
  _isPlaying = false;

  // Mettre à jour le titre
  _titleEl.textContent = _histoire.titre;

  // Rendre les paragraphes
  _paragraphsEl.innerHTML = _histoire.paragraphes
    .map((text, i) => `<p class="para para--upcoming" data-index="${i}">${text}</p>`)
    .join('');

  // Reset barre de progression
  _progressFill.style.width = '0%';

  // Reset bouton play/pause
  _setPlayState(false);

  // Scroll en haut
  document.getElementById('reader-content').scrollTop = 0;

  // TTS disponible ?
  if (!window.speechSynthesis) {
    _bannerEl.classList.add('reader-banner--visible');
    return;
  }
  _bannerEl.classList.remove('reader-banner--visible');

  // Initialiser TTS
  tts.initTTS(_histoire.paragraphes, _onParagraphChange, _onTTSEnd);

  // Autoplay après 1s (délai pour laisser la transition écran se terminer)
  _autoplayTimer = setTimeout(() => {
    tts.play();
    _setPlayState(true);
  }, 1000);
}

export function hideReader() {
  clearTimeout(_autoplayTimer);
  clearTimeout(_endTimer);
  tts.stop();
  _setPlayState(false);
}

// ── Handlers ────────────────────────────────────

function _onBack() {
  clearTimeout(_autoplayTimer);
  clearTimeout(_endTimer);
  tts.stop();
  _setPlayState(false);
  _navigate('home');
}

function _onTogglePlay() {
  const now = Date.now();
  if (now - _lastToggleTime < 300) return; // debounce 300ms
  _lastToggleTime = now;

  if (_isPlaying) {
    _doPause();
  } else {
    _doPlay();
  }
}

function _onRestart() {
  clearTimeout(_endTimer);
  _setPlayState(true);
  tts.restart();
  document.getElementById('reader-content').scrollTop = 0;
}

// ── TTS callbacks ────────────────────────────────

function _onParagraphChange(index) {
  if (index === -1) {
    // TTS indisponible
    _bannerEl.classList.add('reader-banner--visible');
    return;
  }

  const paras = _paragraphsEl.querySelectorAll('.para');

  paras.forEach((el, i) => {
    el.classList.remove('para--past', 'para--current', 'para--upcoming');
    el.removeAttribute('aria-current');
    if (i < index) {
      el.classList.add('para--past');
    } else if (i === index) {
      el.classList.add('para--current');
      el.setAttribute('aria-current', 'true');
      // Scroll automatique
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.classList.add('para--upcoming');
    }
  });

  // Barre de progression
  const pct = Math.round(((index + 1) / _histoire.paragraphes.length) * 100);
  _progressFill.style.width = pct + '%';
}

function _onTTSEnd() {
  _setPlayState(false);
  _progressFill.style.width = '100%';
  _endTimer = setTimeout(() => {
    _navigate('end', _histoire.id);
  }, 1500);
}

// ── Helpers ──────────────────────────────────────

function _doPlay() {
  tts.play();
  _setPlayState(true);
}

function _doPause() {
  tts.pause();
  _setPlayState(false);
}

function _setPlayState(playing) {
  _isPlaying = playing;
  if (playing) {
    _btnPlayPause.classList.add('is-playing');
    _btnPlayPause.setAttribute('aria-label', 'Mettre en pause');
    _btnPlayPause.setAttribute('aria-pressed', 'true');
  } else {
    _btnPlayPause.classList.remove('is-playing');
    _btnPlayPause.setAttribute('aria-label', 'Reprendre la lecture');
    _btnPlayPause.setAttribute('aria-pressed', 'false');
  }
}
