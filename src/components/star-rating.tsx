
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
    { transform: 'translate(-50%, -50%) rotate(-40deg) translate(40px) rotate(40deg)', key: 0 },
    { transform: 'translate(-50%, -50%) rotate(-20deg) translate(40px) rotate(20deg)', key: 1 },
    { transform: 'translate(-50%, -50%) rotate(0deg) translate(40px) rotate(0deg)', key: 2 },
    { transform: 'translate(-50%, -50%) rotate(20deg) translate(40px) rotate(20deg)', key: 3 },
    { transform: 'translate(-50%, -50%) rotate(40deg) translate(40px) rotate(40deg)', key: 4 },
  ];

  return (
    <div
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      aria-label={`Rating: ${displayValue} out of ${totalStars} stars`}
    >
        <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 w-[110px] h-[55px] rounded-t-full bg-gray-200/80 dark:bg-gray-700/50" />
      
        {starArcData.map(({ transform, key }) => {
            const isFilled = key < displayValue;
            return (
                 <Star
                    key={key}
                    className={cn(
                        'absolute top-1/2 left-1/2 w-5 h-5 transition-colors',
                         isFilled ? 'text-yellow-400 fill-yellow-400 stroke-yellow-600' : 'text-gray-400 fill-gray-400 stroke-gray-500'
                    )}
                    style={{ transform }}
                    strokeWidth={1}
                />
            )
        })}
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
