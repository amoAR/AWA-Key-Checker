// ==UserScript==
// @name            AWA Giveaway Key Checker
// @namespace       AWAKeyChecker
// @version         5.3.0
// @description     Show saved giveaway keys, tier requirements, restrictions and basic giveaway info.
// @author          amoAR
// @license         GPL-3.0
// @icon            https://media.alienwarearena.com/images/favicons/favicon-32x32.png
// @homepageURL     https://github.com/amoAR/AWA-Key-Checker
// @supportURL      https://github.com/amoAR/AWA-Key-Checker/issues
// @updateURL       https://github.com/amoAR/AWA-Key-Checker/raw/main/AWACheck.user.js
// @downloadURL     https://github.com/amoAR/AWA-Key-Checker/raw/main/AWACheck.user.js
// @match           https://*.alienwarearena.com/ucf/show/*
// @exclude         https://*.alienwarearena.com/ucf/increment*
// @require         https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.1/waitForKeyElements.js
// @run-at          document-start
// @noframes
// @grant           unsafeWindow
// @grant           GM_info
// @grant           GM_addStyle
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_deleteValue
// @grant           GM_addValueChangeListener
// @grant           GM_registerMenuCommand
// @grant           GM_unregisterMenuCommand
// @compatible      Firefox
// @compatible      Chrome
// @compatible      Opera
// ==/UserScript==

/* global waitForKeyElements, unsafeWindow */

