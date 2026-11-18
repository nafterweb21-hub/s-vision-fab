"use client";
import React, { useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";

export interface ProfileOrFreeTextProps {
  label: string;
  required?: boolean;
  options: { id: string; label: string }[];
  fields: { name: string; label: string; required?: boolean }[];
  value: {
    type: "profile" | "freetext";
    profileId?: string;
    freeTextData?: Record<string, string>;
  };
  onChange: (value: any) => void;
  /** Locks the source toggle, the dropdown and the free-text inputs. */
  disabled?: boolean;
}

const segBase = "h-6 px-2 text-[11px] font-medium rounded transition-colors";
const segActive = `${segBase} bg-white text-slate-900 shadow-sm`;
const segInactive = `${segBase} text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:hover:text-slate-500`;
const inputCls =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function ProfileOrFreeText({
  label,
  required,
  options,
  fields,
  value,
  onChange,
  disabled = false,
}: ProfileOrFreeTextProps) {
  const isFreeText = value?.type === "freetext";

  const handleTypeChange = (type: "profile" | "freetext") => {
    if (type === "profile") {
      onChange({ type: "profile", profileId: "" });
    } else {
      onChange({ type: "freetext", freeTextData: {} });
    }
  };

  const handleProfileChange = (profileId: string) => {
    onChange({ type: "profile", profileId });
  };

  const handleFreeTextChange = (fieldName: string, fieldValue: string) => {
    onChange({
      type: "freetext",
      freeTextData: {
        ...(value?.freeTextData || {}),
        [fieldName]: fieldValue,
      },
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div role="radiogroup" aria-label={`${label} source`} className="inline-flex items-center rounded-md bg-slate-100 p-0.5">
          <button
            type="button"
            role="radio"
            aria-checked={!isFreeText}
            disabled={disabled}
            onClick={() => { if (isFreeText) handleTypeChange("profile"); }}
            className={!isFreeText ? segActive : segInactive}
          >
            Select Existing
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isFreeText}
            disabled={disabled}
            onClick={() => { if (!isFreeText) handleTypeChange("freetext"); }}
            className={isFreeText ? segActive : segInactive}
          >
            Free Text
          </button>
        </div>
      </div>

      {!isFreeText ? (
        <SearchableSelect
          value={value?.profileId || ""}
          disabled={disabled}
          onChange={(e) => handleProfileChange(e.target.value)}
        >
          <option value="">Select {label}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </SearchableSelect>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {f.label} {f.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={value?.freeTextData?.[f.name] || ""}
                onChange={(e) => handleFreeTextChange(f.name, e.target.value)}
                disabled={disabled}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
