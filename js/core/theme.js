/**
 * macOS Theme Manager: Light Mode & Dark Mode Controller
 * Supports System Preferences, Persistence in LocalStorage, and Instant Toggle.
 */

const ThemeManager = {
  KEY: 'exam_maker_theme',

  init() {
    const saved = localStorage.getItem(this.KEY);
    if (saved) {
      this.applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }

    // Listen to system theme changes if no explicit user override
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.KEY)) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  },

  applyTheme(theme) {
    const html = document.documentElement;
    const isDark = (theme === 'dark');

    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    localStorage.setItem(this.KEY, theme);
    this.updateToggleButtons(isDark);
  },

  toggle() {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  },

  updateToggleButtons(isDark) {
    const iconEl = document.getElementById('theme-toggle-icon');
    const labelEl = document.getElementById('theme-toggle-label');

    if (iconEl) {
      iconEl.innerHTML = isDark 
        ? `<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path></svg>`
        : `<svg class="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>`;
    }

    if (labelEl) {
      labelEl.innerText = isDark ? 'Light' : 'Dark';
    }
  }
};

// Auto-run theme immediately before rendering to prevent flash of unstyled content
ThemeManager.init();
