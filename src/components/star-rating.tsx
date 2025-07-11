
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
  size?: number;
  className?: string;
  isEditable?: boolean;
  onValueChange?: (value: number) => void;
};

const StarRatingComponent = ({
  value,
  totalStars = 5,
  size = 20,
  className,
  isEditable = false,
  onValueChange,
}: StarRatingProps) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const starWidth = rect.width / totalStars;
    const hoverStar = x / starWidth;
    setHoverValue(hoverStar);
  };

  const handleMouseLeave = () => {
    if (!isEditable) return;
    setHoverValue(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable || !onValueChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const starWidth = rect.width / totalStars;
    const clickedValue = parseFloat((x / starWidth).toFixed(2));
    onValueChange(Math.max(0, Math.min(totalStars, clickedValue)));
  };

  const displayValue = hoverValue !== null && isEditable ? hoverValue : value;

  return (
    <div
      className={cn('flex items-center gap-1', isEditable && 'cursor-pointer', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      aria-label={`Rating: ${value.toFixed(1)} out of ${totalStars} stars`}
    >
      {[...Array(totalStars)].map((_, i) => {
        const starValue = i + 1;
        const fillPercentage = Math.max(0, Math.min(1, displayValue - i)) * 100;

        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-gray-300 dark:text-gray-600"
              fill="currentColor"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <Star
                className="absolute inset-0 text-yellow-400 dark:text-yellow-500"
                fill="currentColor"
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
