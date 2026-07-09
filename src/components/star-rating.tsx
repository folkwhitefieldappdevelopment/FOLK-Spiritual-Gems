'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  totalStars?: number;
  size?: number;
  smSize?: number;
  className?: string;
  isEditable?: boolean;
  onValueChange?: (value: number) => void;
};

const StarRatingComponent = ({
  value,
  totalStars = 5,
  size = 14,
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
    const hoverStar = Math.ceil(x / starWidth);
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
    const clickedValue = Math.ceil(x / starWidth);
    onValueChange(Math.max(0, Math.min(totalStars, clickedValue)));
  };

  // Round the value to the nearest integer for "full fill" display
  const numericValue = Math.round(Number(value) || 0);
  const displayValue = hoverValue !== null && isEditable ? hoverValue : numericValue;

  return (
    <div
      className={cn('flex items-center gap-0.5', isEditable && 'cursor-pointer', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      aria-label={`Rating: ${numericValue} out of ${totalStars} stars`}
    >
      {[...Array(totalStars)].map((_, i) => {
        const isFilled = i < displayValue;

        return (
          <div key={i} className="relative" style={{ fontSize: size, width: size, height: size }}>
            <Star
              className={cn(
                "w-full h-full transition-colors",
                isFilled ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
              )}
              strokeWidth={2}
            />
          </div>
        );
      })}
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
