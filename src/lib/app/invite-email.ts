import type { Locale } from '../../config/site';
import type { TripMemberRole } from './models';

interface InviteEmailInput {
  inviteUrl: string;
  locale: Locale;
  ownerEmail: string;
  roleLabel: string;
  role: TripMemberRole;
  tripName: string;
}

const emailCopy = {
  es: {
    subject: (tripName: string) => `Invitación a ${tripName} en TravelPlan`,
    preface: 'Te han invitado a colaborar en un viaje de TravelPlan.',
    owner: 'Invita',
    role: 'Permiso',
    action: 'Ver invitación',
    fallback: 'Si el botón no funciona, copia y pega este enlace en el navegador:',
  },
  en: {
    subject: (tripName: string) => `Invitation to ${tripName} on TravelPlan`,
    preface: 'You have been invited to collaborate on a TravelPlan trip.',
    owner: 'Invited by',
    role: 'Permission',
    action: 'View invitation',
    fallback: 'If the button does not work, copy and paste this link into your browser:',
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildInviteEmail({
  inviteUrl,
  locale,
  ownerEmail,
  roleLabel,
  tripName,
}: InviteEmailInput) {
  const copy = emailCopy[locale] ?? emailCopy.es;
  const subject = copy.subject(tripName);
  const text = `${copy.preface}\n\n${tripName}\n${copy.owner}: ${ownerEmail}\n${copy.role}: ${roleLabel}\n\n${copy.action}: ${inviteUrl}`;
  const safeTripName = escapeHtml(tripName);
  const safeOwnerEmail = escapeHtml(ownerEmail);
  const safeRoleLabel = escapeHtml(roleLabel);
  const safeInviteUrl = escapeHtml(inviteUrl);

  return {
    subject,
    text,
    html: `
      <p>${escapeHtml(copy.preface)}</p>
      <h1>${safeTripName}</h1>
      <p><strong>${escapeHtml(copy.owner)}:</strong> ${safeOwnerEmail}</p>
      <p><strong>${escapeHtml(copy.role)}:</strong> ${safeRoleLabel}</p>
      <p><a href="${safeInviteUrl}">${escapeHtml(copy.action)}</a></p>
      <p>${escapeHtml(copy.fallback)}</p>
      <p><a href="${safeInviteUrl}">${safeInviteUrl}</a></p>
    `,
  };
}
