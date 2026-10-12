'use strict';
/* Wardley Maps – Prototyp (lokal, ohne Backend)
   Alle Datenzugriffe laufen über das API-Objekt. Später wird es durch Supabase ersetzt. */
(function (root) {

/* ---------- Helfer ---------- */
const CFG = root.APP_CONFIG || { BACKEND: 'local' };
const DICT = root.WM_I18N || { en: {} };   // Übersetzungen (i18n.js): Schlüssel = deutscher Text
const PREF_KEY = 'wm.prefs.v1';
const prefs = { theme: 'auto', lang: 'de' };   // persönliche Einstellungen, nur in diesem Browser
try {
  const p = JSON.parse((root.localStorage && root.localStorage.getItem(PREF_KEY)) || '{}') || {};
  if (['light', 'dark', 'auto'].includes(p.theme)) prefs.theme = p.theme;
  if (p.lang === 'en' || p.lang === 'de') prefs.lang = p.lang;
} catch (e) { console.error(e); }
let LANG = prefs.lang;
const t = s => (DICT[LANG] && DICT[LANG][s]) || s;
function applyTheme() {
  if (typeof document === 'undefined') return;
  const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && !!root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.lang = LANG;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', dark ? '#14181d' : '#f3f3ee');
}
function setPref(k, v) {
  prefs[k] = v;
  if (k === 'lang') LANG = v;
  try { root.localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { console.error(e); }
  applyTheme();
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const now = () => new Date().toISOString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (s, r) => (r || document).querySelector(s);
const fmtDate = iso => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(LANG === 'en' ? 'en-GB' : 'de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString(LANG === 'en' ? 'en-GB' : 'de-CH', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
};

/* ---------- Mobilnummer und PIN (wie FBRO) ---------- */
// Nimmt 079 123 45 67, +41 79 123 45 67, 0041 79 123 45 67, +41 (0)79 123 45 67 und Auslandsnummern
// (+49 170 1234567, 0049 170 1234567). Ergebnis: +41791234567 oder null (ungültig, zu kurz).
// Muss mit normalize_phone() in supabase/schema.sql übereinstimmen.
function normPhone(input) {
  let s = String(input == null ? '' : input).replace(/\(0\)/g, '').replace(/[^0-9+]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  else if (s.startsWith('0')) s = '+41' + s.slice(1);
  else if (/^41[0-9]{9}$/.test(s)) s = '+' + s;
  if (!/^\+[1-9][0-9]{7,14}$/.test(s)) return null;
  if (s.startsWith('+41') && s.length !== 12) return null;
  return s;
}
/* Länderwahl + Eingabe → Nummer für normPhone(). Eingaben mit + oder 00 gelten immer als international. */
const PHONE_CC = [{ c: '41', l: 'CH +41', ph: '79 123 45 67' }, { c: '49', l: 'DE +49', ph: '176 12345678' }];
function composePhone(cc, raw) {
  raw = String(raw || '').trim();
  if (/^(\+|00)/.test(raw.replace(/\s/g, ''))) return raw;
  if (!cc) return raw;
  let d = raw.replace(/\(0\)/g, '').replace(/\D/g, '');
  if (cc === '41' && d.length === 11 && d.indexOf('41') === 0) d = d.slice(2);
  d = d.replace(/^0+/, '');
  return d ? '+' + cc + d : '';
}
function phoneField(idCc, idNum) {
  return `<div class="phonerow"><select id="${idCc}" class="phonecc" aria-label="${t('Land')}">${PHONE_CC.map(x => `<option value="${x.c}">${x.l}</option>`).join('')}<option value="">${t('Andere')}</option></select>
    <input id="${idNum}" type="tel" inputmode="tel" autocomplete="${idNum === 'ln' ? 'username' : 'off'}" required maxlength="30" placeholder="79 123 45 67"></div>`;
}
const defaultPin = phone => String(phone || '').replace(/\D/g, '').slice(-6);   // letzte 6 Ziffern
const phoneToEmail = phone => {
  const n = normPhone(phone);
  return n ? n.slice(1) + '@' + (CFG.EMAIL_DOMAIN || 'wardley.app') : null;
};
const fmtPhone = phone => {
  const n = normPhone(phone);
  if (!n) return String(phone || '');
  const d = n.slice(1);
  return n.startsWith('+41') ? `+41 ${d.slice(2, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}` : n;
};

/* ---------- Geometrie und Rendering der Map ---------- */
const STAGES = ['Genesis', 'Custom built', 'Product', 'Commodity'];
const G = { W: 1000, H: 640, X0: 90, X1: 970, Y0: 30, Y1: 560 };
const px = n => G.X0 + n * (G.X1 - G.X0);
const py = n => G.Y0 + n * (G.Y1 - G.Y0);
const nx = x => (x - G.X0) / (G.X1 - G.X0);
const ny = y => (y - G.Y0) / (G.Y1 - G.Y0);
const TYPES = ['component', 'anchor', 'note'];
const LABELS = ['right', 'left', 'below', 'above'];

function mapSvg(data, o) {
  o = o || {};
  const p = o.id || 'm';
  const nodes = (data && data.nodes) || [];
  const links = (data && data.links) || [];
  const by = {};
  nodes.forEach(n => { by[n.id] = n; });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.W} ${G.H}" font-family="system-ui,sans-serif">`;
  s += `<defs><marker id="${p}-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="#D85A30" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
  s += `<rect x="0" y="0" width="${G.W}" height="${G.H}" fill="#fff"/>`;
  const colW = (G.X1 - G.X0) / 4;
  for (let k = 1; k < 4; k++) {
    s += `<line x1="${G.X0 + k * colW}" y1="${G.Y0}" x2="${G.X0 + k * colW}" y2="${G.Y1}" stroke="#d3d1c7" stroke-width="1" stroke-dasharray="5 5"/>`;
  }
  s += `<line x1="${G.X0}" y1="${G.Y0}" x2="${G.X0}" y2="${G.Y1}" stroke="#888780" stroke-width="1.5"/>`;
  s += `<line x1="${G.X0}" y1="${G.Y1}" x2="${G.X1}" y2="${G.Y1}" stroke="#888780" stroke-width="1.5"/>`;
  s += `<text x="10" y="${G.Y0 + 12}" font-size="12" fill="#5f5e5a">${t('Sichtbar')}</text>`;
  s += `<text x="10" y="${G.Y1 - 4}" font-size="12" fill="#5f5e5a">${t('Unsichtbar')}</text>`;
  STAGES.forEach((n, i) => {
    s += `<text x="${G.X0 + colW * i + colW / 2}" y="${G.Y1 + 26}" font-size="13" text-anchor="middle" fill="#5f5e5a">${esc(n)}</text>`;
  });
  s += `<text x="${G.X1}" y="${G.Y1 + 54}" font-size="12" text-anchor="end" fill="#5f5e5a">${t('Evolution')} →</text>`;
  links.forEach(l => {
    const a = by[l.from], b = by[l.to];
    if (a && b) s += `<line x1="${px(a.x)}" y1="${py(a.y)}" x2="${px(b.x)}" y2="${py(b.y)}" stroke="#888780" stroke-width="1.5"/>`;
  });
  nodes.forEach(n => {
    if (n.type !== 'note' && typeof n.evo === 'number' && n.evo > n.x + 0.02) {
      s += `<line x1="${px(n.x) + 13}" y1="${py(n.y)}" x2="${px(n.evo)}" y2="${py(n.y)}" stroke="#D85A30" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#${p}-ar)"/>`;
    }
  });
  nodes.forEach(n => {
    const x = px(n.x), y = py(n.y);
    s += `<g data-node="${esc(n.id)}" style="cursor:pointer">`;
    if (n.type === 'note') {
      const w = Math.max(60, n.name.length * 7.5 + 20);
      s += `<rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="28" rx="4" fill="#FAEEDA" stroke="#854F0B" stroke-width="1.2"/>`;
      s += `<text x="${x}" y="${y + 5}" font-size="13" text-anchor="middle" fill="#412402">${esc(n.name)}</text>`;
    } else {
      const anchor = n.type === 'anchor';
      const r = anchor ? 10 : 8;
      const fill = anchor ? '#E1F5EE' : n.build ? '#FAECE7' : '#F1EFE8';
      const stroke = anchor ? '#0F6E56' : n.build ? '#993C1D' : '#5F5E5A';
      s += `<circle cx="${x}" cy="${y}" r="18" fill="transparent"/>`;
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      let lx = x + r + 8, ly = y + 5, anc = 'start';
      if (n.label === 'left') { lx = x - r - 8; anc = 'end'; }
      else if (n.label === 'below') { lx = x; ly = y + r + 18; anc = 'middle'; }
      else if (n.label === 'above') { lx = x; ly = y - r - 8; anc = 'middle'; }
      s += `<text x="${lx}" y="${ly}" font-size="14" text-anchor="${anc}" fill="#2c2c2a"${anchor ? ' font-weight="600"' : ''}>${esc(n.name)}</text>`;
    }
    s += '</g>';
    if (o.sel === n.id) s += `<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#185FA5" stroke-width="2" stroke-dasharray="4 3" pointer-events="none"/>`;
    if (o.linkFrom === n.id) s += `<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#185FA5" stroke-width="3" pointer-events="none"/>`;
  });
  return s + '</svg>';
}

/* ---------- Datenmodell: Prüfen und Vorlagen ---------- */
function sanitize(d) {
  const out = { nodes: [], links: [] };
  if (!d || typeof d !== 'object') return out;
  const ids = new Set();
  (Array.isArray(d.nodes) ? d.nodes : []).slice(0, 500).forEach(n => {
    if (!n || typeof n.id !== 'string' || ids.has(n.id)) return;
    const node = {
      id: n.id.slice(0, 40),
      name: String(n.name == null ? '' : n.name).slice(0, 80),
      x: clamp(Number(n.x) || 0, 0, 1),
      y: clamp(Number(n.y) || 0, 0, 1),
      type: TYPES.includes(n.type) ? n.type : 'component',
      build: !!n.build,
      label: LABELS.includes(n.label) ? n.label : 'right',
      desc: String(n.desc == null ? '' : n.desc).slice(0, 500)
    };
    if (typeof n.evo === 'number' && isFinite(n.evo)) node.evo = clamp(n.evo, 0, 1);
    ids.add(node.id);
    out.nodes.push(node);
  });
  const seen = new Set();
  (Array.isArray(d.links) ? d.links : []).slice(0, 2000).forEach(l => {
    if (!l || !ids.has(l.from) || !ids.has(l.to) || l.from === l.to) return;
    const key = [l.from, l.to].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    out.links.push({ from: l.from, to: l.to });
  });
  return out;
}

function teaTemplate() {
  const id = {};
  ['kunde', 'shop', 'empf', 'zahl', 'sort', 'vers', 'host', 'strom', 'ki'].forEach(k => { id[k] = uid(); });
  const N = (k, name, x, y, o) => Object.assign({ id: id[k], name, x, y, type: 'component', build: false, label: 'right', desc: '' }, o || {});
  const L = (a, b) => ({ from: id[a], to: id[b] });
  return {
    nodes: [
      N('kunde', 'Tee-Kunde', 0.446, 0.059, { type: 'anchor' }),
      N('shop', 'Onlineshop', 0.571, 0.235),
      N('empf', 'Empfehlungsalgorithmus', 0.357, 0.382, { build: true, label: 'left', evo: 0.473 }),
      N('zahl', 'Zahlungen', 0.821, 0.441),
      N('sort', 'Seltene Teesorten', 0.446, 0.559, { build: true, label: 'below' }),
      N('vers', 'Versand', 0.661, 0.618, { label: 'below' }),
      N('host', 'Hosting', 0.857, 0.794, { label: 'left' }),
      N('strom', 'Strom', 0.929, 0.912, { label: 'left' }),
      N('ki', 'KI-Teeberater', 0.071, 0.765, { build: true, label: 'below', evo: 0.223 })
    ],
    links: [L('kunde', 'shop'), L('shop', 'empf'), L('shop', 'zahl'), L('shop', 'sort'), L('shop', 'vers'), L('shop', 'host'), L('empf', 'ki'), L('host', 'strom')]
  };
}

/* ---------- Lokale Datenschicht ---------- */
const LS_DB = 'wm.db.v1', LS_SES = 'wm.session.v1';
let db = null;

function seed() {
  const U = (name, phone, isAdmin) => ({ id: uid(), name, phone, pin: defaultPin(phone), isAdmin, active: true, created: now() });
  const admin = U('Admin', '+41791111111', true), anna = U('Anna', '+41792222222', false), ben = U('Ben', '+41793333333', false);
  const m = {
    id: uid(), title: 'Online-Teeshop (Beispiel)', owner: admin.id,
    members: { [anna.id]: 'editor', [ben.id]: 'viewer' },
    data: teaTemplate(), created: now(), updated: now(), rev: 1
  };
  return { users: [admin, anna, ben], maps: [m], versions: [] };
}
function loadDb() {
  try { db = JSON.parse(root.localStorage.getItem(LS_DB)); } catch (e) { console.error('db lesen', e); db = null; }
  if (!db || !Array.isArray(db.users) || !Array.isArray(db.maps)) { db = seed(); persist(); }
  if (!Array.isArray(db.versions)) db.versions = [];
}
function persist() {
  try { root.localStorage.setItem(LS_DB, JSON.stringify(db)); }
  catch (e) { console.error('db schreiben', e); throw new Error(t('Speichern im Browser fehlgeschlagen')); }
}

const roleOf = (m, u) => u.isAdmin ? 'admin' : m.owner === u.id ? 'owner' : ((m.members && m.members[u.id]) || null);
const canEdit = r => r === 'admin' || r === 'owner' || r === 'editor';
const canManage = r => r === 'admin' || r === 'owner';
const ROLE_LABEL = { admin: 'Admin', owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Leser' };
const validPin = p => /^\d{6}$/.test(String(p));

function me() {
  const id = root.localStorage.getItem(LS_SES);
  return db.users.find(u => u.id === id && u.active) || null;
}
function needUser() { const u = me(); if (!u) throw new Error(t('Nicht angemeldet')); return u; }
function needAdmin() { const u = needUser(); if (!u.isAdmin) throw new Error(t('Nur für Admins')); return u; }
function mapFor(id, u) {
  const m = db.maps.find(x => x.id === id);
  const r = m && roleOf(m, u);
  if (!m || !r) throw new Error(t('Map nicht gefunden oder kein Zugriff'));
  return { m, role: r };
}
const userName = id => { const u = db.users.find(x => x.id === id); return u ? u.name : '?'; };

const LocalApi = {
  me,
  async init() { loadDb(); },
  async login(phone, pin) {
    const np = normPhone(phone);
    if (!np) throw new Error(t('Mobilnummer ungültig'));
    const u = db.users.find(x => x.active && x.phone === np);
    if (!u || u.pin !== String(pin).trim()) throw new Error(t('Nummer oder PIN falsch'));
    root.localStorage.setItem(LS_SES, u.id);
    return u;
  },
  async logout() { root.localStorage.removeItem(LS_SES); },

  /* Benutzer */
  async listUsers() { needAdmin(); return clone(db.users); },
  async listUserNames() { needUser(); return db.users.filter(u => u.active).map(u => ({ id: u.id, name: u.name })); },
  async createUser({ name, phone, pin, isAdmin }) {
    needAdmin();
    name = String(name || '').trim().slice(0, 40);
    if (!name) throw new Error(t('Name fehlt'));
    const np = normPhone(phone);
    if (!np) throw new Error(t('Mobilnummer ungültig'));
    pin = String(pin || '').trim() || defaultPin(np);
    if (!validPin(pin)) throw new Error(t('PIN: 6 Ziffern'));
    if (db.users.some(u => u.phone === np)) throw new Error(t('Mobilnummer ist bereits registriert'));
    const u = { id: uid(), name, phone: np, pin, isAdmin: !!isAdmin, active: true, created: now() };
    db.users.push(u); persist(); return clone(u);
  },
  async updateUser(id, patch) {
    const a = needAdmin();
    const u = db.users.find(x => x.id === id);
    if (!u) throw new Error(t('Benutzer nicht gefunden'));
    if (id === a.id && (patch.isAdmin === false || patch.active === false)) throw new Error(t('Eigene Rechte nicht entziehbar'));
    if ('isAdmin' in patch) u.isAdmin = !!patch.isAdmin;
    if ('active' in patch) u.active = !!patch.active;
    persist(); return clone(u);
  },
  async resetPin(id, pin) {
    needAdmin();
    const u = db.users.find(x => x.id === id);
    if (!u) throw new Error(t('Benutzer nicht gefunden'));
    pin = String(pin || '').trim() || defaultPin(u.phone);
    if (!validPin(pin)) throw new Error(t('PIN: 6 Ziffern'));
    u.pin = pin; persist();
  },
  async deleteUser(id) {
    const a = needAdmin();
    if (id === a.id) throw new Error(t('Eigenes Konto nicht löschbar'));
    db.maps.forEach(m => { if (m.owner === id) m.owner = a.id; if (m.members) delete m.members[id]; });
    db.users = db.users.filter(u => u.id !== id);
    persist();
  },

  /* Maps */
  async listMaps() {
    const u = needUser();
    return db.maps.map(m => ({ m, r: roleOf(m, u) })).filter(x => x.r).map(({ m, r }) => ({
      id: m.id, title: m.title, owner: m.owner, ownerName: userName(m.owner), updated: m.updated, role: r, data: m.data
    })).sort((a, b) => b.updated.localeCompare(a.updated));
  },
  async getMap(id) {
    const { m, role } = mapFor(id, needUser());
    return Object.assign(clone(m), { role, ownerName: userName(m.owner) });
  },
  async createMap({ title, template, data }) {
    const u = needUser();
    const m = {
      id: uid(), title: String(title || '').trim().slice(0, 100) || t('Neue Map'), owner: u.id, members: {},
      data: data ? sanitize(data) : template === 'tea' ? teaTemplate() : { nodes: [], links: [] },
      created: now(), updated: now(), rev: 1
    };
    db.maps.push(m); persist(); return m.id;
  },
  async saveMap(id, { title, data }) {
    const { m, role } = mapFor(id, needUser());
    if (!canEdit(role)) throw new Error(t('Keine Bearbeitungsrechte'));
    if (typeof title === 'string' && title.trim()) m.title = title.trim().slice(0, 100);
    if (data) m.data = sanitize(data);
    m.updated = now(); m.rev = (m.rev || 0) + 1;
    persist(); return m.rev;
  },
  async duplicateMap(id) {
    const u = needUser();
    const { m } = mapFor(id, u);
    const c = { id: uid(), title: (m.title + ' ' + t('(Kopie)')).slice(0, 100), owner: u.id, members: {}, data: clone(m.data), created: now(), updated: now(), rev: 1 };
    db.maps.push(c); persist(); return c.id;
  },
  async deleteMap(id) {
    const { role } = mapFor(id, needUser());
    if (!canManage(role)) throw new Error(t('Nur Besitzer oder Admin'));
    db.maps = db.maps.filter(m => m.id !== id);
    db.versions = db.versions.filter(v => v.mapId !== id);
    persist();
  },
  async setMembers(id, members) {
    const { m, role } = mapFor(id, needUser());
    if (!canManage(role)) throw new Error(t('Nur Besitzer oder Admin'));
    const clean = {};
    Object.keys(members || {}).forEach(uidk => {
      if (uidk !== m.owner && db.users.some(u => u.id === uidk) && (members[uidk] === 'editor' || members[uidk] === 'viewer')) clean[uidk] = members[uidk];
    });
    m.members = clean; persist();
  },

  /* Versionen */
  async listVersions(mapId) {
    mapFor(mapId, needUser());
    return db.versions.filter(v => v.mapId === mapId).sort((a, b) => b.created.localeCompare(a.created))
      .map(v => ({ id: v.id, label: v.label, created: v.created, byName: userName(v.by) }));
  },
  async addVersion(mapId, label) {
    const u = needUser();
    const { m, role } = mapFor(mapId, u);
    if (!canEdit(role)) throw new Error(t('Keine Bearbeitungsrechte'));
    db.versions.push({ id: uid(), mapId, label: String(label || '').trim().slice(0, 80), created: now(), by: u.id, data: clone(m.data) });
    const mine = db.versions.filter(v => v.mapId === mapId).sort((a, b) => a.created.localeCompare(b.created));
    while (mine.length > 50) { const old = mine.shift(); db.versions = db.versions.filter(v => v.id !== old.id); }
    persist();
  },
  async getVersionData(mapId, versionId) {
    mapFor(mapId, needUser());
    const v = db.versions.find(x => x.id === versionId && x.mapId === mapId);
    if (!v) throw new Error(t('Version nicht gefunden'));
    return clone(v.data);
  }
};

/* ---------- Supabase-Datenschicht (gleiche Schnittstelle wie LocalApi) ---------- */
function makeSupabaseApi() {
  let sb = null, cur = null;
  const client = () => {
    if (sb) return sb;
    if (!root.supabase || !root.supabase.createClient) throw new Error(t('supabase-js konnte nicht geladen werden'));
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || !CFG.EMAIL_DOMAIN) throw new Error(t('config.js unvollständig (SUPABASE_URL, SUPABASE_ANON_KEY, EMAIL_DOMAIN)'));
    sb = root.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    return sb;
  };
  const must = r => {
    if (r.error) {
      if (r.error.code === 'PGRST116') throw new Error(t('Nicht gefunden oder keine Berechtigung'));
      throw new Error(r.error.message);
    }
    return r.data;
  };
  const toUser = p => ({ id: p.id, name: p.name, phone: p.phone, isAdmin: !!p.is_admin, active: !!p.active, created: p.created_at });
  const needUser = () => { if (!cur) throw new Error(t('Nicht angemeldet')); return cur; };
  const roleFrom = (m, u, members) => u.isAdmin ? 'admin' : m.owner_id === u.id ? 'owner' : (members[u.id] || 'viewer');

  async function loadMe() {
    const s = (await client().auth.getSession()).data.session;
    if (!s) { cur = null; return; }
    const p = must(await client().from('profiles').select('id,name,is_admin,active,created_at').eq('id', s.user.id).maybeSingle());
    if (!p || !p.active) { await client().auth.signOut(); cur = null; return; }
    cur = toUser(p);
  }

  return {
    me: () => cur,
    async init() { await loadMe(); },
    async login(phone, pin) {
      const email = phoneToEmail(phone);
      if (!email) throw new Error(t('Mobilnummer ungültig'));
      const r = await client().auth.signInWithPassword({ email, password: String(pin).trim() });
      if (r.error) { console.error('login', r.error); throw new Error(t('Nummer oder PIN falsch')); }
      await loadMe();
      if (!cur) throw new Error(t('Konto deaktiviert'));
      return cur;
    },
    async logout() { cur = null; try { await client().auth.signOut(); } catch (e) { console.error('logout', e); } },

    async listUsers() {
      needUser();
      return must(await client().rpc('admin_list_users')).map(toUser);
    },
    async listUserNames() {
      needUser();
      return must(await client().from('profiles').select('id,name').eq('active', true).order('name'));
    },
    async createUser({ name, phone, pin, isAdmin }) {
      must(await client().rpc('admin_create_user', {
        p_name: String(name || ''), p_phone: String(phone || ''),
        p_pin: String(pin || '').trim() || null, p_is_admin: !!isAdmin
      }));
    },
    async updateUser(id, patch) {
      const p = must(await client().from('profiles').select('is_admin,active').eq('id', id).single());
      must(await client().rpc('admin_set_user_flags', {
        p_user: id,
        p_is_admin: 'isAdmin' in patch ? !!patch.isAdmin : p.is_admin,
        p_active: 'active' in patch ? !!patch.active : p.active
      }));
    },
    async resetPin(id, pin) { must(await client().rpc('admin_reset_pin', { p_user: id, p_pin: String(pin || '').trim() || null })); },
    async deleteUser(id) { must(await client().rpc('admin_delete_user', { p_user: id })); },

    async listMaps() {
      const u = needUser();
      const maps = must(await client().from('maps')
        .select('id,title,owner_id,data,updated_at,owner:profiles!maps_owner_id_fkey(name)')
        .order('updated_at', { ascending: false }));
      const mine = {};
      if (!u.isAdmin) must(await client().from('map_members').select('map_id,role').eq('user_id', u.id)).forEach(x => { mine[x.map_id] = x.role; });
      return maps.map(m => ({
        id: m.id, title: m.title, owner: m.owner_id, ownerName: (m.owner && m.owner.name) || '?',
        updated: m.updated_at, data: m.data,
        role: u.isAdmin ? 'admin' : m.owner_id === u.id ? 'owner' : (mine[m.id] || 'viewer')
      }));
    },
    async getMap(id) {
      const u = needUser();
      const m = must(await client().from('maps')
        .select('id,title,owner_id,data,rev,updated_at,owner:profiles!maps_owner_id_fkey(name),members:map_members(user_id,role)')
        .eq('id', id).maybeSingle());
      if (!m) throw new Error(t('Map nicht gefunden oder kein Zugriff'));
      const members = {};
      (m.members || []).forEach(x => { members[x.user_id] = x.role; });
      return { id: m.id, title: m.title, owner: m.owner_id, ownerName: (m.owner && m.owner.name) || '?', members, data: m.data, rev: m.rev, updated: m.updated_at, role: roleFrom(m, u, members) };
    },
    async createMap({ title, template, data }) {
      const u = needUser();
      const d = data ? sanitize(data) : template === 'tea' ? teaTemplate() : { nodes: [], links: [] };
      return must(await client().from('maps').insert({ title: String(title || '').trim().slice(0, 100) || t('Neue Map'), owner_id: u.id, data: d }).select('id').single()).id;
    },
    async saveMap(id, { title, data }) {
      const patch = {};
      if (typeof title === 'string' && title.trim()) patch.title = title.trim().slice(0, 100);
      if (data) patch.data = sanitize(data);
      return must(await client().from('maps').update(patch).eq('id', id).select('rev').single()).rev;
    },
    async duplicateMap(id) {
      const u = needUser();
      const m = must(await client().from('maps').select('title,data').eq('id', id).single());
      return must(await client().from('maps').insert({ title: (m.title + ' ' + t('(Kopie)')).slice(0, 100), owner_id: u.id, data: m.data }).select('id').single()).id;
    },
    async deleteMap(id) {
      const r = must(await client().from('maps').delete().eq('id', id).select('id'));
      if (!r.length) throw new Error(t('Nur Besitzer oder Admin'));
    },
    async setMembers(id, members) { must(await client().rpc('set_map_members', { p_map: id, p_members: members || {} })); },

    async listVersions(mapId) {
      needUser();
      return must(await client().from('map_versions')
        .select('id,label,created_at,by:profiles!map_versions_created_by_fkey(name)')
        .eq('map_id', mapId).order('created_at', { ascending: false }))
        .map(v => ({ id: v.id, label: v.label, created: v.created_at, byName: (v.by && v.by.name) || '?' }));
    },
    async addVersion(mapId, label) {
      const u = needUser();
      const m = must(await client().from('maps').select('data').eq('id', mapId).single());
      must(await client().from('map_versions').insert({ map_id: mapId, label: String(label || '').trim().slice(0, 80), data: m.data, created_by: u.id }));
    },
    async getVersionData(mapId, versionId) {
      return must(await client().from('map_versions').select('data').eq('id', versionId).eq('map_id', mapId).single()).data;
    }
  };
}

const API = CFG.BACKEND === 'supabase' ? makeSupabaseApi() : LocalApi;

/* ---------- UI-Helfer ---------- */
function toast(msg) {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}
function modal(html) {
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-close]')) close(); });
  return { el: o, close };
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const monthLabel = iso => {
  try { return new Date(iso).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'de-CH', { month: 'long', year: 'numeric' }); } catch (e) { return ''; }
};
const fileSafe = s => String(s).replace(/[^\w\-]+/g, '_').slice(0, 60) || 'map';
const fail = e => { console.error(e); toast(e && e.message ? e.message : String(e)); };

