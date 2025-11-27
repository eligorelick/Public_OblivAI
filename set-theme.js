// Small script to set the initial theme class before React mounts
(function(){
  try {
    // Strict privacy: never read or write browser storage.
    // Respect the user's system preference when possible.
    var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? true : false;

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // Default to dark
    document.documentElement.classList.add('dark');
  }
})();
