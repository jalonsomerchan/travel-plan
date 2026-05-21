import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('calendar and AI prompt Firebase reads', () => {
  it('uses scopes for global calendar trip and nested plan listeners', () => {
    const calendar = readText('src/scripts/pages/global-calendar.ts');

    assert.match(calendar, /createSubscriptionScope/);
    assert.match(calendar, /const subscriptions = createSubscriptionScope/);
    assert.match(calendar, /const planSubscriptions = createSubscriptionScope/);
    assert.match(calendar, /clearSubscriptions/);
    assert.match(calendar, /resetState/);
    assert.match(calendar, /pagehide/);
    assert.match(calendar, /subscriptions\.add\(\n\s*subscribeUserTrips\(/);
    assert.match(calendar, /planSubscriptions\.clear\(\);\n\s*plansByTrip = \{\};/);
    assert.match(calendar, /planSubscriptions\.add\(\n\s*subscribeTripPlans\(/);
  });

  it('uses cached one-shot reads for the AI prompt trip and plan data', () => {
    const prompt = readText('src/scripts/pages/trip-ai-prompt.ts');

    assert.match(prompt, /getTripOnce/);
    assert.match(prompt, /getTripPlansOnce/);
    assert.match(prompt, /syncPromptData/);
    assert.match(prompt, /Promise\.all\(\[getTripOnce\(tripId\), getTripPlansOnce\(tripId\)\]\)/);
    assert.doesNotMatch(prompt, /createSubscriptionScope/);
    assert.doesNotMatch(prompt, /subscribeTrip/);
    assert.doesNotMatch(prompt, /subscribeTripPlans/);
  });
});
