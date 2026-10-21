(function () {
  const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  const lang = browserLang.startsWith('fr') ? 'fr' : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  window.__I18N_LANG = lang;

  window.getCharHTML = function (ch) {
    if (ch === ' ') return '&nbsp;';
    if (ch === '🡲' || ch === '🡺') return '<svg style="width: 1.25em; height: 1.25em; vertical-align: -0.25em;" viewBox="0 0 84 85" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11 38H54L37 21H51L73 43L51 65H37L54 48H11Z"/></svg>';
    if (ch === '🡼') return '<svg style="width: 1.25em; height: 1.25em; vertical-align: -0.25em;" viewBox="0 0 84 85" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-135 42 42.5)"><path d="M11 38H54L37 21H51L73 43L51 65H37L54 48H11Z"/></g></svg>';
    if (ch === '🞣') return '<svg style="width: 0.9em; height: 0.9em; vertical-align: -0.1em; transform: translateY(-0.1em);" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z"/></svg>';
    return ch;
  };

  if (lang === 'fr') {
    window.__t = function (key) { return null; };
    return;
  }

  const T = {
    'meta.description': 'Creative developer specialized in web interfaces, animation and interactive design. Discover my projects and works.',

    'index.title': 'Luke Baffait, Creative Developer',
    'index.h1': 'Luke Baffait, Creative Developer, computer science student in Vannes, specialized in web development, animation and interactive design.',
    'index.hero.tagline': 'Quiet creator, <span class="other-accent">bringing ideas to life</span>,<br>through motion, detail and softness.',
    'index.about.text': 'As a<span class="other-accent"> creative developer</span>, I craft tailor-made web experiences, blending technical precision and <span class="other-accent">emotion</span>.',
    'index.about.sub': "My name is Luke. A passionate creator and computer science student in Vannes, I build memorable digital experiences, always seeking the symbiosis between art and information.",
    'index.cg.phrase': "Each project is a chance to <span class=\"other-accent\">learn</span>, <span class=\"other-accent\">experiment</span> and push my limits.",
    'index.skills.subtitle': 'Skills',
    'index.skills.text': 'Computer Science student in Vannes, specialized in cybersecurity, passionate about web development and design.',
    'index.skills.frontend': 'Frontend',
    'index.skills.animation': 'Animation & 3D',
    'index.skills.backend': 'Backend',
    'index.skills.database': 'Databases',
    'index.skills.devops': 'DevOps & Tools',
    'index.skills.security': 'System & Security',
    'index.skills.design': 'Design',
    'index.contact.title': 'Contact',
    'index.contact.dispo1': "Looking for an <span class=\"other-accent\">apprenticeship</span> starting September. Eager to join an innovative team and contribute to ambitious projects.",
    'index.contact.dispo2': "I'm available for<span class=\"other-accent\"> freelance missions worldwide</span>, on<span class=\"other-accent\"> your ambitious projects</span> and international collaborations.",
    'index.proj.label': 'Preview',
    'index.detail.back': '🡼BACK',

    'info.title': 'Info, Luke Baffait',
    'info.eyebrow': 'About',
    'info.role': 'Creative developer & computer science student, specialized in web development.',
    'info.desc': "I craft tailor-made web experiences where technical precision meets emotion. Passionate about animation, interaction and <span class=\"other-accent\">detail</span>, I always seek the symbiosis between art and information.",
    'info.meta.based': 'Based in',
    'info.meta.status': 'Status',
    'info.meta.based.value': 'Vannes, France',
    'info.meta.status.value': 'Looking for an apprenticeship',
    'info.skills.frontend': 'Frontend',
    'info.skills.animation': 'Animation & 3D',
    'info.skills.backend': 'Backend',
    'info.skills.security': 'Security & Tools',

    'contact.title': 'Contact, Luke Baffait',
    'contact.panel.title': "Let's talk about your project.",
    'contact.panel.copy': "I respond quickly to apprenticeship requests, freelance missions and collaborations around interactive web experiences.",
    'contact.meta.base': 'Based in',
    'contact.meta.status': 'Status',
    'contact.meta.delay': 'Avg. response',
    'contact.meta.base.value': 'Vannes, France',
    'contact.meta.status.value': 'Student / Freelance',
    'contact.meta.delay.value': '48h',
    'contact.eyebrow': 'Contact',
    'contact.role': 'Creative developer, focused on animation, interaction, and tailor-made web experiences.',
    'contact.desc': "If you have a project in mind, an ambitious idea, I'd be glad to discuss it with you and explore a potential collaboration.",
    'contact.shortcuts': 'Shortcuts',
    'contact.brief': 'Brief format',
    'contact.maildirect': 'Direct mail',
    'contact.brief.product': 'Product goal',
    'contact.brief.deadline': 'Target deadline',
    'contact.brief.stack': 'Tech stack',
    'contact.brief.deliverables': 'Expected deliverables',

    'works.title': 'Work, Luke Baffait',
    'works.h1': 'Projects, Luke Baffait, Creative Developer. Discover my work in web development, animation and interactive design.',

    'common.aria.back': 'Back to home',
    'common.aria.menu': 'Main navigation',
    'common.aria.social': 'Social links',
    'common.aria.footer': 'Footer navigation',

    '404.title': '404 — Luke Baffait',
    '404.subtitle': 'This page got lost in the void.<br><span class="subtitle-dim">It doesn\'t exist, or no longer does.</span>',
    '404.ticker': '— PAGE NOT FOUND — SIGNAL LOST — ERROR 0x404 — THIS PAGE DOESN\'T EXIST — COORDINATES: NULL — UNKNOWN DESTINATION — ',
    '404.aria.back': 'Back to home',
  };

  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    const key = el.getAttribute('data-i18n');
    if (T[key] != null) el.innerHTML = T[key];
  });

  document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
    el.getAttribute('data-i18n-attr').split('|').forEach(function (pair) {
      const idx = pair.indexOf(':');
      if (idx < 0) return;
      const attr = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      if (T[key] != null) el.setAttribute(attr, T[key]);
    });
  });

  const titleKey = document.documentElement.getAttribute('data-i18n-title');
  if (titleKey && T[titleKey]) document.title = T[titleKey];

  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta && T['meta.description']) descMeta.setAttribute('content', T['meta.description']);

  window.__t = function (key) { return T[key]; };
})();
