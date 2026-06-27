// M-STORE : persistance localStorage + garde-fou intégrité (specs §6.3, §6.4)

const KEY = 'factory_backlog';

/**
 * Vérifie qu'un objet a la forme minimale attendue d'un item backlog.
 */
function isValidItem(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.titre === 'string' &&
    typeof item.priorite === 'string' &&
    typeof item.createdAt === 'string'
  );
}

/**
 * Charge les items depuis localStorage.
 * Si le contenu est absent → retourne un tableau vide.
 * Si le contenu est corrompu ou de forme invalide → reset silencieux + corrupted=true.
 * @returns {{ items: Object[], corrupted: boolean }}
 */
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return { items: [], corrupted: false };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidItem)) {
      localStorage.setItem(KEY, JSON.stringify([]));
      return { items: [], corrupted: true };
    }
    return { items: parsed, corrupted: false };
  } catch {
    try {
      localStorage.setItem(KEY, JSON.stringify([]));
    } catch {
      // Quota ou contexte dégradé — on ignore silencieusement
    }
    return { items: [], corrupted: true };
  }
}

/**
 * Retourne tous les items sans le flag corrupted.
 * Raccourci pratique pour les vues qui n'ont pas besoin du flag.
 * @returns {Object[]}
 */
export function getAll() {
  return load().items;
}

/**
 * Ajoute un item au tableau persisté.
 * Charge d'abord le tableau existant, pousse le nouvel item, puis écrit.
 * @param {Object} item
 */
export function add(item) {
  try {
    const { items } = load();
    items.push(item);
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[store] Erreur écriture localStorage:', e);
  }
}

/**
 * Ecrase le stockage avec le tableau fourni.
 * @param {Object[]} items
 */
export function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[store] Erreur écriture localStorage:', e);
  }
}
