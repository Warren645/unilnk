import { useEffect, useState, useSyncExternalStore } from 'react';

export const HOME = { tab: 'browse', auth: false, chat: { isOpen: false, sellerId: null, listingId: null, listingTitle: '' }, profile: null, manage: false, report: null, photo: null };
const KEY = 'unilnkNavigation';
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A single history entry describes the whole screen, including its open overlays.
export function createNavigation(history, events, initial = HOME, access = {}) {
  let permissions = access;
  const normalize = (value) => {
    const state = { ...HOME, ...value };
    if (!['browse','messages','saved','sell','dashboard','admin'].includes(state.tab)) state.tab = 'browse';
    if (!permissions.userId) {
      if (state.tab !== 'browse') state.tab = 'browse';
      state.manage = false; state.chat = HOME.chat; state.report = null;
    }
    if (state.tab === 'admin' && !permissions.admin) state.tab = 'browse';
    return state;
  };
  const stored = history.state?.[KEY];
  let snapshot = normalize(stored?.version === 1 ? stored.screen : initial);
  let depth = stored?.version === 1 ? stored.depth : 0;
  let pending = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener());
  const write = (method) => history[method]({ ...history.state, [KEY]: {version:1, depth, screen:snapshot} }, '');
  const pop = (event) => {
    pending = null;
    const entry = event.state?.[KEY];
    if (!entry || entry.version !== 1) return;
    depth = entry.depth;
    snapshot = normalize(entry.screen);
    if (!equal(snapshot, entry.screen)) write('replaceState');
    emit();
  };
  const flush = () => {
    if (!pending) return;
    const next = normalize(pending); pending = null;
    if (equal(next,snapshot)) return;
    const opened = (!snapshot.auth && next.auth) || (!snapshot.manage && next.manage) ||
      (!snapshot.profile && next.profile) || (!snapshot.report && next.report) ||
      (!snapshot.photo && next.photo) || (!snapshot.chat.isOpen && next.chat.isOpen);
    const closed = (snapshot.auth && !next.auth) || (snapshot.manage && !next.manage) ||
      (snapshot.profile && !next.profile) || (snapshot.report && !next.report) ||
      (snapshot.photo && !next.photo) || (snapshot.chat.isOpen && !next.chat.isOpen);
    // Close buttons and Escape return to the original screen rather than adding
    // an entry that would reopen the overlay on the next Back press.
    if (closed && !opened && next.tab === snapshot.tab && depth > 0) {
      history.back(); return;
    }
    snapshot = next; depth += 1; write('pushState'); emit();
  };
  return {
    start() { write('replaceState'); events.addEventListener('popstate',pop); return () => events.removeEventListener('popstate',pop); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    getDepth: () => depth,
    set(key,value) {
      const next = pending || {...snapshot};
      next[key] = typeof value === 'function' ? value(next[key]) : value;
      pending = next; queueMicrotask(flush);
    },
    back() { pending = null; if(depth > 0) history.back(); },
    home() { pending = null; if(equal(snapshot,HOME)) return; snapshot = {...HOME}; depth += 1; write('pushState'); emit(); },
    setAccess(value) {
      permissions = value;
      const next = normalize(snapshot);
      if(!equal(next,snapshot)) { snapshot=next; pending=null; write('replaceState'); emit(); }
    },
  };
}

export function useAppNavigation(initial, userId, admin) {
  const [controller] = useState(() => createNavigation(window.history, window, initial, {userId,admin}));
  const state = useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  useEffect(() => controller.start(),[controller]);
  useEffect(() => controller.setAccess({userId,admin}),[controller,userId,admin]);
  return { state, set:controller.set, back:controller.back, home:controller.home, canGoBack:controller.getDepth()>0 };
}