let cleanup = () => {};
const view = () => $('#view');

/* ---------- Symbole ---------- */
const ICON = {
  library: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  admin: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2 2M16.7 16.7l2 2M5.3 18.7l2-2M16.7 7.3l2-2"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  more: '<circle class="f" cx="5" cy="12" r="1.7"/><circle class="f" cx="12" cy="12" r="1.7"/><circle class="f" cx="19" cy="12" r="1.7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
  select: '<path d="M5 3l14 8-6 2-2 6z"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  node: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
  open: '<path d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  power: '<path d="M12 3v9M6.5 6.5a8 8 0 1011 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  logout: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9"/>'
};
const ic = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;

/* Aktionsmenü ("…"): unten als Sheet, auf grossen Bildschirmen zentriert */
function sheet(title, items) {
  const md = modal(`${title ? `<h2>${esc(title)}</h2>` : ''}<div class="menu">${items.map((it, i) =>
    `<button class="mi ${it.danger ? 'danger' : ''}" data-i="${i}" ${it.id ? `id="${it.id}"` : ''} ${it.disabled ? 'disabled' : ''}>${ic(it.icon)}<span>${esc(it.label)}</span></button>`).join('')}</div>`);
  md.el.classList.add('sheet');
  md.el.addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b || b.disabled) return;
    md.close(); items[+b.dataset.i].run();
  });
  return md;
}

