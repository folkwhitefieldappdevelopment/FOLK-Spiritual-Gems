
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
  className?: string;
};

const StarRatingComponent = ({
  value,
  totalStars = 5,
  className,
}: StarRatingProps) => {
  const displayValue = Math.min(totalStars, Math.max(0, value));

  const starArcData = [
    { transform: 'translate(20px, -18px) rotate(15deg)', key: 0 },
    { transform: 'translate(26px, 0px) rotate(0deg)', key: 1 },
    { transform: 'translate(24px, 19px) rotate(-15deg)', key: 2 },
    { transform: 'translate(14px, 36px) rotate(-30deg)', key: 3 },
    { transform: 'translate(-1px, 49px) rotate(-45deg)', key: 4 },
  ];

  return (
    <div
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      aria-label={`Rating: ${displayValue} out of ${totalStars} stars`}
    >
      <div
        className="absolute w-[110px] h-[110px] top-1/2 left-1/2 
                   -translate-x-[40%] -translate-y-[45%] rounded-full
                   bg-gray-200/80 dark:bg-gray-700/50
                   rotate-[-20deg]"
      />
      
      {starArcData.map(({ transform, key }) => {
        const isFilled = key < displayValue;
        return (
          <Star
            key={key}
            className={cn(
              'absolute top-1/2 left-1/2 w-6 h-6 transition-colors',
              isFilled ? 'text-yellow-400 fill-yellow-400 stroke-yellow-500' : 'text-gray-400 fill-gray-400 stroke-gray-500'
            )}
            style={{ transform: `translate(-50%, -50%) ${transform}` }}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
