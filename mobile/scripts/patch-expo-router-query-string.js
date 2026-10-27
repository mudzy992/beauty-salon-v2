const fs = require('node:fs');
const path = require('node:path');

const expoRouterPackagePath = require.resolve('expo-router/package.json');
const expoRouterRoot = path.dirname(expoRouterPackagePath);
const { version } = require(expoRouterPackagePath);

if (!/^57\./.test(version)) {
  throw new Error(
    `The query-string interop patch was reviewed for Expo Router SDK57, received ${version}`,
  );
}

const files = [
  'build/fork/getPathFromState.js',
  'build/fork/getPathFromState-forks.js',
  'build/react-navigation/core/getPathFromState.js',
  'build/react-navigation/core/getStateFromPath.js',
];
const oldImport = 'const queryString = __importStar(require("query-string"));';
const newImport =
  'const queryStringModule = require("query-string");\nconst queryString = queryStringModule.default || queryStringModule;';

for (const relativePath of files) {
  const filePath = path.join(expoRouterRoot, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');

  if (source.includes(newImport)) continue;
  const occurrences = source.split(oldImport).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one query-string import in ${relativePath}; found ${occurrences}`,
    );
  }

  fs.writeFileSync(filePath, source.replace(oldImport, newImport));
}