/* ---------- Login und Shell ---------- */
function langSwitch() {
  return `<div class="seg small" id="seg-lang">${[['de', 'Deutsch'], ['en', 'English']].map(([v, l]) =>
    `<button type="button" data-v="${v}" class="${LANG === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
function bindLang(rerender) {
  const el = $('#seg-lang'); if (!el) return;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    setPref('lang', b.dataset.v); rerender();
  });
}
function renderLogin() {
  $('#app').innerHTML = `<div class="login">
    <div class="lhead"><h1 class="brand2" aria-label="Wardley mAPP inspired by Andrea"><svg viewBox="0 0 240 86" role="img" aria-hidden="true">
        <text x="0" y="47" textLength="240" lengthAdjust="spacingAndGlyphs" class="l1">Wardley mAPP</text>
        <text x="0" y="78" textLength="240" lengthAdjust="spacingAndGlyphs" class="l2">inspired by Andrea</text></svg></h1><img class="logo-big" src="icons/logo.png" alt=""></div>
    <p class="sub">${t('Melde dich mit deiner Mobilnummer an.')}</p>
    <form id="lf" autocomplete="off">
      <label>${t('Mobilnummer')}${phoneField('lcc', 'ln')}</label>
      <label>${t('PIN (nur nötig, wenn ein Admin sie geändert hat)')}<input id="lp" class="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" pattern="[0-9]{6}" placeholder="······"></label>
      <div class="error" id="le"></div>
      <button class="btn dark block">${t('Anmelden')}</button>
    </form>
    <button type="button" class="linkbtn" id="first">${t('Zum ersten Mal hier?')}</button>
    <p class="hint" id="firsthint" hidden>${t('Dein Konto legt ein Admin an. Deine PIN sind die letzten 6 Ziffern deiner Mobilnummer, solange kein Admin sie geändert hat.')}</p>
    ${CFG.BACKEND === 'supabase' ? '' : `<p class="hint">${t('Prototyp: Daten liegen nur in diesem Browser.')}<br>Demo: 079 111 11 11 (Admin) · 079 222 22 22 (Anna) · 079 333 33 33 (Ben), PIN 111111, 222222, 333333</p>`}
    <div class="center">${langSwitch()}</div>
  </div>`;
  bindLang(renderLogin);
  $('#first').onclick = () => { $('#firsthint').hidden = !$('#firsthint').hidden; };
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault();
    const phone = composePhone($('#lcc').value, $('#ln').value);
    const pin = $('#lp').value.trim() || defaultPin(normPhone(phone));
    try { await API.login(phone, pin); route(); }
    catch (err) { console.error(err); $('#le').textContent = err.message; }
  });
}
function shell(u) {
  const h = location.hash;
  const cur = h.startsWith('#/admin') ? 'admin' : h.startsWith('#/profile') ? 'profile' : 'library';
  const tabs = [['library', 'Library', '#/library']].concat(u.isAdmin ? [['admin', 'Admin', '#/admin']] : [], [['profile', 'Profil', '#/profile']]);
  $('#app').innerHTML = `<header class="top" id="top"></header><main id="view"></main>
    <nav class="tabbar" aria-label="${t('Hauptnavigation')}">${tabs.map(([k, l, href]) =>
      `<a href="${href}" class="${cur === k ? 'on' : ''}" ${cur === k ? 'aria-current="page"' : ''}>${ic(k)}<span>${t(l)}</span></a>`).join('')}</nav>`;
}
/* Kopfzeile: o.back = Link zurück, o.titleHtml = eigener Titel (z. B. Eingabefeld), o.right = Schaltflächen */
function setTop(title, o) {
  o = o || {};
  $('#top').innerHTML = `${o.back ? `<a class="ibtn" href="${o.back}" aria-label="${t('Zurück')}">${ic('back')}</a>` : ''}
    <div class="grow">${o.titleHtml || `<h1 class="pagetitle">${esc(title)}</h1>`}${o.sub ? `<div class="sub">${esc(o.sub)}</div>` : ''}</div><div class="tact">${o.right || ''}</div>`;
  fitTitles();
}
/* Seitentitel verkleinern, bis er auf eine Zeile passt (wie bei FBRO) */
function fitTitles() {
  document.querySelectorAll('.pagetitle').forEach(el => {
    el.style.fontSize = '';
    let size = parseFloat(getComputedStyle(el).fontSize) || 36;
    while (el.scrollWidth > el.clientWidth + 1 && size > 15) { size -= 1; el.style.fontSize = size + 'px'; }
  });
}
const iconBtn = (id, icon, label, extra) => `<button class="ibtn" id="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${extra || ''}>${ic(icon)}</button>`;

