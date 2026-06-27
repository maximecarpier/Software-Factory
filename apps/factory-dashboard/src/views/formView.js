// M-F1 : vue formulaire de création d'un item backlog

import { validateItem, createItem } from '../model.js';
import { add } from '../store.js';
import { showToast } from '../components/toast.js';

/**
 * Injecte le formulaire de création dans le conteneur fourni.
 * @param {HTMLElement} container — typiquement #app
 */
export function renderForm(container) {
  container.innerHTML = `
    <div class="form-container">
      <h1>Nouvel item</h1>
      <form id="item-form" novalidate>

        <div class="field-group">
          <label for="field-type">Type <span class="required" aria-hidden="true">*</span></label>
          <select id="field-type" name="type" autocomplete="off">
            <option value="">-- Choisir un type --</option>
            <option value="projet">Projet</option>
            <option value="feature">Feature</option>
          </select>
          <span class="field-error" id="error-type" role="alert"></span>
        </div>

        <div class="field-group">
          <label for="field-titre">Titre <span class="required" aria-hidden="true">*</span></label>
          <input
            type="text"
            id="field-titre"
            name="titre"
            placeholder="Titre de l'item (max 100 caractères)"
            autocomplete="off"
          />
          <span class="field-error" id="error-titre" role="alert"></span>
        </div>

        <div class="field-group">
          <label for="field-description">Description</label>
          <textarea
            id="field-description"
            name="description"
            rows="4"
            placeholder="Description facultative (max 1 000 caractères)"
          ></textarea>
          <span class="field-error" id="error-description" role="alert"></span>
        </div>

        <div class="field-group">
          <label for="field-priorite">Priorité <span class="required" aria-hidden="true">*</span></label>
          <select id="field-priorite" name="priorite" autocomplete="off">
            <option value="">-- Choisir une priorité --</option>
            <option value="haute">Haute</option>
            <option value="moyenne">Moyenne</option>
            <option value="basse">Basse</option>
          </select>
          <span class="field-error" id="error-priorite" role="alert"></span>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">Enregistrer</button>
        </div>

      </form>
    </div>
  `;

  const form = document.getElementById('item-form');
  form.addEventListener('submit', handleSubmit);
}

/**
 * Efface tous les messages d'erreur inline.
 */
function clearErrors() {
  ['type', 'titre', 'description', 'priorite'].forEach(field => {
    const el = document.getElementById(`error-${field}`);
    if (el) el.textContent = '';
  });
}

/**
 * Affiche les erreurs de validation sous les champs concernés.
 * @param {Object.<string, string>} errors
 */
function displayErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const el = document.getElementById(`error-${field}`);
    if (el) el.textContent = message;
  });
}

/**
 * Handler de soumission du formulaire.
 * Valide, crée, persiste, redirige, affiche le toast.
 */
function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  const form = e.target;
  const data = {
    type: form.type.value,
    titre: form.titre.value,
    description: form.description.value || null,
    priorite: form.priorite.value,
  };

  const { ok, errors } = validateItem(data);

  if (!ok) {
    displayErrors(errors);
    // Focus sur le premier champ en erreur
    const firstErrorField = Object.keys(errors)[0];
    const el = document.getElementById(`field-${firstErrorField}`);
    if (el) el.focus();
    return;
  }

  const item = createItem(data);
  add(item);

  // Réinitialise le formulaire
  form.reset();

  // Redirige vers le backlog puis affiche le toast
  // (le toast est déclenché après le hashchange pour être visible sur la vue F2)
  window.location.hash = '#/backlog';
  showToast('Item ajouté au backlog.');
}
