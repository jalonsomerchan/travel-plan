import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip invite flow', () => {
  it('mirrors invites to recipient-scoped documents before reading them', () => {
    const source = readText('src/lib/firebase/trips.ts');
    const inviteFunction = source.slice(
      source.indexOf('export async function inviteUserToTrip'),
      source.indexOf('export function subscribePendingInvites'),
    );

    assert.match(source, /import type \{ User \} from 'firebase\/auth'/);
    assert.doesNotMatch(inviteFunction, /getDoc\(/);
    assert.match(inviteFunction, /getInviteId\(tripId, normalizedEmail\)/);
    assert.match(inviteFunction, /const inviteRef = doc\(db, 'tripInvites', inviteId\)/);
    assert.match(inviteFunction, /setDoc\(inviteRef, inviteData\)/);
    assert.match(inviteFunction, /setDoc\(getRecipientInviteRef\(normalizedEmail, inviteId\), inviteData\)/);
    assert.match(inviteFunction, /setDoc\(getRecipientInviteIndexRef\(normalizedEmail\)/);
    assert.match(source, /doc\(getFirebaseDb\(\), 'userInvites', emailLower\)/);
  });

  it('surfaces pending invite receive state in dashboard and invite page', () => {
    const tripsSource = readText('src/lib/firebase/trips.ts');
    const dashboardSource = readText('src/scripts/pages/dashboard.ts');
    const dashboardComponent = readText('src/components/pages/DashboardPage.astro');
    const invitesSource = readText('src/scripts/pages/trip-invites.ts');

    assert.match(tripsSource, /onError\?: \(error: Error\) => void/);
    assert.match(tripsSource, /onError\?\.\(error\)/);
    assert.match(tripsSource, /getRecipientInviteIndexRef\(normalizedEmail\)/);
    assert.match(tripsSource, /mapRecipientInviteIndex/);
    assert.match(dashboardSource, /subscribePendingInvites/);
    assert.match(dashboardSource, /renderInviteCount/);
    assert.match(dashboardSource, /dashboard\.goInvitesWithCount/);
    assert.match(dashboardComponent, /data-dashboard-invite-count/);
    assert.match(dashboardComponent, /aria-live="polite"/);
    assert.match(invitesSource, /renderInvitesError/);
    assert.match(invitesSource, /subscribePendingInvites\(/);
  });

  it('shows pending invites in the trip members list and supports Web Share', () => {
    const page = readText('src/scripts/pages/trip-members.ts');
    const component = readText('src/components/pages/TripMembersPage.astro');
    const shareHelper = readText('src/lib/app/invite-share.ts');

    assert.match(page, /subscribeTripInvites/);
    assert.match(page, /renderPeople/);
    assert.match(page, /trip\.invite\.pendingStatus/);
    assert.match(page, /navigator\.share/);
    assert.match(page, /getInviteShareFallbackUrl/);
    assert.match(component, /id="invite-share-button"/);
    assert.match(component, /role="status"/);
    assert.match(shareHelper, /buildInviteSharePayload/);
    assert.match(shareHelper, /mailto:/);
  });

  it('keeps temporary invite rules and acceptance exception explicit', () => {
    const rules = readText('firebase/firestore.rules');

    assert.match(rules, /TEMPORAL:/);
    assert.match(rules, /allow read: if signedIn\(\);/);
    assert.match(rules, /match \/userInvites\/{emailLower}/);
    assert.match(rules, /match \/mail\/{mailId}/);
    assert.match(rules, /recipientTripAcceptanceUpdate/);
    assert.match(rules, /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['memberIds', 'updatedAt'\]\)/);
    assert.match(rules, /allow update: if tripVisibleFromResource\(\) \|\|\s*pendingInviteForCurrentUser\(tripId\) \|\|\s*recipientTripAcceptanceUpdate\(\)/);
  });

  it('keeps the members page using the invite service and visible feedback', () => {
    const page = readText('src/scripts/pages/trip-members.ts');
    const component = readText('src/components/pages/TripMembersPage.astro');

    assert.match(page, /inviteUserToTrip/);
    assert.match(page, /getInviteErrorMessage/);
    assert.match(page, /setMessage\(message, t\('trip\.invite\.sent'\), 'success'\)/);
    assert.match(component, /id="invite-message"/);
  });

  it('keeps invite feature translations aligned', () => {
    const ui = readText('src/i18n/ui.ts');
    const es = readText('src/i18n/feature-translations/invites/es.json');
    const en = readText('src/i18n/feature-translations/invites/en.json');

    assert.match(ui, /feature-translations\/invites\/es\.json/);
    assert.match(ui, /feature-translations\/invites\/en\.json/);
    assert.match(es, /dashboard\.pendingInvites/);
    assert.match(en, /dashboard\.pendingInvites/);
    assert.match(es, /trip\.invite\.shareAction/);
    assert.match(en, /trip\.invite\.shareAction/);
    assert.match(es, /trip\.invite\.pendingStatus/);
    assert.match(en, /trip\.invite\.pendingStatus/);
  });
});
