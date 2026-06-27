// M-SHELL : toast de confirmation — affiche un message bref non bloquant

let hideTimer = null;

/**
 * Affiche un toast en bas de l'écran pendant 3 secondes.
 * @param {string} message
 */
export function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  clearTimeout(hideTimer);
  container.textContent = message;
  container.classList.add('toast-visible');

  hideTimer = setTimeout(() => {
    container.classList.remove('toast-visible');
  }, 3000);
}
