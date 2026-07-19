/* Config dinamica sopra app.json: aggiunge `extra.buildInfo` (commit + data)
   valutato al momento del BUNDLE. Nato dalla prova telefono di R7.4 (IDEE
   2026-07-18): Expo Go/APK possono servire in silenzio un bundle vecchio —
   la versione visibile nel Profilo ("Assistenza") toglie ogni dubbio su
   QUALE codice sta girando.
   - su EAS Build il commit arriva da EAS_BUILD_GIT_COMMIT_HASH (sul server
     di build non c'è la cartella .git: `git rev-parse` fallirebbe);
   - in locale (Metro/expo export) si chiede a git;
   - fallback 'dev' se nessuno dei due risponde. */
const { execSync } = require('node:child_process');

function commitCorrente() {
  const daEas = process.env.EAS_BUILD_GIT_COMMIT_HASH;
  if (daEas) return daEas.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    buildInfo: {
      commit: commitCorrente(),
      data: new Date().toISOString().slice(0, 10),
    },
  },
});