(function () {
  'use strict';

  /* --------------------------
     Constants
  ---------------------------*/

  const DEBUG = true;
  const LOG_PREFIX = '[AWA Key Checker]';

  const WIDGET_ID = 'awa-key-checker';
  const COLLAPSE_ID = 'awa-key-checker-collapse';
  const RGB_CLASS = 'awa-key-checker--rgb';
  const REVEALED_CLASS = 'awa-key-checker__key--revealed';

  const STORAGE_KEY_RGB = 'rgbEnabled';
  const STORAGE_KEY_DB = 'giveawayKeyDatabase';
  const LEGACY_STORAGE_KEY = 'configuration';

  const FEW_COUNTRIES_CUTOFF = 6;
  const NO_KEYS_IMAGE_URL = 'https://cdn3.emoji.gg/emojis/9174-no-bitches-megamind.png';

  const KEY_REVEAL_TIMEOUT_MS = 10_000;
  const MASKED_KEY = '●●●●●●●●';

  const COUNTRY_NAME_OVERRIDES = {
    AN: 'Netherlands Antilles',
    CS: 'Serbia and Montenegro',
  };

  const TIER_NAMES = {
    1: 'LUNAR',
    2: 'PLANETARY',
    3: 'SOLAR',
    4: 'GALACTIC',
    5: 'INTERSTELLAR',
  };

  /* --------------------------
     Helpers
  ---------------------------*/

  const log = (...args) => {
    if (DEBUG) console.log(`%c${LOG_PREFIX}`, 'color: orange; font-weight: bold', ...args);
  };
  const logError = (...args) => console.error(LOG_PREFIX, ...args);

  const isObject = (value) => value !== null && typeof value === 'object';

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);

  const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'code' });

  function getCountryName(code) {
    if (COUNTRY_NAME_OVERRIDES[code]) return COUNTRY_NAME_OVERRIDES[code];
    try {
      return regionNames.of(code);
    } catch {
      return code;
    }
  }

  function formatTier(tier) {
    const name = TIER_NAMES[Number(tier)];
    return name ? `${tier} - (${name})` : String(tier);
  }

  function getCountryKeys() {
    const countryKeys = unsafeWindow.countryKeys;
    return isObject(countryKeys) ? countryKeys : null;
  }

  function getGiveawayKeys() {
    const giveawayKeys = unsafeWindow.giveawayKeys;
    return isObject(giveawayKeys) ? giveawayKeys : null;
  }

  function getCurrentGiveawayId() {
    return location.pathname.match(/^\/ucf\/show\/(\d+)/)?.[1] ?? null;
  }

  const TIME_UNITS = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];

  const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  function formatRelativeTime(isoString) {
    if (!isoString) return null;
    const then = new Date(isoString).getTime();
    if (Number.isNaN(then)) return null;

    const diffSeconds = Math.round((then - Date.now()) / 1000);
    for (const [unit, secondsInUnit] of TIME_UNITS) {
      if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'second') {
        return relativeFormatter.format(Math.round(diffSeconds / secondsInUnit), unit);
      }
    }
    return null;
  }

  /* --------------------------
     Settings
  ---------------------------*/

  let rgbEnabled = false;
  let menuCommandId;

  function migrateLegacySettings() {
    const legacy = GM_getValue(LEGACY_STORAGE_KEY);
    if (legacy === undefined) return;
    try {
      const legacySettings = typeof legacy === 'string' ? JSON.parse(legacy) : legacy;
      if (GM_getValue(STORAGE_KEY_RGB) === undefined && typeof legacySettings?.rgb_enabled === 'boolean') {
        GM_setValue(STORAGE_KEY_RGB, legacySettings.rgb_enabled);
      }
    } catch (error) {
      logError('Could not migrate the old settings', error);
    }
    GM_deleteValue(LEGACY_STORAGE_KEY);
  }

  function applyRgbState(enabled) {
    rgbEnabled = Boolean(enabled);
    document.getElementById(WIDGET_ID)?.classList.toggle(RGB_CLASS, rgbEnabled);
    registerMenuCommand();
  }

  function registerMenuCommand() {
    if (menuCommandId !== undefined) GM_unregisterMenuCommand(menuCommandId);
    menuCommandId = GM_registerMenuCommand(
      `RGB effects: ${rgbEnabled ? 'ON' : 'OFF'} (click to toggle)`,
      () => {
        GM_setValue(STORAGE_KEY_RGB, !rgbEnabled);
        applyRgbState(!rgbEnabled);
      }
    );
  }

  /* --------------------------
     Key database (GM sync)
  ---------------------------*/

  function loadDatabase() {
    const raw = GM_getValue(STORAGE_KEY_DB, {});
    return isObject(raw) ? raw : {};
  }

  function saveDatabase(db) {
    GM_setValue(STORAGE_KEY_DB, db);
  }

  function syncGiveawayKeys() {
    const entries = getGiveawayKeys();
    if (!entries) {
      log('No `giveawayKeys` on this page, database not updated');
      return loadDatabase();
    }

    const db = loadDatabase();
    let changed = false;
    let seen = 0;

    for (const entry of Object.values(entries)) {
      if (!isObject(entry)) continue;
      const giveawayId = entry.giveaway_id ?? entry.giveawayId ?? entry.id;
      if (giveawayId == null) continue;
      seen += 1;

      const id = String(giveawayId);
      const next = {
        key: entry.value ?? entry.key ?? null,
        status: entry.status ?? null,
        assignedAt: entry.assigned_at ?? null,
        savedAt: new Date().toISOString(),
      };

      const existing = db[id];
      const same =
        existing &&
        existing.key === next.key &&
        existing.status === next.status &&
        existing.assignedAt === next.assignedAt;

      if (!same) {
        db[id] = next;
        changed = true;
      }
    }

    if (changed) {
      saveDatabase(db);
      log(`Database updated: ${Object.keys(db).length} entries stored (${seen} seen this page)`);
    } else {
      log(`Database already up to date (${seen} seen, ${Object.keys(db).length} stored)`);
    }
    return db;
  }

  function getDbEntry(giveawayId) {
    return giveawayId ? loadDatabase()[giveawayId] ?? null : null;
  }

  /* --------------------------
     Page metadata (JSON-LD)
  ---------------------------*/

  function getPublishedAt() {
    const script = document.querySelector('script[type="application/ld+json"]');
    if (!script) return null;
    try {
      const data = JSON.parse(script.textContent);
      return data?.datePublished ?? null;
    } catch (error) {
      logError('Could not parse JSON-LD', error);
      return null;
    }
  }

  /* --------------------------
     Key data analysis
  ---------------------------*/

  const hasAnyKeys = (tiers) =>
    isObject(tiers) && Object.values(tiers).some((keyCount) => Number(keyCount) > 0);

  function analyzeCountries(countryKeys, nameOf = getCountryName) {
    const withKeys = [];
    const withoutKeys = [];
    let tiers = null;

    for (const [code, countryTiers] of Object.entries(countryKeys)) {
      if (hasAnyKeys(countryTiers)) {
        withKeys.push(nameOf(code));
        tiers ??= Object.entries(countryTiers);
      } else {
        withoutKeys.push(nameOf(code));
      }
    }

    const byName = (a, b) => a.localeCompare(b, 'en');
    return { withKeys: withKeys.sort(byName), withoutKeys: withoutKeys.sort(byName), tiers };
  }

  /* --------------------------
     Content model
  ---------------------------*/

  function buildModel() {
    const countryKeys = getCountryKeys() ?? {};
    const { withKeys, withoutKeys, tiers } = analyzeCountries(countryKeys);

    const giveawayId = getCurrentGiveawayId();
    const dbEntry = getDbEntry(giveawayId);
    const publishedAt = getPublishedAt();

    return {
      rgb: rgbEnabled,
      hasKeys: withKeys.length > 0,
      withKeys,
      withoutKeys,
      tiers,
      giveawayId,
      publishedAt,
      publishedAtRelative: formatRelativeTime(publishedAt),
      savedKey: dbEntry?.key ?? null,
      savedStatus: dbEntry?.status ?? null,
    };
  }

  /* --------------------------
     HTML Template
  ---------------------------*/

  const heading = (type, html) =>
    `<h5 class="awa-key-checker__heading awa-key-checker__heading--${type}">${html}</h5>`;

  const dividerH = '<hr class="awa-key-checker__divider">';
  const dividerV = '<div class="awa-key-checker__divider--vertical" aria-hidden="true"></div>';

  function describeAvailability(withCount, withoutCount) {
    if (withoutCount === 0) return 'Every country has keys available!';
    if (withCount === 1) return 'Only <strong>one</strong> country has keys available!';
    if (withCount <= FEW_COUNTRIES_CUTOFF) return `Only <strong>${withCount}</strong> countries have keys available!`;
    if (withCount === withoutCount) return 'Some countries have keys available!';
    if (withCount < withoutCount) return 'Few countries have keys available!';
    return 'Most countries have keys available!';
  }

  function renderWidget(model) {
    const {
      rgb, hasKeys, withKeys, withoutKeys, tiers,
      giveawayId, publishedAt, publishedAtRelative,
      savedKey, savedStatus,
    } = model;

    /* --- Section 1: Key availability --- */
    const availabilityBlock = hasKeys
      ? `
        ${heading('success', 'Key Availability: 🔑')}
        <p>${describeAvailability(withKeys.length, withoutKeys.length)}</p>
        ${(tiers ?? []).map(([tier, keyCount]) => `
          <ul>
            <li>🔸 Tier: ${escapeHtml(formatTier(tier))}</li>
            <li>🔸 Keys: ${escapeHtml(keyCount)}</li>
          </ul>`).join('')}
        ${withoutKeys.length > 0
          ? (() => {
              const listWithKeys = withKeys.length <= FEW_COUNTRIES_CUTOFF;
              const names = (listWithKeys ? withKeys : withoutKeys).map(escapeHtml).join(', ');
              const title = listWithKeys
                ? heading('info', 'Countries with keys: ✔️')
                : heading('danger', 'Countries without keys: 🚫');
              return `${dividerH}${title}<p>${names}</p>`;
            })()
          : ''}`
      : `
        ${heading('warning', 'No keys? 🥺')}
        <img src="${NO_KEYS_IMAGE_URL}" width="85" height="85" alt="">`;

    /* --- Section 2: Giveaway info --- */
    const keyLine = savedKey
      ? `<span class="awa-key-checker__key" data-key="${escapeHtml(savedKey)}" role="button" tabindex="0" title="Click to reveal and copy">${MASKED_KEY}</span>`
      : `<span class="awa-key-checker__key awa-key-checker__key--none">not obtained</span>`;

    const infoRows = [
      giveawayId ? `<li>🔸 ID: ${escapeHtml(giveawayId)}</li>` : '',
      publishedAt
        ? `<li>🔸 Published: <span title="${escapeHtml(publishedAt)}">${escapeHtml(publishedAtRelative ?? publishedAt)}</span></li>`
        : '',
      `<li>🔸 Key: ${keyLine}</li>`,
      savedStatus ? `<li>🔸 Status: ${escapeHtml(savedStatus)}</li>` : '',
    ].filter(Boolean).join('');

    const infoBlock = infoRows
      ? `${heading('info', 'Giveaway info: 📋')}<ul>${infoRows}</ul>`
      : '';

    return `
      <div class="accordion-wrapper awa-key-checker${rgb ? ` ${RGB_CLASS}` : ''}" id="${WIDGET_ID}">
        <div class="accordion-header">
          <button class="custom-accordion-btn" type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#${COLLAPSE_ID}"
                  aria-expanded="true"
                  aria-controls="${COLLAPSE_ID}">
            <span>Key Availability</span>
          </button>
        </div>
        <div id="${COLLAPSE_ID}" class="collapse show" data-bs-parent="#${WIDGET_ID}">
          <div class="accordion-body awa-key-checker__body">
            <div class="awa-key-checker__content">
              <section class="awa-key-checker__section">
                ${availabilityBlock}
              </section>
              ${dividerV}
              <section class="awa-key-checker__section">
                ${infoBlock}
              </section>
            </div>
          </div>
        </div>
      </div>`;
  }

  function paintWidget() {
    const existing = document.getElementById(WIDGET_ID);
    if (!existing) return;
    existing.outerHTML = renderWidget(buildModel());
  }

  /* --------------------------
     Key reveal
  ---------------------------*/

  const revealTimers = new WeakMap();

  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch((error) => logError('Clipboard write failed', error));
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      logError('execCommand copy failed', error);
    }
    textarea.remove();
  }

  function selectElementText(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function revealKey(el) {
    const key = el.dataset.key;
    if (!key) return;

    el.textContent = key;
    el.classList.add(REVEALED_CLASS);
    copyToClipboard(key);
    selectElementText(el);

    clearTimeout(revealTimers.get(el));
    revealTimers.set(el, setTimeout(() => {
      el.textContent = MASKED_KEY;
      el.classList.remove(REVEALED_CLASS);
    }, KEY_REVEAL_TIMEOUT_MS));
  }

  function handleKeyInteraction(event) {
    const el = event.target.closest?.('.awa-key-checker__key');
    if (!el || el.classList.contains('awa-key-checker__key--none')) return;

    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();

    if (!el.classList.contains(REVEALED_CLASS)) {
      revealKey(el);
    }
  }

  document.addEventListener('click', handleKeyInteraction);
  document.addEventListener('keydown', handleKeyInteraction);

  /* --------------------------
     Styles
  ---------------------------*/

  const WIDGET_CSS = `
    .awa-key-checker {
      margin-bottom: 0.75rem;
      width: 100%;
    }

    .awa-key-checker .awa-key-checker__body {
      padding: 1rem !important;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0 0 10px 10px;
    }

    /* Two sections separated by a real divider element. On wide screens
       the divider becomes a vertical line; on narrow ones it flips back
       to a horizontal one and the grid collapses to a single column. */
    .awa-key-checker .awa-key-checker__content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      align-items: start;
    }

    .awa-key-checker .awa-key-checker__section {
      min-width: 0;
    }

    @media (min-width: 640px) {
      .awa-key-checker .awa-key-checker__content {
        grid-template-columns: 1fr auto 1fr;
        gap: 0 1.5rem;
      }
      .awa-key-checker .awa-key-checker__divider--vertical {
        width: 1.5px;
        height: 100%;
        align-self: stretch;
        background: hsla(0, 0%, 80%, 0.22);
      }
    }

    .awa-key-checker .awa-key-checker__heading {
      font-weight: bolder;
      font-size: larger;
      margin: 0 0 0.5rem;
    }

    .awa-key-checker .awa-key-checker__heading--success { color: #59d17a; }
    .awa-key-checker .awa-key-checker__heading--danger  { color: #ff7c7c; }
    .awa-key-checker .awa-key-checker__heading--warning { color: #ffca5f; }
    .awa-key-checker .awa-key-checker__heading--info    { color: #8fd4ff; }

    .awa-key-checker .awa-key-checker__content p {
      color: #d4dae3;
      margin: 0 0 0.35rem;
    }

    .awa-key-checker .awa-key-checker__content ul {
      color: #d4dae3;
      margin: 0 0 0.35rem;
      padding-left: 0;
      list-style: none;
    }

    .awa-key-checker .awa-key-checker__content li {
      border: none !important;
      padding: 2px 0;
    }

    /* Shared divider shape — horizontal by default, vertical in wide layout */
    .awa-key-checker .awa-key-checker__divider {
      border: 0 !important;
      width: calc(100% + 1.5rem);
      height: 1.3px;
      margin: 0.65rem 0;
      background: hsl(0, 0%, 100%);
    }

    .awa-key-checker .awa-key-checker__content img {
      display: block;
      margin: 0.5rem auto 0;
      pointer-events: none;
    }

    .awa-key-checker .awa-key-checker__key {
      display: inline-block;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
      color: #ffd479;
      font-size: 0.9rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.05em;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease;
    }

    .awa-key-checker .awa-key-checker__key:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .awa-key-checker .awa-key-checker__key--revealed {
      letter-spacing: normal;
      cursor: text;
      user-select: text;
      background: rgba(255, 255, 255, 0.15);
    }

    .awa-key-checker .awa-key-checker__key--none {
      color: #8b949e;
      font-style: italic;
      background: transparent;
      padding: 0;
      cursor: default;
    }

    @keyframes awa-key-checker-gradient {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .awa-key-checker.awa-key-checker--rgb .awa-key-checker__body {
      background: linear-gradient(135deg,
        rgba(20, 255, 233, 0.55),
        rgba(255, 235, 59, 0.45),
        rgba(255, 0, 224, 0.5),
        rgba(0, 255, 255, 0.55));
      background-size: 300% 300%;
      border-radius: 10px;
      padding: 5px !important;
      animation: awa-key-checker-gradient 4s linear infinite;
    }

    .awa-key-checker.awa-key-checker--rgb .awa-key-checker__content {
      background: rgba(22, 27, 34, 0.82);
      backdrop-filter: blur(10px);
      border-radius: 9px;
      padding: 1rem;
    }
  `;

  let stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    GM_addStyle(WIDGET_CSS);
    stylesInjected = true;
  }

  /* --------------------------
     Mounting
  ---------------------------*/

  function findGiveawayPanel() {
    const anchor = document.querySelector('.row.accordion-section > .col')
      || document.querySelector('.accordion-body.js-widget-steps')
      || document.querySelector('.giveaway-redemption-steps')
      || document.querySelector('.giveaway-instructions-title');

    return anchor
      ? anchor.closest('.col') || anchor.closest('.accordion-wrapper') || anchor.parentElement
      : null;
  }

  function mountWidget(panel) {
    if (document.getElementById(WIDGET_ID)) return;

    const countryKeys = getCountryKeys();
    if (!countryKeys) return true;

    try {
      injectStyles();
      panel.insertAdjacentHTML('afterbegin', renderWidget(buildModel()));
      log('Widget added');
    } catch (error) {
      logError('Failed to add the widget', error);
    }
  }

  function startWidget() {
    waitForKeyElements(() => {
      const panel = findGiveawayPanel();
      return panel ? [panel] : [];
    }, mountWidget);
  }

  /* --------------------------
     Init
  ---------------------------*/

  function init() {
    migrateLegacySettings();
    applyRgbState(GM_getValue(STORAGE_KEY_RGB, false));
    GM_addValueChangeListener(STORAGE_KEY_RGB, (_n, _o, v) => {
      applyRgbState(v);
      paintWidget();
    });
    GM_addValueChangeListener(STORAGE_KEY_DB, () => paintWidget());

    log(`v${GM_info.script.version} started`, {
      url: location.href,
      readyState: document.readyState,
      giveawayId: getCurrentGiveawayId(),
    });

    const start = () => {
      syncGiveawayKeys();

      if (getCountryKeys()) {
        startWidget();
      } else {
        window.addEventListener('load', () => {
          syncGiveawayKeys();
          if (getCountryKeys()) startWidget();
          else log('No giveaway data on this page');
        }, { once: true });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  init();
})();