/* ---------- Profil ---------- */
let installPrompt = null;
async function viewProfile() {
  const u = API.me();
  setTop(t('Mein Profil'));
  const iosHint = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
  const standalone = !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);
  const themes = [['light', 'sun', t('Hell')], ['dark', 'moon', t('Dunkel')], ['auto', 'monitor', t('Automatisch')]];
  view().innerHTML = `<div class="stack narrow">
    <div class="card pad"><div class="kv"><span>${t('Name')}</span><b>${esc(u.name)}</b></div>
      ${u.phone ? `<div class="kv"><span>${t('Mobilnummer')}</span><b>${esc(fmtPhone(u.phone))}</b></div>` : ''}</div>
    <div class="card pad"><h2>${t('Rollen')}</h2>
      <div class="role"><span class="rbadge">${esc((u.name || 'M').trim().charAt(0).toUpperCase())}</span>${t('Mitglied')}</div>
      ${u.isAdmin ? `<div class="role"><span class="rbadge sq">${ic('admin')}</span>Admin</div>` : ''}</div>
    <div class="card pad"><h2>${t('Sprache')}</h2><p class="desc">${t('Wähle die Sprache, in der du die App nutzen möchtest.')}</p>
      <select id="sel-lang" aria-label="${t('Sprache')}"><option value="de" ${LANG === 'de' ? 'selected' : ''}>Deutsch</option><option value="en" ${LANG === 'en' ? 'selected' : ''}>English</option></select></div>
    <div class="card pad"><h2>${t('Darstellung')}</h2><p class="desc">${t('Wähle, wie die App aussehen soll.')}</p>
      <div class="seg3" id="seg-theme" role="radiogroup">${themes.map(([v, i, l]) =>
        `<button type="button" role="radio" aria-checked="${prefs.theme === v}" data-v="${v}" class="${prefs.theme === v ? 'on' : ''}">${ic(i)}<span>${l}</span></button>`).join('')}</div></div>
    ${standalone ? '' : `<div class="card pad"><h2>${t('App installieren')}</h2><p class="desc">${t('Lege die App auf deinen Startbildschirm, dann öffnet sie sich im Vollbild.')}</p>
      ${installPrompt ? `<button class="btn out block" id="inst">${t('Installieren')}</button>` : `<p class="meta">${iosHint ? t('Tippe in Safari auf «Teilen» und dann auf «Zum Home-Bildschirm».') : t('Im Browser-Menü: «Zum Startbildschirm hinzufügen» bzw. «App installieren».')}</p>`}</div>`}
    <div class="card pad"><div class="kv"><span>${t('Daten')}</span><b>${CFG.BACKEND === 'supabase' ? 'Supabase' : t('Nur in diesem Browser')}</b></div>
      <p class="meta">${t('Deine PIN kann nur ein Admin zurücksetzen.')}</p></div>
    <button class="btn danger block" id="logout">${ic('logout')} ${t('Abmelden')}</button></div>`;
  $('#seg-theme').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    setPref('theme', b.dataset.v); viewProfile();
  });
  $('#sel-lang').addEventListener('change', e => { setPref('lang', e.target.value); route(); });
  const inst = $('#inst');
  if (inst) inst.onclick = async () => { try { installPrompt.prompt(); await installPrompt.userChoice; } catch (err) { console.error(err); } installPrompt = null; viewProfile(); };
  $('#logout').onclick = async () => { await API.logout(); location.hash = ''; route(); };
}

