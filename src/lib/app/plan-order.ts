import type { PlanRecord } from './models';

export const PLAN_DAY_ORDER_STEP = 1000;

export type PlanOrderDirection = 'up' | 'down';

export interface PlanDayOrderUpdate {
  planId: string;
  dayOrder: number;
}

export function getPlanDayKey(plan: Pick<PlanRecord, 'date'>) {
  return plan.date ?? '';
}

export function getPlanDayOrderValue(plan: Pick<PlanRecord, 'dayOrder'>) {
  return typeof plan.dayOrder === 'number' && Number.isFinite(plan.dayOrder) ? plan.dayOrder : null;
}

function getPlanDateSortValue(plan: Pick<PlanRecord, 'date'>) {
  return plan.date ?? '9999-99-99';
}

function getPlanTimeSortValue(plan: Pick<PlanRecord, 'time'>) {
  return plan.time ?? '99:99';
}

function compareManualDayOrder(left: PlanRecord, right: PlanRecord) {
  const leftOrder = getPlanDayOrderValue(left);
  const rightOrder = getPlanDayOrderValue(right);

  if (leftOrder === null || rightOrder === null) {
    return null;
  }

  return leftOrder - rightOrder;
}

export function comparePlansByScheduleAndDayOrder(left: PlanRecord, right: PlanRecord) {
  const dateCompare = getPlanDateSortValue(left).localeCompare(getPlanDateSortValue(right));

  if (dateCompare !== 0) {
    return dateCompare;
  }

  const manualOrderCompare = compareManualDayOrder(left, right);

  if (manualOrderCompare !== null && manualOrderCompare !== 0) {
    return manualOrderCompare;
  }

  const timeCompare = getPlanTimeSortValue(left).localeCompare(getPlanTimeSortValue(right));

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return `${left.name}|${left.id}`.localeCompare(`${right.name}|${right.id}`);
}

export function sortPlansByScheduleAndDayOrder(plans: PlanRecord[]) {
  return [...plans].sort(comparePlansByScheduleAndDayOrder);
}

export function getPlanDayPlans(plans: PlanRecord[], planId: string) {
  const plan = plans.find((item) => item.id === planId);

  if (!plan) {
    return [];
  }

  const dayKey = getPlanDayKey(plan);

  return sortPlansByScheduleAndDayOrder(plans.filter((item) => getPlanDayKey(item) === dayKey));
}

export function getPlanDayOrderUpdates(
  plans: PlanRecord[],
  planId: string,
  direction: PlanOrderDirection,
): PlanDayOrderUpdate[] {
  const dayPlans = getPlanDayPlans(plans, planId);
  const currentIndex = dayPlans.findIndex((plan) => plan.id === planId);
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= dayPlans.length) {
    return [];
  }

  const reorderedPlans = [...dayPlans];
  const [selectedPlan] = reorderedPlans.splice(currentIndex, 1);
  reorderedPlans.splice(nextIndex, 0, selectedPlan);

  return reorderedPlans.map((plan, index) => ({
    planId: plan.id,
    dayOrder: (index + 1) * PLAN_DAY_ORDER_STEP,
  }));
}
