export const globalSearchResultTypes = ['trip', 'plan', 'poi', 'checklist'] as const;

export type GlobalSearchResultType = (typeof globalSearchResultTypes)[number];

export interface GlobalSearchDocument {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  meta: string[];
  url: string;
  searchText: string;
}

export type GlobalSearchGroups = Record<GlobalSearchResultType, GlobalSearchDocument[]>;

export function normalizeGlobalSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function createGlobalSearchText(parts: Array<string | undefined | null>) {
  return normalizeGlobalSearchText(parts.filter(Boolean).join(' '));
}

export function filterGlobalSearchDocuments(
  documents: GlobalSearchDocument[],
  query: string,
  maxResultsPerGroup = 8,
): GlobalSearchGroups {
  const normalizedQuery = normalizeGlobalSearchText(query);
  const groups = Object.fromEntries(globalSearchResultTypes.map((type) => [type, []])) as GlobalSearchGroups;

  if (normalizedQuery.length < 2) {
    return groups;
  }

  documents.forEach((document) => {
    if (!document.searchText.includes(normalizedQuery)) {
      return;
    }

    if (groups[document.type].length < maxResultsPerGroup) {
      groups[document.type].push(document);
    }
  });

  return groups;
}

export function countGlobalSearchResults(groups: GlobalSearchGroups) {
  return globalSearchResultTypes.reduce((total, type) => total + groups[type].length, 0);
}
