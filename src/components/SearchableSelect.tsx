"use client";

import React, { useState, useRef, useEffect, ReactNode, ChangeEvent } from "react";
import { ChevronDown, Search } from "lucide-react";
import { createPortal } from "react-dom";

export interface SearchableSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children?: ReactNode;
  value?: string | number | readonly string[];
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  dropdownPosition?: "bottom" | "top";
}

export const SearchableSelect = React.forwardRef<HTMLSelectElement, SearchableSelectProps>((
  { 
    children, 
    value, 
    defaultValue,
    onChange, 
    className = "", 
    disabled = false,
    required = false,
    name,
    dropdownPosition = "bottom",
    ...rest
  },
  ref
) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const [internalValue, setInternalValue] = useState(value !== undefined ? value : defaultValue);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Extract options from children deeply
  const extractOptions = (nodes: any): { value: string; label: string; disabled: boolean }[] => {
    let opts: { value: string; label: string; disabled: boolean }[] = [];
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement<any>(child)) return;
      if (child.type === "option") {
        let label = "";
        if (Array.isArray(child.props.children)) {
          label = child.props.children.join("");
        } else {
          label = child.props.children?.toString() || "";
        }
        opts.push({
          value: child.props.value ?? "",
          label,
          disabled: child.props.disabled || false,
        });
      } else if (child.type === React.Fragment) {
        opts = opts.concat(extractOptions(child.props.children));
      } else if (Array.isArray(child)) {
        opts = opts.concat(extractOptions(child));
      }
    });
    return opts;
  };

  const options = extractOptions(children);

  const selectedOption = options.find((o) => String(o.value) === String(internalValue));
  
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Auto flip to top if there's not enough space below (need ~250px) and there's more space above
      const shouldDropUp = dropdownPosition === "top" || (spaceBelow < 250 && spaceAbove > spaceBelow);

      setDropdownStyle({
        position: 'fixed',
        top: shouldDropUp ? 'auto' : rect.bottom + 4,
        bottom: shouldDropUp ? window.innerHeight - rect.top + 4 : 'auto',
        left: rect.left,
        width: rect.width,
        minWidth: Math.max(rect.width, 160),
        zIndex: 99999,
        // Limit max height to show roughly 5 items (approx 250px)
        maxHeight: Math.min(250, shouldDropUp ? Math.max(spaceAbove - 16, 100) : Math.max(spaceBelow - 16, 100)),
      });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, dropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const portalNode = document.getElementById(`searchable-select-portal-${name || 'generic'}`);
        if (portalNode && portalNode.contains(e.target as Node)) {
          return;
        }
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    
    if (onChange) {
      // Mock the native event object so existing handlers work seamlessly
      onChange({
        target: { value: val, name: name || "" },
        currentTarget: { value: val, name: name || "" },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as ChangeEvent<HTMLSelectElement>);
    }
    setOpen(false);
    setSearch("");
  };

  const isDropUp = dropdownStyle.top === 'auto';

  const portalContent = open && typeof document !== "undefined" ? createPortal(
    <div 
      id={`searchable-select-portal-${name || 'generic'}`}
      className={`bg-white border border-blue-200 rounded-lg shadow-xl overflow-hidden flex ${isDropUp ? 'flex-col-reverse' : 'flex-col'}`}
      style={{ 
        ...dropdownStyle, 
        maxHeight: dropdownStyle.maxHeight ? `${dropdownStyle.maxHeight}px` : "240px" 
      }}
      onMouseDown={(e) => e.stopPropagation()} 
    >
      <div className={`p-2 bg-slate-50 ${isDropUp ? 'border-t border-blue-100' : 'border-b border-blue-100'}`}>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 p-1">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-slate-500 text-center">No options found</div>
        ) : (
          filteredOptions.map((opt, i) => (
            <div
              key={i}
              className={`px-3 py-2 text-sm rounded-md cursor-pointer truncate ${
                String(internalValue) === String(opt.value)
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : opt.disabled 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-slate-100 text-slate-700"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!opt.disabled) handleSelect(opt.value);
              }}
              title={opt.label}
            >
              {opt.label || "\u00A0"}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`flex items-center justify-between cursor-pointer w-full truncate ${className} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className="truncate pr-4 block">
          {selectedOption ? selectedOption.label : <span className="opacity-50">Select...</span>}
        </span>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
      </div>

      <select 
        ref={ref}
        value={internalValue || ""} 
        name={name} 
        onChange={() => {}} 
        className="hidden" 
        required={required} 
        disabled={disabled}
      >
        {children}
      </select>

      {portalContent}
    </div>
  );
});

SearchableSelect.displayName = "SearchableSelect";
