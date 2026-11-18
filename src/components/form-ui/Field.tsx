import React from "react";
import { errorTextClass, helpClass, labelClass, labelSmClass } from "./classes";

export type FieldProps = {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  help?: React.ReactNode;
  error?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
};

/** Label + control + help/error wrapper. The label turns indigo while the control has focus. */
export function Field({ label, htmlFor, required, help, error, size = "md", className = "", children }: FieldProps) {
  return (
    <div className={`group/field min-w-0 ${className}`}>
      <label
        htmlFor={htmlFor}
        className={`${size === "sm" ? labelSmClass : labelClass} transition-colors group-focus-within/field:text-indigo-700`}
      >
        {label}
        {required && <span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? <p className={errorTextClass}>{error}</p> : help ? <p className={helpClass}>{help}</p> : null}
    </div>
  );
}
