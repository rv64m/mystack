const storageKey = 'site-theme';
const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');
const media = window.matchMedia('(prefers-color-scheme: dark)');

function getPreferredTheme() {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'light' || stored === 'dark') return stored;
  return media.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  if (!toggle) return;

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  toggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
}

function persistTheme(theme) {
  window.localStorage.setItem(storageKey, theme);
  applyTheme(theme);
}

applyTheme(getPreferredTheme());

if (toggle) {
  toggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    persistTheme(nextTheme);
  });
}

media.addEventListener('change', (event) => {
  if (window.localStorage.getItem(storageKey)) return;
  applyTheme(event.matches ? 'dark' : 'light');
});
