
'use client';

import * as React from 'react';
import { Filter, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export type FilterRule = {
  id: string;
  field: string;
  operator: string;
  value: any;
};

export type FilterableField = {
  value: string;
  label: string;
  type: 'string' | 'number' | 'enum' | 'boolean';
  options?: { value: string; label: string }[];
};

type Operator = {
  value: string;
  label: string;
};

const operators: Record<FilterableField['type'], Operator[]> = {
  string: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'eq', label: 'is equal to' },
    { value: 'neq', label: 'is not equal to' },
    { value: 'gt', label: 'is greater than' },
    { value: 'lt', label: 'is less than' },
    { value: 'gte', label: 'is greater than or equal to' },
    { value: 'lte', label: 'is less than or equal to' },
  ],
  enum: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
  ],
  boolean: [{ value: 'is', label: 'is' }],
};

type FilterPopoverProps = {
  filters: FilterRule[];
  setFilters: React.Dispatch<React.SetStateAction<FilterRule[]>>;
  filterableFields: FilterableField[];
};

export function FilterPopover({ filters, setFilters, filterableFields }: FilterPopoverProps) {
    
  const getField = (fieldValue: string) => filterableFields.find(f => f.value === fieldValue);

  const handleUpdateFilter = (id: string, key: keyof FilterRule, value: any) => {
    setFilters(prev =>
      prev.map(f => {
        if (f.id === id) {
          const updatedFilter = { ...f, [key]: value };
          // If field changes, reset operator and value
          if (key === 'field') {
            const newField = getField(value);
            updatedFilter.operator = newField ? operators[newField.type][0].value : '';
            updatedFilter.value = newField?.type === 'boolean' ? 'true' : '';
          }
          return updatedFilter;
        }
        return f;
      })
    );
  };

  const handleAddFilter = () => {
    setFilters(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: filterableFields[0]?.value || 'fullName',
        operator: filterableFields[0]?.type === 'string' ? 'contains' : 'is',
        value: '',
      },
    ]);
  };

  const handleRemoveFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  const handleClearFilters = () => {
    setFilters([]);
  };

  const renderValueInput = (filter: FilterRule) => {
    const field = getField(filter.field);
    if (!field || filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
      return <div className="w-full h-9" />;
    }

    switch (field.type) {
      case 'string':
        return (
          <Input
            value={filter.value}
            onChange={e => handleUpdateFilter(filter.id, 'value', e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={filter.value}
            onChange={e => handleUpdateFilter(filter.id, 'value', e.target.value)}
          />
        );
      case 'enum':
        return (
          <Select
            value={filter.value}
            onValueChange={value => handleUpdateFilter(filter.id, 'value', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'boolean':
        return (
          <Select
            value={String(filter.value)}
            onValueChange={value => handleUpdateFilter(filter.id, 'value', value === 'true')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );
      default:
        return <div className="w-full h-9" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          {filters.length > 0 && (
            <span className="ml-2 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {filters.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[560px]" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Filters</h4>
            <p className="text-sm text-muted-foreground">
              Refine your contact list by applying one or more filters.
            </p>
          </div>
          <div className="grid gap-2">
            {filters.map(filter => {
                const field = getField(filter.field);
                return (
                    <div key={filter.id} className="flex items-center gap-2">
                        <Select
                            value={filter.field}
                            onValueChange={value => handleUpdateFilter(filter.id, 'field', value)}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filterableFields.map(f => (
                                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filter.operator}
                            onValueChange={value => handleUpdateFilter(filter.id, 'operator', value)}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Select operator..." />
                            </SelectTrigger>
                            <SelectContent>
                                {field && operators[field.type].map(op => (
                                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex-1">{renderValueInput(filter)}</div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveFilter(filter.id)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove filter</span>
                        </Button>
                    </div>
                )
            })}
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={handleAddFilter}>
              <Plus className="mr-2 h-4 w-4" />
              Add Filter
            </Button>
            {filters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear all Filters
                </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
