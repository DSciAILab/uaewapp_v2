'use client';

import { Badge } from '@/components/ui/badge';
import { WeightClass, WEIGHT_CLASS_LABELS, WEIGHT_CLASS_LIMITS } from '@/types/stats';

interface WeightClassBadgeProps {
  weightClass: WeightClass;
  showLimit?: boolean;
}

const weightClassColors: Record<WeightClass, string> = {
  strawweight: 'bg-pink-100 text-pink-800 border-pink-200',
  flyweight: 'bg-purple-100 text-purple-800 border-purple-200',
  bantamweight: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  featherweight: 'bg-blue-100 text-blue-800 border-blue-200',
  lightweight: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  welterweight: 'bg-teal-100 text-teal-800 border-teal-200',
  middleweight: 'bg-green-100 text-green-800 border-green-200',
  light_heavyweight: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  heavyweight: 'bg-orange-100 text-orange-800 border-orange-200',
  catch_weight: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function WeightClassBadge({ weightClass, showLimit = false }: WeightClassBadgeProps) {
  const label = WEIGHT_CLASS_LABELS[weightClass];
  const limit = WEIGHT_CLASS_LIMITS[weightClass];
  const colorClass = weightClassColors[weightClass];

  return (
    <Badge variant="outline" className={colorClass}>
      {label}
      {showLimit && weightClass !== 'catch_weight' && (
        <span className="ml-1 opacity-75">({limit.lbs} lbs)</span>
      )}
    </Badge>
  );
}
