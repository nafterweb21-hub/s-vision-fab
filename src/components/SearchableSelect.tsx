"use client";

import React, { useState, useRef, useEffect, ReactNode, ChangeEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
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
  /** Smaller text (13px) for dense line-item tables. */
  compact?: boolean;
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
    compact = false,
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

  // Default trigger look (design-system input tokens). Only used when the caller
  // passes no className; callers that pass one keep full control of the trigger.
  const hasCustomCls = className.trim().length > 0;
  const defaultTriggerCls = `${compact ? "h-7 px-2" : "h-8 px-2.5"} rounded-md border border-slate-300 text-[13px] ${
    disabled ? "bg-slate-50 text-slate-500" : "bg-white text-slate-900 hover:border-slate-400"
  }`;
  const triggerCls = hasCustomCls ? className : defaultTriggerCls;
  const openCls = open ? "border-indigo-500 ring-2 ring-indigo-500/20" : "";
  const disabledCls = disabled ? (hasCustomCls ? "opacity-60 cursor-not-allowed" : "cursor-not-allowed") : "";

  const portalContent = open && typeof document !== "undefined" ? createPortal(
    <div 
      id={`searchable-select-portal-${name || 'generic'}`}
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 ring-1 ring-black/5 flex ${isDropUp ? 'flex-col-reverse' : 'flex-col'}`}
      style={{ 
        ...dropdownStyle, 
        maxHeight: dropdownStyle.maxHeight ? `${dropdownStyle.maxHeight}px` : "240px" 
      }}
      onMouseDown={(e) => e.stopPropagation()} 
    >
      <div className={`p-1.5 ${isDropUp ? 'border-t border-slate-100' : 'border-b border-slate-100'}`}>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 py-1">
        {filteredOptions.length === 0 ? (
          <div className="px-2.5 py-3 text-xs text-slate-500 text-center">No options found</div>
        ) : (
          filteredOptions.map((opt, i) => {
            const isSelected = String(internalValue) === String(opt.value);
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-2.5 ${compact ? "py-1" : "py-1.5"} text-[13px] ${
                  opt.disabled
                    ? "cursor-not-allowed text-slate-400 opacity-60"
                    : isSelected
                      ? "cursor-pointer font-medium text-indigo-700 hover:bg-indigo-50"
                      : "cursor-pointer text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!opt.disabled) handleSelect(opt.value);
                }}
                title={opt.label}
              >
                <span className="min-w-0 flex-1 truncate">{opt.label || "\u00A0"}</span>
                {isSelected && <Check size={14} className="shrink-0 text-indigo-600" />}
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`flex items-center justify-between cursor-pointer w-full truncate transition-colors ${triggerCls} ${openCls} ${disabledCls}`}
        onClick={() => !disabled && setOpen(!open)}
        title={selectedOption ? selectedOption.label : undefined}
      >
        <span className={`truncate block text-[13px] ${compact ? "pr-4" : "pr-5"}`}>
          {selectedOption ? selectedOption.label : <span className="text-slate-400">Select...</span>}
        </span>
        <ChevronDown size={14} className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform ${open ? "rotate-180" : ""} ${compact ? "right-1.5" : "right-2"}`} />
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
