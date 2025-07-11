
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number; // The rating value (0-10 scale)
  totalStars?: number; // Total stars to display (e.g., 5)
  size?: number; // Size of the stars in pixels
  isEditable?: boolean; // Toggles interactive mode
  onValueChange?: (value: number) => void; // Callback for when the rating changes
};

const StarRatingComponent = ({
  value,
  totalStars = 5,
  size = 24,
  isEditable = false,
  onValueChange,
}: StarRatingProps) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  // Convert the 0-10 scale from the database to a 0-5 star scale for display/interaction
  const displayValue = value / 2;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const starIndex = Math.floor(x / size);
    const starProgress = (x % size) / size;
    // Snap to halves
    const newHoverValue = starIndex + (starProgress < 0.5 ? 0.5 : 1);
    setHoverValue(newHoverValue);
  };

  const handleMouseLeave = () => {
    if (!isEditable) return;
    setHoverValue(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable || !onValueChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const starIndex = Math.floor(x / size);
    const starProgress = (x % size) / size;
    const newRating = starIndex + (starProgress < 0.5 ? 0.5 : 1);
    onValueChange(newRating * 2); // Convert back to 0-10 scale for saving
  };

  return (
    <div
      className={cn(
        'flex items-center',
        isEditable && 'cursor-pointer'
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      aria-label={`Rating: ${displayValue} out of ${totalStars} stars`}
    >
      {Array.from({ length: totalStars }).map((_, i) => {
        const starValue = i + 1;
        const fillPercentage = Math.max(0, Math.min(1, (hoverValue ?? displayValue) - i)) * 100;

        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            {/* Background (empty) star */}
            <Star
              className="absolute inset-0 text-gray-300 fill-gray-300 dark:text-gray-600 dark:fill-gray-600"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            {/* Filled star with clip-path */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
            >
              <Star
                className="absolute inset-0 text-yellow-400 fill-yellow-400 stroke-yellow-500"
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
