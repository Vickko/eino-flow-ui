import { ref } from 'vue';

const theme = ref('system'); // 'light', 'dark', 'system'
const isDark = ref(false); // Actual applied state

export function useTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const applyTheme = () => {
    let shouldBeDark = false;
    if (theme.value === 'system') {
      shouldBeDark = mediaQuery.matches;
    } else {
      shouldBeDark = theme.value === 'dark';
    }
    
    isDark.value = shouldBeDark;

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSystemChange = () => {
    if (theme.value === 'system') {
      applyTheme();
    }
  };

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      theme.value = savedTheme;
    } else {
      theme.value = 'system';
    }
    
    // Remove existing listener to avoid duplicates
    mediaQuery.removeEventListener('change', handleSystemChange);
    mediaQuery.addEventListener('change', handleSystemChange);
    
    applyTheme();
  };

  const setTheme = (newTheme) => {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    applyTheme();
  };

  const cycleTheme = () => {
    const modes = ['light', 'dark', 'system'];
    const nextIndex = (modes.indexOf(theme.value) + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  return {
    theme,
    isDark,
    initTheme,
    setTheme,
    cycleTheme
  };
}