/* ---------- Library ---------- */
async function viewLibrary() {
  const maps = await API.listMaps();
  setTop(t('Library'));
  view().innerHTML = `<div class="searchbar"><input type="search" id="q" placeholder="${t('Suchen …')}" aria-label="${t('Suchen …')}"></div>
    <div class="grid" id="grid"></div>
    <button class="fab" id="new" aria-label="${t('Neue Map')}" title="${t('Neue Map')}">${ic('plus')}</button>
    <input type="file" id="file" accept="application/json,.json" hidden>`;
  const grid = $('#grid');
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const list = maps.filter(m => !q || m.title.toLowerCase().includes(q) || m.ownerName.toLowerCase().includes(q));
    if (!list.length) { grid.innerHTML = `<div class="empty">${t('Keine Maps gefunden.')}</div>`; return; }
    let last = '';
    grid.innerHTML = list.map(m => {
      const label = monthLabel(m.updated);
      const head = label !== last ? `<div class="week">${esc(label)}</div>` : '';
      last = label;
      return head + `<article class="card mapcard">
      <div class="chead" data-act="open" data-id="${esc(m.id)}"><span class="ctitle">${esc(m.title)}</span>
        <span class="badge ${m.role === 'viewer' ? 'gray' : ''}">${t(ROLE_LABEL[m.role])}</span>
        <button class="ibtn flat" data-act="menu" data-id="${esc(m.id)}" aria-label="${t('Weitere Aktionen')}: ${esc(m.title)}" title="${t('Weitere Aktionen')}">${ic('more')}</button></div>
      <div class="thumb" data-act="open" data-id="${esc(m.id)}">${mapSvg(m.data, { id: 't' + m.id })}</div>
      <div class="cbody"><div class="meta">${esc(m.ownerName)} · ${esc(fmtDate(m.updated))}</div>
        <div class="crow"><button class="btn out" data-act="open" data-id="${esc(m.id)}">${ic(canEdit(m.role) ? 'open' : 'select')} ${canEdit(m.role) ? t('Öffnen') : t('Ansehen')}</button></div></div></article>`;
    }).join('');
  };
  draw();
  $('#q').addEventListener('input', draw);

  const dupMap = async id => { try { await API.duplicateMap(id); toast(t('Dupliziert')); viewLibrary(); } catch (err) { fail(err); } };
  const delMap = id => {
    const m = maps.find(x => x.id === id);
    const md = modal(`<h2>${t('Map löschen?')}</h2><p>${esc(m.title)}</p>
      <div class="foot"><button class="btn" data-close>${t('Abbrechen')}</button><button class="btn danger" id="ok">${t('Löschen')}</button></div>`);
    $('#ok', md.el).onclick = async () => { try { await API.deleteMap(id); md.close(); viewLibrary(); } catch (err) { fail(err); } };
  };

  $('#new').onclick = () => {
    const md = modal(`<h2>${t('Neue Map')}</h2>
      <label>${t('Titel')}<input id="nt" maxlength="100" placeholder="${t('Neue Map')}"></label>
      <label>${t('Vorlage')}<select id="ntpl"><option value="">${t('Leer')}</option><option value="tea">${t('Online-Teeshop (Beispiel)')}</option></select></label>
      <div class="foot"><button class="btn left" id="imp">${ic('download')} ${t('Import (JSON)')}</button><button class="btn" data-close>${t('Abbrechen')}</button><button class="btn primary" id="ok">${t('Erstellen')}</button></div>`);
    $('#nt', md.el).focus();
    $('#imp', md.el).onclick = () => $('#file').click();
    $('#ok', md.el).onclick = async () => {
      try { const id = await API.createMap({ title: $('#nt', md.el).value, template: $('#ntpl', md.el).value }); md.close(); location.hash = '#/map/' + id; }
      catch (e) { fail(e); }
    };
  };
  $('#file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      if (f.size > 2e6) throw new Error(t('Datei zu gross'));
      const j = JSON.parse(await f.text());
      const data = sanitize(j && j.data ? j.data : j);
      if (!data.nodes.length) throw new Error(t('Keine gültige Map in der Datei'));
      const id = await API.createMap({ title: (j && j.title) || f.name.replace(/\.json$/i, ''), data });
      location.hash = '#/map/' + id;
    } catch (err) { fail(err); }
    e.target.value = '';
  };
  grid.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const id = el.dataset.id, act = el.dataset.act;
    if (act === 'open') location.hash = '#/map/' + id;
    else if (act === 'menu') {
      const m = maps.find(x => x.id === id);
      sheet(m.title, [
        { icon: 'open', label: canEdit(m.role) ? t('Öffnen') : t('Ansehen'), run: () => { location.hash = '#/map/' + id; } },
        { icon: 'copy', label: t('Duplizieren'), id: 'm-dup', run: () => dupMap(id) }
      ].concat(canManage(m.role) ? [
        { icon: 'share', label: t('Teilen'), id: 'm-share', run: () => shareDialog(id).catch(fail) },
        { icon: 'trash', label: t('Löschen'), id: 'm-del', danger: true, run: () => delMap(id) }
      ] : []));
    }
  });
}

