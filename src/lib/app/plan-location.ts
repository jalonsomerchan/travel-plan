import type { PlanInput, PlanRecord } from './models';

export function hasPlanLocation(plan: Pick<PlanRecord, 'locationLat' | 'locationLng'>) {
  return typeof plan.locationLat === 'number' && typeof plan.locationLng === 'number';
}

export function getPlanLocationLabel(plan: Pick<PlanRecord, 'locationName' | 'locationLat' | 'locationLng'>) {
  if (plan.locationName) {
    return plan.locationName;
  }

  if (hasPlanLocation(plan)) {
    return `${plan.locationLat?.toFixed(5)}, ${plan.locationLng?.toFixed(5)}`;
  }

  return '';
}

export function getPlanInputFromForm(form: HTMLFormElement): PlanInput {
  const data = new FormData(form);
  const locationLat = String(data.get('locationLat') ?? '');
  const locationLng = String(data.get('locationLng') ?? '');

  return {
    name: String(data.get('name') ?? ''),
    description: String(data.get('description') ?? ''),
    category: String(data.get('category') ?? 'visit') as PlanRecord['category'],
    locationName: String(data.get('locationName') ?? '') || undefined,
    locationLat: locationLat ? Number(locationLat) : undefined,
    locationLng: locationLng ? Number(locationLng) : undefined,
    date: String(data.get('date') ?? '') || undefined,
    time: String(data.get('time') ?? '') || undefined,
    status: String(data.get('status') ?? 'pending') as PlanRecord['status'],
  };
}
