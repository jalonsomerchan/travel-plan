import type { Locale } from '../../config/site';
import type { TripMemberRole } from './models';

interface InviteShareInput {
  inviteUrl: string;
  locale: Locale;
  roleLabel: string;
  tripName: string;
}

const shareCopy = {
  es: {
    title: (tripName: string) => `Invitación a ${tripName}`,
    text: (tripName: string, roleLabel: string) =>
      `Te invito a colaborar en el viaje "${tripName}" con permiso de ${roleLabel}. Abre este enlace e inicia sesión con el correo invitado.`,
  },
  en: {
    title: (tripName: string) => `Invitation to ${tripName}`,
    text: (tripName: string, roleLabel: string) =>
      `I invited you to collaborate on "${tripName}" with ${roleLabel} access. Open this link and sign in with the invited email.`,
  },
};

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getInviteId(tripId: string, emailLower: string) {
  return `${tripId}_${emailLower}`;
}

export function buildInviteSharePayload({ inviteUrl, locale, roleLabel, tripName }: InviteShareInput) {
  const copy = shareCopy[locale] ?? shareCopy.es;

  return {
    title: copy.title(tripName),
    text: copy.text(tripName, roleLabel),
    url: inviteUrl,
  };
}

export function getInviteShareFallbackUrl(payload: ReturnType<typeof buildInviteSharePayload>) {
  return `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(`${payload.text}\n\n${payload.url}`)}`;
}

export function isValidInviteEmail(email: string) {
  return /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email.trim());
}

export function isInviteRole(value: string): value is TripMemberRole {
  return value === 'viewer' || value === 'editor';
}
