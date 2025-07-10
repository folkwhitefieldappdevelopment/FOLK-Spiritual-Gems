
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
};

const StarRatingComponent = ({ value, totalStars = 5 }: StarRatingProps) => {
  const ratingValue = value / (10 / totalStars); // Map 0-10 scale to 0-5 scale

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-label={`Rating: ${ratingValue.toFixed(1)} out of ${totalStars}`}
    >
      {Array.from({ length: totalStars }).map((_, i) => {
        const angle = -60 + i * 30; // Spread 5 stars over a 120-degree arc at the bottom
        const filled = i < ratingValue;

        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2"
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
