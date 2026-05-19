import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('asset cache busting', () => {
  it('keeps generated CSS and JS filenames content hashed', () => {
    const astroConfig = readText('astro.config.mjs');

    assert.match(astroConfig, /assetFileNames:\s*['"]assets\/\[name\]\.\[hash\]\[extname\]['"]/);
    assert.match(astroConfig, /chunkFileNames:\s*['"]assets\/\[name\]\.\[hash\]\.js['"]/);
    assert.match(astroConfig, /entryFileNames:\s*['"]assets\/\[name\]\.\[hash\]\.js['"]/);
  });
});
