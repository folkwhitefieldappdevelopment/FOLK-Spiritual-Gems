
"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

type Operator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'is_true' | 'is_false';

export type FilterableField = {
  value: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  options?: { value: string; label: string }[];
};

export type FilterRule = {
  id: string;
  field: string;
  operator: Operator;
  value: any;
};

type FilterPopoverProps = {
  filters: FilterRule[];
  setFilters: React.Dispatch<React.SetStateAction<FilterRule[]>>;
  filterableFields: FilterableField[];
};

const operatorsByType: { [key: string]: { value: Operator; label: string }[] } = {
  string: [
    { value: "contains", label: "Contains" },
    { value: "eq", label: "Is equal to" },
    { value: "neq", label: "Is not equal to" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "neq", label: "!=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "gte", label: ">=" },
    { value: "lte", label: "<=" },
  ],
  date: [
    { value: "eq", label: "Is on" },
    { value: "neq", label: "Is not on" },
    { value: "gt", label: "Is after" },
    { value: "lt", label: "Is before" },
  ],
  boolean: [
      { value: 'is_true', label: 'Is true' },
      { value: 'is_false', label: 'Is false' },
  ],
  enum: [
    { value: "eq", label: "Is" },
    { value: "neq", label: "Is not" },
  ],
};

const defaultOperatorForType = (type: FilterableField['type']): Operator => {
    switch(type) {
        case 'string': return 'contains';
        case 'number': return 'eq';
        case 'date': return 'eq';
        case 'boolean': return 'is_true';
        case 'enum': return 'eq';
        default: return 'eq';
    }
}

const renderValueInput = (
  fieldDef: FilterableField | undefined,
  value: any,
  onChange: (newValue: any) => void
) => {
  if (!fieldDef) return null;

  switch (fieldDef.type) {
    case 'enum':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {(fieldDef.options || []).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case 'boolean':
        return (
             <Select value={String(value)} onValueChange={(val) => onChange(val === 'true')}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                </SelectContent>
             </Select>
        );
    case 'number':
      return <Input type="number" value={value || ''} onChange={(e) => onChange(e.target.valueAsNumber)} className="w-[150px]" />;
    case 'date':
      return <Input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-[150px]" />;
    default: // string
      return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-[150px]" />;
  }
};


export function FilterPopover({ filters, setFilters, filterableFields }: FilterPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const addFilter = () => {
    if (filterableFields.length === 0) return;
    const defaultField = filterableFields[0];
    setFilters([
      ...filters,
      { id: crypto.randomUUID(), field: defaultField.value, operator: defaultOperatorForType(defaultField.type), value: defaultField.type === 'boolean' ? true : '' },
    ]);
  };
  
  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };
  
  const updateFilter = (id: string, newRule: Partial<FilterRule>) => {
    setFilters(filters.map(f => (f.id === id ? { ...f, ...newRule } : f)));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" /> Filter
          {filters.length > 0 && (
              <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">{filters.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="text-lg font-semibold">Filter Contacts</div>
          {filters.length > 0 && (
              <div className="space-y-2">
                {filters.map(filter => {
                  const fieldDef = filterableFields.find(f => f.value === filter.field);
                  const operators = fieldDef ? operatorsByType[fieldDef.type] : [];
                  
                  return (
                      <div key={filter.id} className="flex items-center gap-2">
                        <Select
                            value={filter.field}
                            onValueChange={field => {
                                const newFieldDef = filterableFields.find(f => f.value === field);
                                const newOperator = newFieldDef ? defaultOperatorForType(newFieldDef.type) : 'eq';
                                updateFilter(filter.id, { field, operator: newOperator, value: newFieldDef?.type === 'boolean' ? true : '' });
                            }}
                        >
                            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{filterableFields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>

                        <Select
                            value={filter.operator}
                            onValueChange={operator => updateFilter(filter.id, { operator: operator as Operator })}
                        >
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{operators.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}</SelectContent>
                        </Select>
                        
                        {renderValueInput(fieldDef, filter.value, value => updateFilter(filter.id, { value }))}
                        
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFilter(filter.id)}><X className="h-4 w-4" /></Button>
                      </div>
                  );
                })}
              </div>
          )}
          <Button onClick={addFilter} variant="outline" size="sm">Add Filter</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
