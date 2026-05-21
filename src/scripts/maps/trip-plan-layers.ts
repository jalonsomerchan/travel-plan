import type { PlanRecord } from '../../lib/app/models';
import { hasPlanLocation } from '../../lib/app/plan-location';

export interface SplitPlansResult {
  proposedPlans: PlanRecord[];
  plans: PlanRecord[];
}

export function splitLocatedPlans(plans: PlanRecord[]): SplitPlansResult {
  return plans.reduce<SplitPlansResult>(
    (result, plan) => {
      if (!hasPlanLocation(plan)) {
        return result;
      }

      if (plan.status === 'proposed') {
        result.proposedPlans.push(plan);
      } else {
        result.plans.push(plan);
      }

      return result;
    },
    { proposedPlans: [], plans: [] },
  );
}
