'use client';

import * as React from 'react';
import {
  X,
  Phone,
  User,
  Briefcase,
  MapPin,
  Building,
  Anchor,
  UserCheck,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Person } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { StarRating } from './star-rating';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ScrollArea } from './ui/scroll-area';

type ContactGalleryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  initialIndex?: number;
};

export function ContactGalleryDialog({
  isOpen,
  onClose,
  people,
  initialIndex = 0,
}: ContactGalleryDialogProps) {
  const router = useRouter();
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    api.scrollTo(initialIndex, true);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api, initialIndex]);

  if (!people || people.length === 0) return null;

  const navigateToProfile = (personId: string) => {
    router.push(`/contacts/${personId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden bg-[#E8EAF6] border-none shadow-2xl">
        {/* Header - Matching Image */}
        <div className="flex items-start justify-between px-6 py-4 sm:px-10 bg-white border-b shrink-0 z-30">
          <div className="space-y-0.5">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-[#1a237e]">
              Contact Gallery
            </DialogTitle>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#3f51b5] opacity-80">
              {current + 1} OF {people.length} CONTACTS
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full hover:bg-black/5 text-[#1a237e] -mt-1" 
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Carousel Container */}
        <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 sm:p-10">
          <Carousel setApi={setApi} className="w-full max-w-2xl h-full flex items-center justify-center">
            <CarouselContent className="h-full items-center">
              {people.map((person) => {
                return (
                  <CarouselItem key={person.id} className="h-full flex items-center justify-center">
                    <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col h-fit max-h-full">
                      
                      {/* Photo Area with Overlay */}
                      <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden shrink-0">
                        <Image
                          src={person.photoUrl || 'https://placehold.co/600x450/3F51B5/white?text=No+Photo'}
                          alt={person.fullName}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 768px) 100vw, 600px"
                          data-ai-hint="person portrait"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 sm:p-8 pt-20">
                          <div className="flex items-end justify-between gap-4">
                            <div className="space-y-2 min-w-0">
                              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white truncate leading-none">
                                {person.fullName}
                              </h2>
                              <Badge className="bg-white/20 text-white border-none backdrop-blur-md font-bold text-[10px] sm:text-xs rounded-full px-3 py-0.5">
                                {person.currentFolkStage || 'Fresh Lead'}
                              </Badge>
                            </div>
                            <div className="shrink-0 mb-1">
                              <StarRating value={person.sgRating || 0} size={18} className="text-white drop-shadow-md" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details Grid - Matching Image exactly */}
                      <div className="p-6 sm:p-10 space-y-8 bg-white shrink-0">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                          <DetailItem 
                            icon={Phone} 
                            label="PHONE" 
                            value={person.phone} 
                            valueClassName="text-[#3f51b5]" 
                          />
                          <DetailItem 
                            icon={User} 
                            label="AGE" 
                            value={`${person.age} Years`} 
                          />
                          <DetailItem 
                            icon={Briefcase} 
                            label="OCCUPATION" 
                            value={person.occupation || 'N/A'} 
                          />
                          <DetailItem 
                            icon={Building} 
                            label="STAYING WITH" 
                            value={person.stayingWith || 'N/A'} 
                          />
                          <DetailItem 
                            icon={Anchor} 
                            label="NATIVE PLACE" 
                            value={person.nativePlace || 'N/A'} 
                          />
                          <DetailItem 
                            icon={UserCheck} 
                            label="ENABLER" 
                            value={person.enablerInTouchWith || 'N/A'} 
                          />
                        </div>

                        {/* Open Profile Button */}
                        <div className="flex justify-center pt-2">
                          <Button 
                            onClick={() => navigateToProfile(person.id)}
                            variant="outline"
                            className="h-12 px-8 rounded-full border-[#3f51b5]/20 bg-[#3f51b5]/5 hover:bg-[#3f51b5]/10 text-[#3f51b5] font-bold text-sm transition-all"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Full Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            
            {/* Desktop Navigation Arrows - Outside the card */}
            <div className="hidden sm:block">
              <CarouselPrevious className="h-12 w-12 -left-16 bg-white shadow-xl border-none hover:bg-white text-[#1a237e] transition-transform hover:scale-110" />
              <CarouselNext className="h-12 w-12 -right-16 bg-white shadow-xl border-none hover:bg-white text-[#1a237e] transition-transform hover:scale-110" />
            </div>
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ 
    icon: Icon, 
    label, 
    value, 
    valueClassName 
}: { 
    icon: any, 
    label: string, 
    value: string, 
    valueClassName?: string 
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#3f51b5]">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      <div className={cn("font-black text-[#1a237e] leading-tight text-sm sm:text-base truncate", valueClassName)}>
        {value}
      </div>
    </div>
  );
}
