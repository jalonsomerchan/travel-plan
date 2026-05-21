import { planCategoryValues, type PlanCategory } from './models';

interface PlanCategoryColors {
  border: string;
  fill: string;
  soft: string;
}

export const defaultPlanCategory: PlanCategory = 'other';

const planCategoryColors: Record<PlanCategory, PlanCategoryColors> = {
  visit: {
    border: '#2563eb',
    fill: '#60a5fa',
    soft: 'rgba(96, 165, 250, 0.16)',
  },
  viewpoint: {
    border: '#0f766e',
    fill: '#34d399',
    soft: 'rgba(52, 211, 153, 0.16)',
  },
  food: {
    border: '#ea580c',
    fill: '#fb923c',
    soft: 'rgba(251, 146, 60, 0.16)',
  },
  stay: {
    border: '#7c3aed',
    fill: '#a78bfa',
    soft: 'rgba(167, 139, 250, 0.16)',
  },
  transport: {
    border: '#0891b2',
    fill: '#22d3ee',
    soft: 'rgba(34, 211, 238, 0.16)',
  },
  museum: {
    border: '#be123c',
    fill: '#fb7185',
    soft: 'rgba(251, 113, 133, 0.16)',
  },
  shop: {
    border: '#16a34a',
    fill: '#4ade80',
    soft: 'rgba(74, 222, 128, 0.16)',
  },
  bathroom: {
    border: '#4f46e5',
    fill: '#818cf8',
    soft: 'rgba(129, 140, 248, 0.16)',
  },
  other: {
    border: '#64748b',
    fill: '#94a3b8',
    soft: 'rgba(148, 163, 184, 0.18)',
  },
};

function normalizePlanCategory(category: PlanCategory | string | undefined): PlanCategory {
  return planCategoryValues.includes(category as PlanCategory)
    ? (category as PlanCategory)
    : defaultPlanCategory;
}

export function getPlanCategoryColors(category: PlanCategory | string | undefined) {
  return planCategoryColors[normalizePlanCategory(category)];
}

export function getPlanCategoryDotStyle(category: PlanCategory | string | undefined) {
  const colors = getPlanCategoryColors(category);

  return [
    'display:inline-flex',
    'width:.75rem',
    'height:.75rem',
    'flex-shrink:0',
    'border-radius:999px',
    'border:2px solid',
    `background:${colors.fill}`,
    `border-color:${colors.border}`,
  ].join(';');
}

export function getPlanCategoryCardStyle(category: PlanCategory | string | undefined) {
  const colors = getPlanCategoryColors(category);

  return `border-left:4px solid ${colors.border};background:${colors.soft};`;
}
