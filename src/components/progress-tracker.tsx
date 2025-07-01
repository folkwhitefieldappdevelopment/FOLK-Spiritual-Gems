
'use client';

import * as React from 'react';
import type { Person, ProgressCategoryName, ProgressItem } from '@/lib/types';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


type ProgressTrackerProps = {
  person: Person;
  onPersonUpdate: (updatedPerson: Person) => void;
};

type DialogState = {
    isOpen: boolean;
    categoryName: ProgressCategoryName | null;
    itemToEdit: ProgressItem | null;
}

export function ProgressTracker({ person, onPersonUpdate }: ProgressTrackerProps) {
    const [dialogState, setDialogState] = React.useState<DialogState>({isOpen: false, categoryName: null, itemToEdit: null });
    const [questionText, setQuestionText] = React.useState('');

    const handleAnswerChange = (categoryName: ProgressCategoryName, itemId: string, newAnswer: string) => {
        const updatedProgress = person.progress.map(category => {
            if (category.name === categoryName) {
                return {
                    ...category,
                    items: category.items.map(item => item.id === itemId ? {...item, answer: newAnswer} : item)
                }
            }
            return category;
        });
        onPersonUpdate({...person, progress: updatedProgress});
    };

    const openDialog = (categoryName: ProgressCategoryName, itemToEdit: ProgressItem | null = null) => {
        setDialogState({ isOpen: true, categoryName, itemToEdit });
        setQuestionText(itemToEdit ? itemToEdit.question : '');
    };

    const closeDialog = () => {
        setDialogState({ isOpen: false, categoryName: null, itemToEdit: null });
        setQuestionText('');
    }

    const handleSaveQuestion = () => {
        if (!dialogState.categoryName || !questionText.trim()) return;

        const { categoryName, itemToEdit } = dialogState;

        const updatedProgress = person.progress.map(cat => {
            if (cat.name === categoryName) {
                const newItems = itemToEdit
                ? cat.items.map(it => it.id === itemToEdit.id ? {...it, question: questionText} : it) // Edit
                : [...cat.items, {id: `q-${Date.now()}`, question: questionText, answer: ''}]; // Add
                return {...cat, items: newItems};
            }
            return cat;
        });

        onPersonUpdate({...person, progress: updatedProgress});
        closeDialog();
    };

    const handleDeleteQuestion = (categoryName: ProgressCategoryName, itemId: string) => {
        const updatedProgress = person.progress.map(cat => {
            if (cat.name === categoryName) {
                return {...cat, items: cat.items.filter(it => it.id !== itemId)};
            }
            return cat;
        });
        onPersonUpdate({...person, progress: updatedProgress});
    };
  
    return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Progress Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {person.progress.map((category) => (
              <AccordionItem value={category.name} key={category.name}>
                <AccordionTrigger>{category.name}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pl-2">
                    {category.items.map((item) => (
                      <div key={item.id} className="space-y-2 group">
                        <div className="flex justify-between items-center">
                          <Label htmlFor={item.id} className="font-semibold text-sm">
                            {item.question}
                          </Label>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(category.name, item)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this question and its answer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteQuestion(category.name, item.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </div>
                        </div>
                        <Textarea
                          id={item.id}
                          value={item.answer}
                          onChange={(e) =>
                            handleAnswerChange(
                              category.name,
                              item.id,
                              e.target.value
                            )
                          }
                          placeholder="Your answer..."
                          className="text-sm"
                        />
                      </div>
                    ))}
                    {category.items.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No questions in this category yet.
                      </p>
                    )}
                    <div className="mt-4 flex justify-start">
                        <Button variant="outline" size="sm" onClick={() => openDialog(category.name)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Question
                        </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
      <Dialog open={dialogState.isOpen} onOpenChange={closeDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{dialogState.itemToEdit ? 'Edit Question' : 'Add Question'}</DialogTitle>
                <DialogDescription>
                    {dialogState.itemToEdit ? 'Update the question text.' : `Add a new question to the "${dialogState.categoryName}" category.`}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="question-text">Question</Label>
                <Input 
                    id="question-text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g. What did you learn?"
                    className="mt-2"
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveQuestion}>Save Question</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
