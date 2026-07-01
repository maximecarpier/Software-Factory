// src/tts.js
// Web Speech API — fr-FR, vitesse 0.9
// iOS Safari workaround : cancel() plutôt que pause() (pause/resume buggy sur iOS)

const synth = window.speechSynthesis;

let _paragraphes = [];
let _onParagraphChange = null;
let _onEnd = null;
let _currentIndex = 0;
let _isInitialized = false;
let _isPaused = false;
let _isPlaying = false;

/**
 * Prime iOS Safari : appeler dans un gesture handler avant navigate().
 * Déverrouille speechSynthesis pour les appels ultérieurs hors gesture.
 */
export function prime() {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  synth.speak(u);
}

/**
 * Initialise le module avec les paragraphes de l'histoire.
 * N'appelle pas play() — c'est à l'appelant de le faire.
 *
 * @param {string[]} paragraphes
 * @param {(index: number) => void} onParagraphChange — index=-1 si TTS indisponible
 * @param {() => void} onEnd
 */
export function initTTS(paragraphes, onParagraphChange, onEnd) {
  // Nettoyer l'état précédent
  if (synth) synth.cancel();
  _isInitialized = false;
  _isPlaying = false;
  _isPaused = false;
  _currentIndex = 0;

  if (!synth) {
    onParagraphChange(-1);
    return;
  }

  _paragraphes = paragraphes;
  _onParagraphChange = onParagraphChange;
  _onEnd = onEnd;
  _isInitialized = true;
}

export function play() {
  if (!synth || !_isInitialized) return;
  _isPaused = false;
  _isPlaying = true;
  _speakFrom(_currentIndex);
}

export function pause() {
  if (!synth || !_isInitialized || !_isPlaying) return;
  _isPaused = true;
  _isPlaying = false;
  synth.cancel(); // cancel + remember index = iOS-safe pause
}

export function restart() {
  if (!synth || !_isInitialized) return;
  synth.cancel();
  _currentIndex = 0;
  _isPaused = false;
  _isPlaying = true;
  // Small delay after cancel to avoid race on some browsers
  setTimeout(() => _speakFrom(0), 50);
}

export function stop() {
  if (!synth) return;
  synth.cancel();
  _isInitialized = false;
  _isPlaying = false;
  _isPaused = false;
  _currentIndex = 0;
}

export function getIsPlaying() {
  return _isPlaying;
}

export function getCurrentIndex() {
  return _currentIndex;
}

// ── Privé ──────────────────────────────────────

function _speakFrom(index) {
  if (!_isInitialized || _isPaused) return;
  synth.cancel();
  _currentIndex = index;
  // Micro-délai pour laisser cancel() se terminer
  setTimeout(() => _speakCurrent(), 30);
}

function _speakCurrent() {
  if (!_isInitialized || _isPaused || _currentIndex >= _paragraphes.length) return;

  const text = _paragraphes[_currentIndex];
  const idx  = _currentIndex;

  const u = new SpeechSynthesisUtterance(text);
  u.lang  = 'fr-FR';
  u.rate  = 0.9;
  u.pitch = 1.0;

  // Sélectionner la première voix française disponible si possible
  const voices = synth.getVoices();
  const frVoice = voices.find(v => v.lang.startsWith('fr'));
  if (frVoice) u.voice = frVoice;

  u.onstart = () => {
    _onParagraphChange && _onParagraphChange(idx);
  };

  u.onend = () => {
    if (_isPaused || !_isInitialized) return;
    _currentIndex = idx + 1;
    if (_currentIndex >= _paragraphes.length) {
      _isPlaying = false;
      _onEnd && _onEnd();
    } else {
      _speakCurrent();
    }
  };

  u.onerror = (e) => {
    // 'interrupted' = cancel() appelé volontairement, pas une erreur
    if (e.error === 'interrupted') return;
    console.warn('TTS error:', e.error);
  };

  synth.speak(u);
}
