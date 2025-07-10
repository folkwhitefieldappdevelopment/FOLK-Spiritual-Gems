
'use client';

import * as React from 'react';
import { Star, StarHalf, StarOff } from 'lucide-react';

type StarRatingProps = {
  value: number;
  totalStars?: number;
};

const StarRatingComponent = ({ value, totalStars = 10 }: StarRatingProps) => {
    
  // Render a simple text rating
  return (
    <div className="flex items-center gap-2 text-sm">
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        <span className="font-medium text-muted-foreground">{value || 0} / {totalStars}</span>
    </div>
  );
};

export const StarRating = React.memo(StarRatingComponent);
