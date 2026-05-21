import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const pagesDir = join(root, 'src/scripts/pages');
const pendingScopeMigration = new Set();

function readText(path) {
  return readFileSync(path, 'utf8');
}

function pageFiles() {
  return readdirSync(pagesDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({ file, content: readText(join(pagesDir, file)) }));
}

describe('Firebase subscription scope coverage', () => {
  it('keeps page-level Firebase listeners behind createSubscriptionScope', () => {
    const pagesWithUnscopedListeners = pageFiles()
      .filter(({ content }) => /subscribe[A-Z][A-Za-z0-9]+\(/.test(content))
      .filter(({ content }) => !content.includes('createSubscriptionScope'))
      .map(({ file }) => file);

    const unexpected = pagesWithUnscopedListeners.filter((file) => !pendingScopeMigration.has(file));

    assert.deepEqual(unexpected, []);
  });
});
