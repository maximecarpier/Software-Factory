// M-F1 : vue formulaire — création ET édition d'un item backlog

import { validateItem, createItem } from '../model.js';
import { load, add, update, remove } from '../store.js';
import { showToast } from '../components/toast.js';

// ID de l'item en cours d'édition (null = mode création)
let _editId = null;

/**
 * Échappe les caractères HTML spéciaux pour les valeurs d'attributs et de texte.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Injecte (ou réinjecte) le select du projet parent dans le wrapper dédié.
 * En l'absence de projets, affiche un message d'avertissement à la place.
 * @param {string} selectedProjectId - ID pré-sélectionné (peut être '')
 */
function renderProjectSelect(selectedProjectId) {
  const wrapper = document.getElementById('project-select-wrapper');
  if (!wrapper) return;

  const projects = load().items.filter(i => i.type === 'projet');

  if (projects.length === 0) {
    wrapper.innerHTML = `
      <p class="warning-message">Aucun projet disponible. Créez d'abord un projet.</p>
    `;
    return;
  }

  const options = projects
    .map(p =>
      `<option value="${escapeHtml(p.id)}" ${selectedProjectId === p.id ? 'selected' : ''}>${escapeHtml(p.titre)}</option>`
    )
    .join('');

  wrapper.innerHTML = `
    <select id="field-project" name="projectId" autocomplete="off">
      <option value="">-- Choisir un projet --</option>
      ${options}
    </select>
  `;
}

/**
 * Initialise les toggle buttons d'un groupe : clic → exclusif.
 * @param {string} groupId
 * @param {Function|null} onChange - callback(value) à chaque changement
 */
function initToggleGroup(groupId, onChange) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onChange) onChange(btn.dataset.value);
    });
  });
}

/**
 * Injecte le formulaire (création ou édition) dans le conteneur fourni.
 * @param {HTMLElement} container — typiquement #app
 * @param {string|null} editId — ID de l'item à éditer, ou null pour la création
 */
export function renderForm(container, editId = null) {
  _editId = editId || null;

  const { items } = load();
  const editingItem = _editId ? items.find(i => i.id === _editId) : null;

  // Item introuvable → fallback création
  if (_editId && !editingItem) {
    _editId = null;
    window.location.hash = '#/new';
    return;
  }

  const isEditing = Boolean(editingItem);
  const title = isEditing ? "Modifier l'item" : 'Nouvel item';
  const submitLabel = isEditing ? 'Enregistrer les modifications' : 'Enregistrer';

  // Valeurs pré-remplies (défauts en création)
  const currentType = isEditing ? editingItem.type : 'feature';
  const currentTitre = isEditing ? editingItem.titre : '';
  const currentDesc = isEditing ? (editingItem.description || '') : '';
  const currentPrio = isEditing ? editingItem.priorite : 'moyenne';
  const currentStatut = isEditing ? (editingItem.statut || 'à faire') : 'à faire';
  const currentProjectId = isEditing ? (editingItem.projectId || '') : '';
  const currentUrl = isEditing ? (editingItem.url || '') : '';

  // Visibilité initiale des champs conditionnels
  const projectGroupStyle = currentType === 'feature' ? 'flex' : 'none';
  const urlGroupStyle = currentType === 'projet' ? 'flex' : 'none';

  // Classes actives pour les toggles
  const typeFeatureActive = currentType === 'feature' ? 'active' : '';
  const typeProjetActive  = currentType === 'projet'  ? 'active' : '';

  const prioHauteActive   = currentPrio === 'haute'   ? 'active' : '';
  const prioMoyenneActive = currentPrio === 'moyenne' ? 'active' : '';
  const prioBaisseActive  = currentPrio === 'basse'   ? 'active' : '';

  const statutAFaireActive  = currentStatut === 'à faire'  ? 'active' : '';
  const statutEnCoursActive = currentStatut === 'en cours' ? 'active' : '';
  const statutTermineActive = currentStatut === 'terminé'  ? 'active' : '';

  container.innerHTML = `
    <div class="form-container">
      <h1>${escapeHtml(title)}</h1>
      <form id="item-form" novalidate>

        <div class="form-section">
          <label class="form-label">TYPE</label>
          <div class="toggle-group" id="toggle-type">
            <button type="button" class="toggle-btn ${typeFeatureActive}" data-value="feature">Feature</button>
            <button type="button" class="toggle-btn ${typeProjetActive}" data-value="projet">Projet</button>
          </div>
        </div>

        <div class="field-group" id="field-group-project" style="display: ${projectGroupStyle}">
          <label for="field-project">Projet parent <span class="required" aria-hidden="true">*</span></label>
          <div id="project-select-wrapper"></div>
          <span class="field-error" id="error-projectId" role="alert"></span>
        </div>

        <div class="field-group">
          <label for="field-titre">Titre <span class="required" aria-hidden="true">*</span></label>
          <input
            type="text"
            id="field-titre"
            name="titre"
            placeholder="Titre de l'item"
            autocomplete="off"
            value="${escapeHtml(currentTitre)}"
          />
          <span class="field-error" id="error-titre" role="alert"></span>
        </div>

        <div class="field-group">
          <label for="field-description">Description</label>
          <textarea
            id="field-description"
            name="description"
            rows="4"
            placeholder="Description facultative"
          >${escapeHtml(currentDesc)}</textarea>
          <span class="field-error" id="error-description" role="alert"></span>
        </div>

        <div class="field-group" id="field-group-url" style="display: ${urlGroupStyle}">
          <label for="field-url">URL du projet</label>
          <input
            type="url"
            id="field-url"
            name="url"
            placeholder="https://..."
            autocomplete="off"
            value="${escapeHtml(currentUrl)}"
          />
        </div>

        <div class="form-section">
          <label class="form-label">PRIORITÉ</label>
          <div class="toggle-group" id="toggle-priorite">
            <button type="button" class="toggle-btn ${prioHauteActive}"   data-value="haute">Haute</button>
            <button type="button" class="toggle-btn ${prioMoyenneActive}" data-value="moyenne">Moyenne</button>
            <button type="button" class="toggle-btn ${prioBaisseActive}"  data-value="basse">Basse</button>
          </div>
        </div>

        <div class="form-section" id="section-statut" style="display:${isEditing ? 'block' : 'none'}">
          <label class="form-label">STATUT</label>
          <div class="toggle-group" id="toggle-statut">
            <button type="button" class="toggle-btn ${statutAFaireActive}"  data-value="à faire">À faire</button>
            <button type="button" class="toggle-btn ${statutEnCoursActive}" data-value="en cours">En cours</button>
            <button type="button" class="toggle-btn ${statutTermineActive}" data-value="terminé">Terminé</button>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">${escapeHtml(submitLabel)}</button>
          ${isEditing ? `<a href="#/backlog" class="btn-secondary form-cancel">Annuler</a>` : ''}
        </div>

        <div id="section-delete" style="display:${isEditing ? 'block' : 'none'}">
          <hr class="form-divider">
          <button type="button" id="btn-delete-item" class="btn-danger">
            ⚠ Supprimer cet item
          </button>
        </div>

      </form>
    </div>
  `;

  // Initialiser le select projet si le type courant est 'feature'
  if (currentType === 'feature') {
    renderProjectSelect(currentProjectId);
  }

  // Toggle TYPE → affiche/masque les champs conditionnels
  initToggleGroup('toggle-type', (value) => {
    const projectGroupEl = document.getElementById('field-group-project');
    const urlGroupEl = document.getElementById('field-group-url');
    if (value === 'feature') {
      projectGroupEl.style.display = 'flex';
      renderProjectSelect('');
      if (urlGroupEl) urlGroupEl.style.display = 'none';
    } else if (value === 'projet') {
      projectGroupEl.style.display = 'none';
      if (urlGroupEl) urlGroupEl.style.display = 'flex';
    } else {
      projectGroupEl.style.display = 'none';
      if (urlGroupEl) urlGroupEl.style.display = 'none';
    }
    const errEl = document.getElementById('error-projectId');
    if (errEl) errEl.textContent = '';
  });

  initToggleGroup('toggle-priorite', null);
  initToggleGroup('toggle-statut', null);

  // Bouton supprimer (édition uniquement)
  const deleteBtn = document.getElementById('btn-delete-item');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('Supprimer cet item définitivement ?')) {
        remove(_editId);
        showToast('Item supprimé', 'info');
        window.location.hash = '#/backlog';
      }
    });
  }

  const form = document.getElementById('item-form');
  form.addEventListener('submit', handleSubmit);
}

