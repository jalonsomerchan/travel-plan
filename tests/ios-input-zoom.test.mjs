import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('iOS input zoom prevention', () => {
  it('keeps mobile form controls at 16px without disabling user zoom', () => {
    const css = readText('src/styles/global.css');

    assert.match(css, /input,\nselect,\ntextarea\s*{\n\s*font: inherit;/);
    assert.match(css, /@media \(max-width: 42rem\) \{[\s\S]*input,[\s\S]*select,[\s\S]*textarea,[\s\S]*font-size: 16px;/);
    assert.doesNotMatch(css, /user-scalable\s*=\s*no/);
    assert.doesNotMatch(css, /maximum-scale\s*=\s*1/);
  });
});
