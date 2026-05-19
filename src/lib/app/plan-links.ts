import type { PlanInput, PlanLinkRecord, PlanRecord } from './models';

const allowedProtocols = new Set(['http:', 'https:']);

export interface PlanLinksValidation {
  valid: boolean;
  errorKey?: string;
}

export function normalizePlanLinks(value: unknown): PlanLinkRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const url = String(record.url ?? '').trim();
      const label = String(record.label ?? '').trim() || url;

      if (!url) {
        return null;
      }

      return { label, url };
    })
    .filter((item): item is PlanLinkRecord => Boolean(item));
}

export function isSafeExternalPlanUrl(value: string) {
  try {
    const url = new URL(value);
    return allowedProtocols.has(url.protocol);
  } catch {
    return false;
  }
}

export function validatePlanLinks(links: PlanLinkRecord[]): PlanLinksValidation {
  if (links.some((link) => !isSafeExternalPlanUrl(link.url))) {
    return {
      valid: false,
      errorKey: 'plan.links.invalidUrl',
    };
  }

  return { valid: true };
}

export function getPlanLinksFromForm(form: HTMLFormElement): PlanLinkRecord[] {
  const data = new FormData(form);
  const urls = data.getAll('linkUrl').map((value) => String(value).trim());
  const labels = data.getAll('linkLabel').map((value) => String(value).trim());

  return urls
    .map((url, index) => ({
      url,
      label: labels[index] || url,
    }))
    .filter((link) => link.url);
}

export function withPlanLinksFromForm(form: HTMLFormElement, input: PlanInput): PlanInput {
  return {
    ...input,
    links: getPlanLinksFromForm(form),
  };
}

export function getFirstPlanLink(plan: Pick<PlanRecord, 'links'>) {
  return plan.links[0];
}
