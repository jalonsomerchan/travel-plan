import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const firebaseDir = join(root, 'src/lib/firebase');

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('firebase browser compatibility', () => {
  it('keeps Firestore initialization centralized in config', () => {
    const files = readdirSync(firebaseDir).filter((name) => name.endsWith('.ts') && name !== 'config.ts');

    files.forEach((name) => {
      const source = readFileSync(join(firebaseDir, name), 'utf8');

      assert.doesNotMatch(source, /initializeFirestore\(/, `${name} should not initialize Firestore directly`);
      assert.doesNotMatch(source, /getFirestore\(app\)/, `${name} should not create Firestore directly`);
    });

    const config = readText('src/lib/firebase/config.ts');
    const docs = readText('docs/firebase-guide.md');

    assert.match(config, /getFirebaseDb/);
    assert.match(docs, /No usar `initializeFirestore/);
    assert.match(docs, /getFirebaseDb\(\)/);
  });
});