/**
 * Efface tous les messages d'erreur inline.
 */
function clearErrors() {
  ['type', 'projectId', 'titre', 'description', 'priorite'].forEach(field => {
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
 * Valide, persiste localement (immédiat), redirige, puis pousse vers GitHub (async).
 */
async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  const form = e.target;
  const type     = document.querySelector('#toggle-type .toggle-btn.active')?.dataset.value     || 'feature';
  const priorite = document.querySelector('#toggle-priorite .toggle-btn.active')?.dataset.value || 'moyenne';
  const statut   = document.querySelector('#toggle-statut .toggle-btn.active')?.dataset.value   || 'à faire';
  const projectIdEl = document.getElementById('field-project');

  const data = {
    type,
    titre: form.elements['titre']?.value ?? '',
    description: form.elements['description']?.value || null,
    priorite,
    projectId: projectIdEl ? projectIdEl.value : undefined,
    url: form.elements['url']?.value?.trim() || null,
  };

  // Validation — passe allItems pour vérifier le projet parent des features
  const { items: allItems } = load();
  const { ok, errors } = validateItem(data, allItems);

  if (!ok) {
    displayErrors(errors);
    // Focus sur le premier champ en erreur
    const firstField = Object.keys(errors)[0];
    const focusId = firstField === 'projectId' ? 'field-project' : `field-${firstField}`;
    const el = document.getElementById(focusId);
    if (el) el.focus();
    return;
  }

  if (_editId) {
    // ── Mode édition : store.update gère save + enqueue + flush ──
    const existing = allItems.find(i => i.id === _editId);
    if (!existing) return;
    const updatedItem = {
      id: existing.id,
      type: data.type,
      titre: data.titre.trim(),
      description: data.description && data.description.trim() !== '' ? data.description.trim() : null,
      priorite: data.priorite,
      statut,
      createdAt: existing.createdAt,
    };
    updatedItem.url = data.url || null;
    if (data.type === 'feature' && data.projectId) {
      updatedItem.projectId = data.projectId;
    }
    update(updatedItem);
    window.location.hash = '#/backlog';
    showToast('Item modifié.');
  } else {
    // ── Mode création : store.add gère save + enqueue + flush ──
    const newItem = createItem(data);
    add(newItem);
    form.reset();
    // Masquer le champ projet après reset
    const groupEl = document.getElementById('field-group-project');
    if (groupEl) groupEl.style.display = 'none';
    window.location.hash = '#/backlog';
    showToast('Item ajouté au backlog.');
  }
}
