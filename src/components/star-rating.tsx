
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
  avatarSizeClass: 'h-16 w-16' | 'h-20 w-20' | 'h-24 w-24' | 'h-32 w-32';
};

const StarRatingComponent = ({ value, totalStars = 5, avatarSizeClass }: StarRatingProps) => {
  // Map the 0-10 rating to a 0-5 star scale.
  const ratingValue = Math.round(value / (10 / totalStars));

  const radiusMap = {
    'h-16 w-16': '2.2rem',
    'h-20 w-20': '2.8rem',
    'h-24 w-24': '3.4rem',
    'h-32 w-32': '4.5rem',
  };
  
  const radius = radiusMap[avatarSizeClass] || '2.2rem';

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-label={`Rating: ${ratingValue.toFixed(0)} out of ${totalStars}`}
    >
      {Array.from({ length: totalStars }).map((_, i) => {
        // Use a 120-degree arc for a more pleasing semi-circle at the bottom.
        // Start from -60deg (bottom-left) to +60deg (bottom-right).
        // 120deg / 4 gaps = 30deg per step.
        const angle = -60 + i * 30;
        const filled = i < ratingValue;

        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `rotate(${angle}deg) translate(${radius}) rotate(${-angle}deg)`,
            }}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                filled
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 fill-gray-300'
              )}
            />
          </div>
        );
      })}
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
