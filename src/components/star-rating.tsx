
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
};

const StarRatingComponent = ({ value, totalStars = 5 }: StarRatingProps) => {
  // Map the 0-10 rating to a 0-5 star scale.
  const ratingValue = value / (10 / totalStars);

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-label={`Rating: ${ratingValue.toFixed(1)} out of ${totalStars}`}
    >
      {Array.from({ length: totalStars }).map((_, i) => {
        // Position stars in a 120-degree arc at the bottom.
        // -60 degrees to start from the bottom-left, up to +60 degrees at the bottom-right.
        // 120 degrees / 4 gaps = 30 degrees per step.
        const angle = -60 + i * 30;
        const filled = i < ratingValue;

        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2"
            // The transform magic:
            // 1. rotate() positions the star on the circle.
            // 2. translate() moves it outwards from the center. The distance depends on the avatar size (h-16 -> 4rem radius).
            // 3. rotate() back to keep the star upright.
            style={{
              transform: `rotate(${angle}deg) translate(4.5rem) rotate(${-angle}deg)`,
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
