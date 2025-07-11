
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
  size?: number;
  className?: string;
};

const StarRatingComponent = ({
  value,
  totalStars = 5,
  size = 16,
  className,
}: StarRatingProps) => {

  const displayValue = Math.min(totalStars, Math.max(0, value));

  return (
    <div
      className={cn('flex items-center', className)}
      aria-label={`Rating: ${displayValue} out of ${totalStars} stars`}
    >
      {Array.from({ length: totalStars }).map((_, i) => {
        const starValue = i + 1;
        const fillPercentage = Math.max(0, Math.min(1, displayValue - i)) * 100;

        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            {/* Background (empty) star */}
            <Star
              className="absolute inset-0 text-gray-300 fill-gray-300 dark:text-gray-600 dark:fill-gray-600"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            {/* Filled star with clip-path */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
            >
              <Star
                className="absolute inset-0 text-yellow-400 fill-yellow-400 stroke-yellow-500"
                style={{ width: size, height: size }}
                strokeWidth={1.5}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
