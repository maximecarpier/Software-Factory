// M-SHELL : point d'entrée — initialise la nav et le routeur

import './style.css';
import { renderNav } from './components/nav.js';
import { initRouter } from './router.js';

renderNav();
initRouter();
