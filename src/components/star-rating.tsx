
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

  const sizeStyles = {
    'h-16 w-16': { starSize: 'h-4 w-4', swooshHeight: 'h-8', bottomOffset: '-bottom-3' },
    'h-20 w-20': { starSize: 'h-5 w-5', swooshHeight: 'h-10', bottomOffset: '-bottom-4' },
    'h-24 w-24': { starSize: 'h-6 w-6', swooshHeight: 'h-12', bottomOffset: '-bottom-5' },
    'h-32 w-32': { starSize: 'h-7 w-7', swooshHeight: 'h-14', bottomOffset: '-bottom-6' },
  };

  const styles = sizeStyles[avatarSizeClass] || sizeStyles['h-20 w-20'];
  
  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 w-[140%] flex items-center justify-center",
        styles.bottomOffset
      )}
      aria-label={`Rating: ${ratingValue} out of ${totalStars} stars`}
    >
      {/* Decorative swoosh background */}
      <div className={cn(
        "absolute w-full bg-slate-200/80 dark:bg-slate-700/50 rounded-[50%_50%_0_0/100%_100%_0_0]",
        styles.swooshHeight
      )} />

      {/* Stars container */}
      <div className="relative flex items-end justify-center gap-1.5 h-full">
        {Array.from({ length: totalStars }).map((_, i) => {
          const filled = i < ratingValue;
          const isCenter = i === 2; // Middle star (3rd star)

          return (
            <Star
              key={i}
              className={cn(
                styles.starSize,
                'transition-colors',
                isCenter ? '-translate-y-1' : '', // Nudge middle star up a bit
                filled
                  ? 'text-yellow-400 fill-yellow-400 stroke-yellow-600'
                  : 'text-gray-400/80 fill-gray-400/80 stroke-gray-500'
              )}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
