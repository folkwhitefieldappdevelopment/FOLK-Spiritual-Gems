
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
  className?: string;
  isEditable?: boolean;
  onValueChange?: (value: number) => void;
};

const StarRatingComponent = ({
  value,
  totalStars = 5,
  className,
  isEditable = false,
  onValueChange,
}: StarRatingProps) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  
  const handleStarClick = (rating: number) => {
    if (isEditable && onValueChange) {
      onValueChange(rating);
    }
  };

  if (!isEditable) {
    const starArcData = [
      { transform: 'translate(10px, 48px) rotate(-45deg)', key: 0 },
      { transform: 'translate(28px, 34px) rotate(-22.5deg)', key: 1 },
      { transform: 'translate(50px, 28px) rotate(0deg)', key: 2 },
      { transform: 'translate(72px, 34px) rotate(22.5deg)', key: 3 },
      { transform: 'translate(90px, 48px) rotate(45deg)', key: 4 },
    ];
    
    return (
      <div
        className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
        aria-label={`Rating: ${value} out of ${totalStars} stars`}
      >
        <div
          className="absolute w-[140px] h-[140px] bottom-[-75px] left-1/2 
                     -translate-x-1/2 rounded-full
                     bg-gray-200/60 dark:bg-gray-800/60"
        />
        
        <div className="absolute w-full h-full bottom-[-10px]">
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
  }

  // Interactive Editable Stars
  return (
    <div
      className={cn('flex items-center gap-1', className)}
      onMouseLeave={() => setHoverValue(null)}
      aria-label={`Set rating. Current rating: ${value} out of ${totalStars}`}
    >
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const fillPercentage = Math.min(100, Math.max(0, (displayValue - index) * 100));
        
        return (
          <div
            key={starValue}
            className="relative cursor-pointer"
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const decimal = (e.clientX - rect.left) / rect.width;
              setHoverValue(index + decimal);
            }}
          >
            <Star
              className="h-6 w-6 text-gray-300 fill-current"
              strokeWidth={1.5}
            />
            <div
              className="absolute top-0 left-0 h-full overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <Star
                className="h-6 w-6 text-yellow-400 fill-current"
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
