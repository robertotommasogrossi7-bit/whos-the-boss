// Metro per monorepo pnpm (.npmrc node-linker=hoisted).
// Serve a far risolvere i pacchetti del workspace (es. @poker/core) che
// vivono fuori da apps/mobile, nella root del monorepo.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1) Osserva anche la root: Metro segue i sorgenti di @poker/core.
config.watchFolders = [monorepoRoot];

// 2) Cerca i moduli sia in apps/mobile sia nella root hoisted.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
