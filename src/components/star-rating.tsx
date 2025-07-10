
'use client';

import * as React from 'react';
import { Star, StarHalf, StarOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

type StarRatingProps = {
  value: number;
  onValueChange?: (value: number) => void;
  isEditing?: boolean;
};

const StarRatingComponent = ({ value, onValueChange, isEditing = false }: StarRatingProps) => {
  const stars = React.useMemo(() => {
    const starArray = [];
    for (let i = 1; i <= 5; i++) {
      if (value >= i) {
        starArray.push(<Star key={i} className="text-yellow-400 fill-yellow-400" />);
      } else if (value >= i - 0.75) {
        starArray.push(<Star key={i} className="text-yellow-400 fill-yellow-400" />);
      } else if (value >= i - 0.25) {
        starArray.push(<StarHalf key={i} className="text-yellow-400 fill-yellow-400" />);
      } else {
        starArray.push(<Star key={i} className="text-yellow-400" />);
      }
    }
    return starArray;
  }, [value]);
  
  const ratingText = value > 0 ? `${value.toFixed(1)} / 5.0` : 'Not Rated';

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center">
            {value === 0 ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                    <StarOff className="h-4 w-4" />
                    <span className="text-xs">Not Rated</span>
                </div>
            ) : (
                stars
            )}
        </div>
        {value > 0 && <p className="text-xs text-muted-foreground">{ratingText}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">{stars}</div>
        <span className="text-sm font-medium text-muted-foreground w-24 text-right">
          {ratingText}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => onValueChange?.(vals[0])}
        max={5}
        step={0.1}
        className={cn(onValueChange ? 'cursor-pointer' : 'cursor-default')}
        aria-label="SG Rating"
      />
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
