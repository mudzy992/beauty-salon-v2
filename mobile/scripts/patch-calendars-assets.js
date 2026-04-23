/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function ensureFileCopy({ from, to }) {
  if (!fs.existsSync(from)) return;
  if (fs.existsSync(to)) return;
  fs.copyFileSync(from, to);
  console.log(`[postinstall] created ${path.relative(process.cwd(), to)}`);
}

function main() {
  const dir = path.join(
    process.cwd(),
    'node_modules',
    'react-native-calendars',
    'src',
    'calendar',
    'img',
  );

  if (!fs.existsSync(dir)) return;

  // Metro sometimes requests generic @3x/@4x files. Package may only ship platform-specific ones.
  const pairs = [
    { base: 'previous', scale: '3x' },
    { base: 'previous', scale: '4x' },
    { base: 'next', scale: '3x' },
    { base: 'next', scale: '4x' },
  ];

  for (const { base, scale } of pairs) {
    ensureFileCopy({
      from: path.join(dir, `${base}@${scale}.android.png`),
      to: path.join(dir, `${base}@${scale}.png`),
    });
  }
}

main();

