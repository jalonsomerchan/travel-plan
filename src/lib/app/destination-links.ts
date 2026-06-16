import type { DestinationLinkInput, DestinationLinkRecord } from './models';
import { isSafeExternalUrl, sanitizeExternalLinkUrl } from './plan-links';

export type DestinationLinkValidationErrorKey =
  | 'destinationLinks.error.titleRequired'
  | 'destinationLinks.error.invalidUrl';

export interface DestinationLinkValidation {
  valid: boolean;
  errorKey?: DestinationLinkValidationErrorKey;
}

const notesMaxLength = 280;

function normalizeOptionalText(value: unknown) {
  const text = String(value ?? '').trim();

  return text || undefined;
}

export function normalizeDestinationLinkNotes(value: unknown) {
  return normalizeOptionalText(value)?.slice(0, notesMaxLength);
}

export function normalizeDestinationLinkInput(input: DestinationLinkInput): DestinationLinkInput {
  return {
    title: input.title.trim(),
    url: sanitizeExternalLinkUrl(input.url),
    category: normalizeOptionalText(input.category),
    notes: normalizeDestinationLinkNotes(input.notes),
  };
}

export function normalizeDestinationLinkRecord(value: unknown): DestinationLinkRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const id = String(data.id ?? '').trim();
  const normalized = normalizeDestinationLinkInput({
    title: String(data.title ?? ''),
    url: String(data.url ?? ''),
    category: data.category ? String(data.category) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
  });

  if (!id || !normalized.title || !isSafeExternalUrl(normalized.url)) {
    return null;
  }

  return {
    id,
    ...normalized,
  };
}

export function normalizeDestinationLinks(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return sortDestinationLinks(
    value
      .map(normalizeDestinationLinkRecord)
      .filter((link): link is DestinationLinkRecord => Boolean(link)),
  );
}

export function getDestinationLinkCategoryKey(link: Pick<DestinationLinkRecord, 'category'>) {
  return link.category?.trim() ?? '';
}

export function validateDestinationLink(input: DestinationLinkInput): DestinationLinkValidation {
  const normalized = normalizeDestinationLinkInput(input);

  if (!normalized.title) {
    return { valid: false, errorKey: 'destinationLinks.error.titleRequired' };
  }

  if (!isSafeExternalUrl(normalized.url)) {
    return { valid: false, errorKey: 'destinationLinks.error.invalidUrl' };
  }

  return { valid: true };
}

export function sortDestinationLinks(links: DestinationLinkRecord[]) {
  return [...links].sort((left, right) => {
    const categoryCompare = getDestinationLinkCategoryKey(left).localeCompare(
      getDestinationLinkCategoryKey(right),
    );

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return `${left.title}|${left.id}`.localeCompare(`${right.title}|${right.id}`);
  });
}
