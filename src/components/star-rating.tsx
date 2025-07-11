
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

  const starArcData = [
    { transform: 'translate(18px, 12px) rotate(45deg)', key: 0 },
    { transform: 'translate(38px, 22px) rotate(22.5deg)', key: 1 },
    { transform: 'translate(60px, 25px) rotate(0deg)', key: 2 },
    { transform: 'translate(82px, 22px) rotate(-22.5deg)', key: 3 },
    { transform: 'translate(102px, 12px) rotate(-45deg)', key: 4 },
  ];
    
  return (
    <div
      className={cn('absolute inset-x-0 top-[-15px] w-full h-full pointer-events-none', className)}
      aria-label={`Rating: ${value} out of ${totalStars} stars`}
    >
      <div
        className="absolute w-[120px] h-[24px] top-[-20px] left-1/2 
                   -translate-x-1/2 rounded-full
                   bg-gray-200/60 dark:bg-gray-800/60"
      />
      
      <div className="absolute w-full h-full top-[-15px]">
        {starArcData.map(({ transform, key }) => {
            const isFilled = key < value;
            return (
            <Star
                key={key}
                className={cn(
                'absolute w-5 h-5 transition-colors',
                isFilled ? 'text-yellow-400 fill-yellow-400 stroke-yellow-500' : 'text-gray-400 fill-gray-400 stroke-gray-500'
                )}
                style={{ transform: `translate(-50%, -50%) ${transform}` }}
                strokeWidth={1.5}
            />
            );
        })}
      </div>
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