async function shareDialog(id) {
  const m = await API.getMap(id);
  const users = (await API.listUserNames()).filter(x => x.id !== m.owner);
  let members = Object.assign({}, m.members || {});
  const md = modal(`<h2>${t('Teilen')}: ${esc(m.title)}</h2>
    <p class="meta">${t('Besitzer')}: ${esc(m.ownerName)}</p><div id="ml"></div>
    <div class="form-row" style="margin-top:12px"><label>${t('Person hinzufügen')}<select id="au"></select></label>
    <label>${t('Rolle')}<select id="ar"><option value="viewer">${t('Leser')}</option><option value="editor">${t('Bearbeiter')}</option></select></label>
    <button class="btn" id="add">+</button></div>
    <div class="foot"><button class="btn primary" data-close>${t('Fertig')}</button></div>`);
  const draw = () => {
    const ids = Object.keys(members).filter(k => users.some(x => x.id === k));
    $('#ml', md.el).innerHTML = ids.length ? ids.map(k => `<div class="member"><span>${esc(users.find(x => x.id === k).name)}</span>
      <select data-m="${esc(k)}"><option value="viewer" ${members[k] === 'viewer' ? 'selected' : ''}>${t('Leser')}</option><option value="editor" ${members[k] === 'editor' ? 'selected' : ''}>${t('Bearbeiter')}</option></select>
      <button class="btn small danger" data-rm="${esc(k)}">×</button></div>`).join('') : `<p class="meta">${t('Noch niemand.')}</p>`;
    const free = users.filter(x => !members[x.id]);
    $('#au', md.el).innerHTML = free.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    $('#add', md.el).disabled = !free.length;
  };
  const save = async () => { try { await API.setMembers(id, members); } catch (e) { fail(e); } };
  draw();
  md.el.addEventListener('change', async e => { const k = e.target.dataset.m; if (k) { members[k] = e.target.value; await save(); } });
  md.el.addEventListener('click', async e => {
    const rm = e.target.dataset.rm;
    if (rm) { delete members[rm]; await save(); draw(); }
    if (e.target.id === 'add') { const k = $('#au', md.el).value; if (k) { members[k] = $('#ar', md.el).value; await save(); draw(); } }
  });
}

/* ---------- Admin ---------- */
async function viewAdmin() {
  const me0 = API.me();
  const users = await API.listUsers();
  const maps = await API.listMaps();
  setTop(t('Admin Console'), { sub: t('Nur für Admins sichtbar') });
  view().innerHTML = `<section class="acc open"><div class="chead acc-h" id="acc-h"><span class="ctitle">${t('Personen')} (${users.length})</span>
      <button class="ibtn flat" id="addu" aria-label="${t('Person anlegen')}" title="${t('Person anlegen')}">${ic('plus')}</button>
      <button class="ibtn flat" id="infob" aria-label="${t('Erklärung anzeigen')}" title="${t('Erklärung anzeigen')}">${ic('info')}</button>
      <span class="chev">${ic('chev')}</span></div>
      <p class="infobar" id="infotxt" hidden>${t('Personen mit Mobilnummer anlegen. Die PIN sind die letzten 6 Ziffern der Nummer, solange du keine andere setzt. Über «…» pro Person änderst du Rolle, Status und PIN.')}</p>
      <div class="list" id="ub"></div></section>`;
  $('#acc-h').addEventListener('click', e => {
    if (e.target.closest('#infob')) { $('#infotxt').hidden = !$('#infotxt').hidden; return; }
    if (!e.target.closest('#addu')) $('.acc').classList.toggle('open');
  });
  const body = $('#ub');
  const draw = () => {
    body.innerHTML = users.map(u => {
      const self = u.id === me0.id;
      const n = maps.filter(m => m.owner === u.id).length;
      return `<div class="urow"><div class="avatar sm ${u.active ? '' : 'off'}">${esc((u.name || '?').trim().charAt(0).toUpperCase())}</div>
        <div class="grow"><div class="uname">${esc(u.name)}${self ? ` <span class="meta">(${t('du')})</span>` : ''}${u.isAdmin ? `<span class="badge">Admin</span>` : ''}${u.active ? '' : `<span class="badge gray">${t('deaktiviert')}</span>`}</div>
          <div class="meta">${esc(fmtPhone(u.phone))} · ${n} ${t('Maps')}</div></div>
        <button class="ibtn" data-act="menu" data-id="${esc(u.id)}" aria-label="${t('Weitere Aktionen')}: ${esc(u.name)}" title="${t('Weitere Aktionen')}">${ic('more')}</button></div>`;
    }).join('');
  };
  draw();
  const reload = () => viewAdmin();

  $('#addu').onclick = () => {
    const md = modal(`<h2>${t('Person anlegen')}</h2>
      <form id="cf" autocomplete="off">
        <label>${t('Name')}<input id="cn" required maxlength="40"></label>
        <label>${t('Mobilnummer')}${phoneField('cmcc', 'cm')}</label>
        <label>${t('PIN (leer = letzte 6 Ziffern)')}<input id="cp" maxlength="6" inputmode="numeric" pattern="[0-9]{6}"></label>
        <label class="chk"><input type="checkbox" id="ca"> ${t('Admin')}</label>
        <div class="foot"><button type="button" class="btn" data-close>${t('Abbrechen')}</button><button class="btn primary">${t('Anlegen')}</button></div></form>`);
    $('#cn', md.el).focus();
    $('#cf', md.el).addEventListener('submit', async e => {
      e.preventDefault();
      try { await API.createUser({ name: $('#cn', md.el).value, phone: composePhone($('#cmcc', md.el).value, $('#cm', md.el).value), pin: $('#cp', md.el).value, isAdmin: $('#ca', md.el).checked }); md.close(); toast(t('Person angelegt')); reload(); }
      catch (err) { fail(err); }
    });
  };

  const pinDialog = u => {
    const md = modal(`<h2>${t('PIN zurücksetzen')}: ${esc(u.name)}</h2>
      <label>${t('Neue PIN (leer = letzte 6 Ziffern der Mobilnummer)')}<input id="np" maxlength="6" inputmode="numeric" pattern="[0-9]{6}" autofocus></label>
      <div class="foot"><button class="btn" data-close>${t('Abbrechen')}</button><button class="btn primary" id="ok">${t('Speichern')}</button></div>`);
    $('#ok', md.el).onclick = async () => { try { await API.resetPin(u.id, $('#np', md.el).value); md.close(); toast(t('PIN gesetzt')); } catch (err) { fail(err); } };
  };
  const delDialog = u => {
    const md = modal(`<h2>${t('Person löschen?')}</h2><p>${esc(u.name)}</p><p class="meta">${t('Maps dieser Person gehen an dich über.')}</p>
      <div class="foot"><button class="btn" data-close>${t('Abbrechen')}</button><button class="btn danger" id="ok">${t('Löschen')}</button></div>`);
    $('#ok', md.el).onclick = async () => { try { await API.deleteUser(u.id); md.close(); reload(); } catch (err) { fail(err); } };
  };
  const upd = async (id, patch) => { try { await API.updateUser(id, patch); reload(); } catch (err) { fail(err); } };

  body.addEventListener('click', e => {
    const el = e.target.closest('[data-act="menu"]'); if (!el || !me0.isAdmin) return;
    const u = users.find(x => x.id === el.dataset.id), self = u.id === me0.id;
    sheet(u.name, [
      { icon: 'admin', id: 'u-admin', label: u.isAdmin ? t('Admin entziehen') : t('Zum Admin machen'), disabled: self, run: () => upd(u.id, { isAdmin: !u.isAdmin }) },
      { icon: 'power', id: 'u-active', label: u.active ? t('Deaktivieren') : t('Aktivieren'), disabled: self, run: () => upd(u.id, { active: !u.active }) },
      { icon: 'key', id: 'u-pin', label: t('PIN zurücksetzen'), run: () => pinDialog(u) },
      { icon: 'trash', id: 'u-del', label: t('Löschen'), danger: true, disabled: self, run: () => delDialog(u) }
    ]);
  });
}

