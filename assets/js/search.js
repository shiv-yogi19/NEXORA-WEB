// NEXORA search — Created By Shiv Yogi
// The search screen itself is the shared filterable browser in media.js (real server-side
// filtering, sorting and pagination). This module only adds the quick-search entry point.
import { navigate } from './router.js';
export { searchScreen } from './media.js';

export function quickSearch(text) {
  const q = String(text || '').trim();
  navigate('/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
}
