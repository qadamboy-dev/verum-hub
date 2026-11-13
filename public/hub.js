/* hub.js — everything verum.cam does in the browser.
 *
 * A classic script loaded from <head>, so it runs before the body is parsed:
 * the CSP allows scripts from 'self' and nothing inline. ES5 on purpose: it
 * is not bundled, and old WebViews (Android 4.4, KaiOS) run it as it is.
 * Every page reads fine without it, in English.
 *
 *  1. A link into the messenger that still lands here (a notification opened
 *     verum.cam/#chat=<id> while the messenger lived on this domain) goes on
 *     to chat.verum.cam with its hash, before anything paints.
 *  2. The language: a saved choice (verum_lang, the key the messenger used
 *     here), else the browser's first language: Russian → ru, Uzbek → uz,
 *     anything else → en. It goes on <html data-lang>, and the stylesheet
 *     shows only that language's text, so nothing flashes. pick() follows
 *     src/content/langs.js pickLang(); src/hub.test.js runs both.
 *  3. The RU / EN / UZ buttons switch the language and remember it.
 *  4. The legal pages carry the RU and EN documents. Section ids (link
 *     targets such as /privacy#delete-account, Google Play's deletion URL)
 *     sit on the one shown, so a link with a hash lands on it.
 */
(function (window, document) {
  'use strict';

  var LANGS = ['en', 'ru', 'uz'];
  var DOC_LANG = { en: 'en', ru: 'ru', uz: 'ru' };
  var KEY = 'verum_lang';
  var CHAT = 'https://chat.verum.cam/';
  var root = document.documentElement;

  try {
    var path = window.location.pathname;
    if ((path === '/' || path === '/index.html') && /^#chat=/.test(window.location.hash)) {
      window.location.replace(CHAT + window.location.hash);
      return;
    }
  } catch (e) { /* no location to read: stay */ }

  function has(list, value) {
    for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
    return false;
  }

  function pick(saved, browserLangs) {
    if (has(LANGS, saved)) return saved;
    var first = String((browserLangs && browserLangs[0]) || '').toLowerCase();
    if (first.indexOf('ru') === 0) return 'ru';
    if (first.indexOf('uz') === 0) return 'uz';
    return 'en';
  }

  function saved() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function browserLangs() {
    try {
      var n = window.navigator;
      return n.languages && n.languages.length ? n.languages : [n.language || n.userLanguage || ''];
    } catch (e) {
      return [];
    }
  }

  function matches(el, selector) {
    var fn = el.matches || el.msMatchesSelector || el.webkitMatchesSelector;
    return !!fn && fn.call(el, selector);
  }

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (matches(el, selector)) return el;
      el = el.parentNode;
    }
    return null;
  }

  // The buttons' state and the legal sections' ids follow the language
  function sync(lang) {
    var buttons = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-set-lang') === lang ? 'true' : 'false');
    }
    var docLang = DOC_LANG[lang];
    var sections = document.querySelectorAll('[data-section-id]');
    for (var j = 0; j < sections.length; j++) {
      var doc = closest(sections[j], '.l-doc');
      if (doc && doc.getAttribute('lang') === docLang) sections[j].id = sections[j].getAttribute('data-section-id');
      else sections[j].removeAttribute('id');
    }
  }

  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var title = document.querySelector('meta[name="verum:title-' + lang + '"]');
    if (title) document.title = title.getAttribute('content');
    if (document.body) sync(lang);
  }

  // The browser looked for the hash's target while it parsed, maybe before
  // the document shown had its ids
  function jumpToHash() {
    var id = '';
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (e) { return; }
    var target = id ? document.getElementById(id) : null;
    if (target && target.scrollIntoView) target.scrollIntoView();
  }

  apply(pick(saved(), browserLangs()));

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 3 ? event.target.parentNode : event.target;
    var button = closest(target, '[data-set-lang]');
    if (!button) return;
    var lang = button.getAttribute('data-set-lang');
    if (!has(LANGS, lang)) return;
    apply(lang);
    try { window.localStorage.setItem(KEY, lang); } catch (e) { /* not remembered */ }
    if (document.querySelector('.l-doc')) jumpToHash();
  });

  function ready() {
    sync(root.getAttribute('data-lang'));
    if (document.querySelector('.l-doc')) jumpToHash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})(window, document);
