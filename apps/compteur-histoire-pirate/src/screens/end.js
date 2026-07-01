// src/screens/end.js
import { histoires } from '../data/fixtures.js';

let _navigate = null;

// DOM refs — cachées une seule fois
let _messageEl, _imgEl, _btnHome;

export function initEnd(navigate) {
  _navigate = navigate;

  _messageEl = document.getElementById('end-message');
  _imgEl     = document.getElementById('end-illustration-img');
  _btnHome   = document.getElementById('end-btn-home');

  _btnHome.addEventListener('click', () => _navigate('home'));
}

export function showEnd(histoireId) {
  const histoire = histoires.find(h => h.id === histoireId) || histoires[0];

  _messageEl.textContent = histoire.messageFin;

  if (histoire.imageFin) {
    _imgEl.src = histoire.imageFin;
    _imgEl.style.display = '';
  } else {
    _imgEl.style.display = 'none';
  }
}
