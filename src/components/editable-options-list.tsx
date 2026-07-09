'use client';

import * as React from 'react';
import { X, Check, Edit, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

type EditableOptionsListProps = {
  title: string;
  items: string[];
  onAdd: (newItem: string) => Promise<any>;
  onUpdate: (oldItem: string, newItem: string) => Promise<any>;
  onDelete: (item: string) => Promise<any>;
};

export function EditableOptionsList({ title, items, onAdd, onUpdate, onDelete }: EditableOptionsListProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<string | null>(null);
  const [newItemValue, setNewItemValue] = React.useState('');
  const [editingValue, setEditingValue] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleAdd = async () => {
    if (!newItemValue.trim()) return;
    if (items.includes(newItemValue.trim())) {
      toast({ variant: 'destructive', title: 'This item already exists.' });
      return;
    }
    setIsProcessing(true);
    try {
      await onAdd(newItemValue.trim());
      toast({ title: `${title.slice(0, -1)} Added` });
      setNewItemValue('');
      setIsAdding(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Could not add the item.` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem || !editingValue.trim()) return;
    if (items.includes(editingValue.trim()) && editingValue.trim() !== editingItem) {
      toast({ variant: 'destructive', title: 'This item already exists.' });
      return;
    }
    setIsProcessing(true);
    try {
      await onUpdate(editingItem, editingValue.trim());
      toast({ title: `${title.slice(0, -1)} Updated` });
      setEditingItem(null);
      setEditingValue('');
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: `Could not update the item.` });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async (item: string) => {
    setIsProcessing(true);
    try {
      await onDelete(item);
      toast({ title: `${title.slice(0, -1)} Deleted` });
    } catch (error) {
       console.error("Delete failed:", error);
       toast({ 
         variant: 'destructive', 
         title: 'Deletion Blocked', 
         description: error instanceof Error ? error.message : `Could not delete the item.` 
       });
    } finally {
        setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
          <h4 className="font-medium">{title}</h4>
          {!isAdding && (
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          )}
      </div>
      <Separator />
      <div className="flex flex-wrap gap-2 pt-2">
        {items.map(item => (
          <div key={item}>
            {editingItem === item ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="h-7 w-32"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdate} disabled={isProcessing}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingItem(null)} disabled={isProcessing}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Badge variant="secondary" className="group text-sm pr-1">
                {item}
                <div className="ml-1 -mr-1 flex items-center">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 opacity-50 group-hover:opacity-100"
                        onClick={() => { setEditingItem(item); setEditingValue(item); }}
                        disabled={isProcessing}
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-destructive opacity-50 group-hover:opacity-100"
                        onClick={() => handleDelete(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing && editingItem === item ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-4 w-4" />}
                    </Button>
                </div>
              </Badge>
            )}
          </div>
        ))}

        {isAdding && (
            <div className="flex items-center gap-1">
                <Input
                    placeholder="New item..."
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    className="h-7 w-32"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAdd} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAdding(false)} disabled={isProcessing}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}
