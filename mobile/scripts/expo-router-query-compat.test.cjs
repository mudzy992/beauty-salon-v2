const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const { getPathFromState } = require('expo-router/build/react-navigation/core/getPathFromState.js');
const { getStateFromPath } = require('expo-router/build/react-navigation/core/getStateFromPath.js');

test('Expo Router SDK57 reads and writes query params through patched query-string ESM', () => {
  const queryStringEntry = require.resolve('query-string');
  const queryStringPackage = JSON.parse(
    fs.readFileSync(path.join(path.dirname(queryStringEntry), 'package.json'), 'utf8'),
  );
  assert.equal(queryStringPackage.version, '9.5.1');

  const options = { screens: { Home: '' } };
  const state = getStateFromPath('/?q=beauty%20salon&tag=a&tag=b', options);
  assert.deepEqual(state.routes[0].params, {
    q: 'beauty salon',
    tag: ['a', 'b'],
  });

  const urlPath = getPathFromState(
    { routes: [{ name: 'Home', params: { q: 'beauty salon' } }] },
    options,
  );
  assert.equal(urlPath, '/?q=beauty%20salon');
});