/* ---------- Designer ---------- */
async function viewDesigner(id) {
  const m = await API.getMap(id);
  const edit = canEdit(m.role);
  let data = sanitize(m.data), title = m.title;
  let sel = null, tool = 'select', linkFrom = null, drag = null, saveT = null, dirty = false, panelKey = '';
  const undo = [], redo = [];

  setTop('', { back: '#/library',
    titleHtml: `<input class="title" id="mt" value="${esc(title)}" maxlength="100" ${edit ? '' : 'readonly'} aria-label="${t('Titel')}">`,
    right: `${edit ? '' : `<span class="badge gray">${t('Nur lesen')}</span>`}${iconBtn('more', 'more', t('Weitere Aktionen'))}` });
  view().innerHTML = `<div class="d-toolbar">
      ${edit ? `<div class="tools"><button class="tbtn tool active" data-tool="select">${ic('select')}<span>${t('Auswählen')}</span></button>
      <button class="tbtn tool" data-tool="add">${ic('node')}<span>${t('Baustein')}</span></button>
      <button class="tbtn tool" data-tool="link">${ic('link')}<span>${t('Verbinden')}</span></button></div>
      ${iconBtn('undo', 'undo', t('Rückgängig'))}${iconBtn('redo', 'redo', t('Wiederholen'))}` : ''}
      <span id="status">${t('Gespeichert')}</span></div>
    <div class="d-main"><div class="d-canvas ${edit ? 'edit' : ''}" id="canvas"></div><aside class="d-panel card" id="panel"></aside></div>`;
  const host = $('#canvas'), panel = $('#panel'), status = $('#status');

  const byId = k => data.nodes.find(n => n.id === k);
  const snap = () => JSON.stringify(data);
  const syncBtns = () => { if (!edit) return; $('#undo').disabled = !undo.length; $('#redo').disabled = !redo.length; };
  const pushUndo = () => { undo.push(snap()); if (undo.length > 100) undo.shift(); redo.length = 0; syncBtns(); };
  const draw = () => { host.innerHTML = mapSvg(data, { id: 'd', sel, linkFrom }); };
  const toSvg = e => {
    const r = host.querySelector('svg').getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * G.W, y: (e.clientY - r.top) / r.height * G.H };
  };

  async function flush() {
    clearTimeout(saveT);
    if (!dirty) return;
    dirty = false;
    try { await API.saveMap(id, { title, data }); status.textContent = t('Gespeichert'); }
    catch (e) { console.error(e); dirty = true; status.textContent = t('Fehler beim Speichern'); }
  }
  function changed() {
    if (!edit) return;
    dirty = true; status.textContent = t('Ungespeichert …');
    clearTimeout(saveT); saveT = setTimeout(flush, 700);
  }

  function select(k) {
    sel = k; tool === 'link' || (linkFrom = null);
    draw(); renderPanel();
  }
  function setTool(tl) {
    tool = tl; linkFrom = null;
    document.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === tl));
    host.style.cursor = tl === 'add' ? 'crosshair' : '';
    draw();
  }

  /* Panel */
  const opt = (arr, cur, labelFn) => arr.map(v => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(labelFn(v))}</option>`).join('');
  async function renderPanel() {
    const n = sel && byId(sel);
    panelKey = n ? n.id : '';
    if (!n) {
      panel.innerHTML = `<h3>${t('Legende')}</h3>
        <div class="legend"><span class="dot anchor"></span>${t('Anker (Nutzer)')}</div>
        <div class="legend"><span class="dot std"></span>${t('Standard, einkaufen')}</div>
        <div class="legend"><span class="dot diff"></span>${t('Selbst bauen (Differenzierung)')}</div>
        <p class="meta">${edit ? t('Klicke einen Baustein an, um ihn zu bearbeiten. Mit + Baustein setzt du einen neuen Punkt aufs Canvas.') : t('Klicke einen Baustein an, um Details zu sehen.')}</p>
        <h3 style="margin-top:16px">${t('Versionen')}</h3><div id="vl" class="meta">…</div>`;
      try {
        const vs = await API.listVersions(id);
        const box = $('#vl', panel); if (!box) return;
        box.innerHTML = vs.length ? vs.map(v => `<div class="vrow"><span>${esc(v.label || t('Version'))}<br><small>${esc(fmtDate(v.created))} · ${esc(v.byName)}</small></span>${edit ? `<button class="btn small" data-restore="${esc(v.id)}">${t('Wiederherstellen')}</button>` : ''}</div>`).join('') : t('Noch keine Versionen.');
      } catch (e) { console.error(e); }
      return;
    }
    const links = data.links.filter(l => l.from === n.id || l.to === n.id).map(l => byId(l.from === n.id ? l.to : l.from)).filter(Boolean);
    const linkHtml = `<h3 style="margin-top:14px">${t('Verbindungen')}</h3><div class="links-list">${links.length ? links.map(o => `<div class="vrow"><span>${esc(o.name)}</span>${edit ? `<button data-unlink="${esc(o.id)}" aria-label="${t('Entfernen')}">×</button>` : ''}</div>`).join('') : `<span class="meta">${t('Keine')}</span>`}</div>`;
    if (!edit) {
      panel.innerHTML = `<h3>${esc(n.name)}</h3><p class="meta">${n.type === 'anchor' ? t('Anker (Nutzer)') : n.type === 'note' ? t('Notiz') : n.build ? t('Selbst bauen (Differenzierung)') : t('Standard, einkaufen')}</p>
        ${n.desc ? `<div class="ro">${esc(n.desc)}</div>` : ''}${linkHtml}`;
      return;
    }
    const comp = n.type === 'component';
    panel.innerHTML = `<h3>${t('Baustein')}</h3>
      <label>${t('Name')}<input data-f="name" id="f-name" value="${esc(n.name)}" maxlength="80"></label>
      <label>${t('Typ')}<select data-f="type">${opt(TYPES, n.type, v => ({ component: t('Baustein'), anchor: t('Anker (Nutzer)'), note: t('Notiz') }[v]))}</select></label>
      ${comp ? `<label>${t('Kategorie')}<select data-f="build">${opt(['std', 'diff'], n.build ? 'diff' : 'std', v => v === 'diff' ? t('Selbst bauen (Differenzierung)') : t('Standard, einkaufen'))}</select></label>` : ''}
      <label>${t('Beschriftung')}<select data-f="label">${opt(LABELS, n.label, v => ({ right: t('rechts'), left: t('links'), below: t('unten'), above: t('oben') }[v]))}</select></label>
      ${n.type !== 'note' ? `<label>${t('Entwicklung')}</label><div class="evo"><label class="chk" style="margin:0"><input type="checkbox" data-f="evoOn" ${typeof n.evo === 'number' ? 'checked' : ''}> ${t('Pfeil')}</label>
        <input type="range" data-f="evo" min="0" max="100" value="${Math.round((typeof n.evo === 'number' ? n.evo : n.x) * 100)}" ${typeof n.evo === 'number' ? '' : 'disabled'} aria-label="${t('Entwicklung')}"></div>` : ''}
      <label>${t('Beschreibung')}<textarea data-f="desc" rows="3" maxlength="500">${esc(n.desc)}</textarea></label>
      ${linkHtml}
      <button class="btn danger" style="margin-top:14px" data-act="del">${t('Baustein löschen')}</button>`;
  }

  panel.addEventListener('focusin', e => { if (edit && e.target.dataset && e.target.dataset.f) pushUndo(); });
  panel.addEventListener('input', e => {
    const f = e.target.dataset.f, n = sel && byId(sel);
    if (!edit || !f || !n) return;
    if (f === 'name') n.name = e.target.value.slice(0, 80);
    else if (f === 'desc') n.desc = e.target.value.slice(0, 500);
    else if (f === 'evo') n.evo = clamp(Math.max(Number(e.target.value) / 100, n.x + 0.02), 0, 1);
    else return;
    draw(); changed();
  });
  panel.addEventListener('change', e => {
    const f = e.target.dataset.f, n = sel && byId(sel);
    if (!edit || !f || !n) return;
    if (f === 'type') { n.type = TYPES.includes(e.target.value) ? e.target.value : 'component'; renderPanel(); }
    else if (f === 'build') n.build = e.target.value === 'diff';
    else if (f === 'label') n.label = LABELS.includes(e.target.value) ? e.target.value : 'right';
    else if (f === 'evoOn') { if (e.target.checked) n.evo = clamp(n.x + 0.15, 0, 1); else delete n.evo; renderPanel(); }
    else return;
    draw(); changed();
  });
  panel.addEventListener('click', async e => {
    if (!edit) return;
    const un = e.target.dataset.unlink, rs = e.target.dataset.restore;
    if (un && sel) { pushUndo(); data.links = data.links.filter(l => !((l.from === sel && l.to === un) || (l.to === sel && l.from === un))); draw(); renderPanel(); changed(); }
    else if (e.target.dataset.act === 'del' && sel) deleteNode(sel);
    else if (rs) {
      try {
        const d = await API.getVersionData(id, rs);
        pushUndo(); data = sanitize(d); sel = null; draw(); renderPanel(); changed(); toast(t('Version wiederhergestellt'));
      } catch (err) { fail(err); }
    }
  });

  function deleteNode(k) {
    pushUndo();
    data.nodes = data.nodes.filter(n => n.id !== k);
    data.links = data.links.filter(l => l.from !== k && l.to !== k);
    sel = null; draw(); renderPanel(); changed();
  }
  function doUndo(from, to) {
    if (!from.length) return;
    to.push(snap()); data = JSON.parse(from.pop());
    if (sel && !byId(sel)) sel = null;
    draw(); renderPanel(); changed(); syncBtns();
  }

  /* Canvas-Interaktion */
  host.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-node]'), pt = toSvg(e);
    if (!edit) { select(g ? g.dataset.node : null); return; }
    if (tool === 'add' && !g) {
      pushUndo();
      const n = { id: uid(), name: t('Neuer Baustein'), x: clamp(nx(pt.x), 0, 1), y: clamp(ny(pt.y), 0, 1), type: 'component', build: false, label: 'right', desc: '' };
      data.nodes.push(n); setTool('select'); select(n.id); changed();
      const f = $('#f-name'); if (f) { f.focus(); f.select(); }
      return;
    }
    if (tool === 'link') {
      if (!g) { linkFrom = null; draw(); return; }
      const k = g.dataset.node;
      if (!linkFrom) { linkFrom = k; sel = k; draw(); renderPanel(); }
      else if (linkFrom !== k) {
        pushUndo();
        const i = data.links.findIndex(l => (l.from === linkFrom && l.to === k) || (l.from === k && l.to === linkFrom));
        if (i >= 0) data.links.splice(i, 1); else data.links.push({ from: linkFrom, to: k });
        linkFrom = null; sel = k; draw(); renderPanel(); changed();
      }
      return;
    }
    if (g) {
      const k = g.dataset.node, n = byId(k);
      if (sel !== k) select(k);
      drag = { id: k, dx: pt.x - px(n.x), dy: pt.y - py(n.y), moved: false };
      try { host.setPointerCapture(e.pointerId); } catch (err) { /* ignorieren */ }
    } else select(null);
  });
  host.addEventListener('pointermove', e => {
    if (!drag) return;
    const pt = toSvg(e), n = byId(drag.id); if (!n) return;
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    n.x = clamp(nx(pt.x - drag.dx), 0, 1);
    n.y = clamp(ny(pt.y - drag.dy), 0, 1);
    draw();
  });
  const endDrag = () => { if (drag && drag.moved) changed(); drag = null; };
  host.addEventListener('pointerup', endDrag);
  host.addEventListener('pointercancel', endDrag);

  const onKey = e => {
    if (!edit) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); deleteNode(sel); }
    else if (e.key === 'Escape') { setTool('select'); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(undo, redo); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doUndo(redo, undo); }
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => { flush(); document.removeEventListener('keydown', onKey); cleanup = () => {}; };

  /* Toolbar */
  let saveVersion = () => {};
  if (edit) {
    document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    $('#undo').onclick = () => doUndo(undo, redo);
    $('#redo').onclick = () => doUndo(redo, undo);
    $('#mt').addEventListener('input', e => { title = e.target.value.slice(0, 100); changed(); });
    saveVersion = () => {
      const md = modal(`<h2>${t('Version speichern')}</h2>
        <label>${t('Bezeichnung')}<input id="vlab" maxlength="80" placeholder="${t('z. B. Stand Q4')}" autofocus></label>
        <div class="foot"><button class="btn" data-close>${t('Abbrechen')}</button><button class="btn primary" id="ok">${t('Speichern')}</button></div>`);
      $('#ok', md.el).onclick = async () => {
        try { await flush(); await API.addVersion(id, $('#vlab', md.el).value); md.close(); toast(t('Version gespeichert')); if (!sel) renderPanel(); }
        catch (err) { fail(err); }
      };
    };
  }
  $('#more').onclick = () => sheet(title, (edit ? [{ icon: 'save', id: 'ver', label: t('Version speichern'), run: saveVersion }] : []).concat([
    { icon: 'download', id: 'exs', label: t('Export SVG'), run: () => download(fileSafe(title) + '.svg', mapSvg(data, { id: 'x' }), 'image/svg+xml') },
    { icon: 'download', id: 'exj', label: t('Export JSON'), run: () => download(fileSafe(title) + '.json', JSON.stringify({ title, data }, null, 2), 'application/json') }]));

  syncBtns(); draw(); renderPanel();
  void panelKey;
}

/* ---------- Router und Start ---------- */
async function route() {
  cleanup();
  const u = API.me();
  if (!u) { renderLogin(); return; }
  shell(u);
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (parts[0] === 'map' && parts[1]) await viewDesigner(parts[1]);
    else if (parts[0] === 'profile') await viewProfile();
    else if (parts[0] === 'admin') {
      if (!u.isAdmin) { location.hash = '#/library'; return; }
      await viewAdmin();
    } else await viewLibrary();
  } catch (e) {
    console.error(e);
    view().innerHTML = `<div class="card"><p>${esc(e.message || String(e))}</p><a href="#/library">${t('Zur Library')}</a></div>`;
  }
}

function registerSw() {
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(e => console.error('SW', e));
  }
}
async function boot() {
  applyTheme();
  if (root.matchMedia) { try { root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (prefs.theme === 'auto') applyTheme(); }); } catch (e) { console.error(e); } }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
  window.addEventListener('hashchange', route);
  registerSw();
  try { await API.init(); }
  catch (e) {
    console.error(e);
    $('#app').innerHTML = `<main><div class="card"><h2>${t('Start fehlgeschlagen')}</h2><p>${esc(e.message || String(e))}</p></div></main>`;
    return;
  }
  route();
}

if (typeof document !== 'undefined' && document.getElementById('app')) boot();
root.WM = { API, mapSvg, sanitize, teaTemplate, loadDb, CFG, makeSupabaseApi, normPhone, fmtPhone, defaultPin, phoneToEmail };

})(typeof window !== 'undefined' ? window : globalThis);
