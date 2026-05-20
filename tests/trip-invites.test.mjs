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
    assert.match(source, /collection\(db, 'userInvites', normalizedEmail, 'invites'\)/);
  });

  it('surfaces pending invite receive state in dashboard and invite page', () => {
    const tripsSource = readText('src/lib/firebase/trips.ts');
    const dashboardSource = readText('src/scripts/pages/dashboard.ts');
    const dashboardComponent = readText('src/components/pages/DashboardPage.astro');
    const invitesSource = readText('src/scripts/pages/trip-invites.ts');

    assert.match(tripsSource, /onError\?: \(error: Error\) => void/);
    assert.match(tripsSource, /onError\?\.\(error\)/);
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

  it('keeps Firestore invite rules aligned with owners and recipients', () => {
    const rules = readText('firebase/firestore.rules');

    assert.match(rules, /function tripInviteCreatable\(\)/);
    assert.match(rules, /tripOwnedByCurrentUser\(request\.resource\.data\.tripId\)/);
    assert.match(rules, /request\.resource\.data\.ownerId == request\.auth\.uid/);
    assert.match(rules, /function tripInviteReadable\(\)/);
    assert.match(rules, /resource\.data\.ownerId == request\.auth\.uid/);
    assert.match(rules, /userEmailLower\(\) == resource\.data\.emailLower/);
    assert.match(rules, /match \/userInvites\/{emailLower}\/invites\/{inviteId}/);
    assert.match(rules, /recipientInviteAccessible\(emailLower\)/);
    assert.match(rules, /pendingInviteForCurrentUser\(tripId\)/);
    assert.match(rules, /recipientMemberCreatable\(tripId, memberId\)/);
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
