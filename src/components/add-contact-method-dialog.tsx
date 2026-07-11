'use client';

import * as React from 'react';
import { UserPlus, QrCode, ChevronRight, UsersRound, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AddContactMethodDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectQR: () => void;
  onSelectNewGroup: () => void;
};

export function AddContactMethodDialog({
  isOpen,
  setIsOpen,
  onSelectManual,
  onSelectQR,
  onSelectNewGroup,
}: AddContactMethodDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-[#1E1E2E] border-none shadow-2xl rounded-3xl">
        <div className="p-8 space-y-8 relative">
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-black text-white tracking-tight">Add New Content</DialogTitle>
            <DialogDescription className="text-white/50 text-sm">
              Choose what you want to create or register.
            </DialogDescription>
          </div>

          <div className="space-y-4">
            {/* Manual Entry */}
            <button 
              className="w-full text-left group transition-all"
              onClick={() => { onSelectManual(); setIsOpen(false); }}
            >
              <div className="flex items-center gap-5 p-5 rounded-2xl border-2 border-white/5 bg-white/5 group-hover:bg-white/10 group-hover:border-primary/50 transition-all">
                <div className="h-14 w-14 rounded-full flex items-center justify-center bg-[#3F51B5]/20 text-[#7986CB] shrink-0 group-hover:bg-[#3F51B5] group-hover:text-white transition-all duration-300">
                  <UserPlus className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-white leading-tight">Manual Contact Entry</h3>
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">You enter the contact's details yourself.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-white transition-colors" />
              </div>
            </button>

            {/* Registration Link */}
            <button 
              className="w-full text-left group transition-all"
              onClick={() => { onSelectQR(); setIsOpen(false); }}
            >
              <div className="flex items-center gap-5 p-5 rounded-2xl border-2 border-white/5 bg-white/5 group-hover:bg-white/10 group-hover:border-accent/50 transition-all">
                <div className="h-14 w-14 rounded-full flex items-center justify-center bg-[#FF9800]/20 text-[#FFB74D] shrink-0 group-hover:bg-[#FF9800] group-hover:text-black transition-all duration-300">
                  <QrCode className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-white leading-tight">Self-Registration Link</h3>
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">Generate a QR code for them to fill details.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-white transition-colors" />
              </div>
            </button>

            {/* Create Group */}
            <button 
              className="w-full text-left group transition-all"
              onClick={() => { onSelectNewGroup(); setIsOpen(false); }}
            >
              <div className="flex items-center gap-5 p-5 rounded-2xl border-2 border-white/5 bg-white/5 group-hover:bg-white/10 group-hover:border-green-500/50 transition-all">
                <div className="h-14 w-14 rounded-full flex items-center justify-center bg-green-500/20 text-green-400 shrink-0 group-hover:bg-green-500 group-hover:text-black transition-all duration-300">
                  <UsersRound className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-white leading-tight">Create New Group</h3>
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">Organize contacts into a custom list.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-white transition-colors" />
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
