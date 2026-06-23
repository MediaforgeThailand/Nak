"use client";

import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { clsx } from "clsx";

type SelectOption = {
  value: string;
  label: string;
  disabled: boolean;
};

type SelectChangeEvent = {
  currentTarget: { value: string };
  target: { value: string };
};

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "defaultValue" | "multiple" | "onChange" | "value"
> & {
  children: ReactNode;
  defaultValue?: string | number;
  onChange?: (event: SelectChangeEvent) => void;
  placeholder?: string;
  value?: string | number;
};

function optionText(children: ReactNode) {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      return "";
    })
    .join("")
    .trim();
}

function collectOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];

    if (child.type === "option") {
      const props = child.props as {
        children?: ReactNode;
        disabled?: boolean;
        label?: string;
        value?: string | number;
      };
      const label = props.label ?? optionText(props.children);
      return [
        {
          value: props.value === undefined ? label : String(props.value),
          label,
          disabled: Boolean(props.disabled),
        },
      ];
    }

    if (child.type === "optgroup") {
      const props = child.props as { children?: ReactNode };
      return collectOptions(props.children);
    }

    return [];
  });
}

function safeValue(value: string | number | undefined) {
  return value === undefined ? undefined : String(value);
}

export function Select({
  children,
  className,
  defaultValue,
  disabled,
  form,
  id,
  name,
  onChange,
  placeholder = "เลือกตัวเลือก",
  required,
  title,
  value,
}: SelectProps) {
  const options = useMemo(() => collectOptions(children), [children]);
  const firstEnabledValue = options.find((option) => !option.disabled)?.value ?? "";
  const controlledValue = safeValue(value);
  const initialValue = safeValue(defaultValue) ?? controlledValue ?? firstEnabledValue;
  const [internalValue, setInternalValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isControlled = controlledValue !== undefined;
  const rawSelectedValue = isControlled ? controlledValue : internalValue;
  const selectedValue = options.some((option) => option.value === rawSelectedValue)
    ? rawSelectedValue
    : firstEnabledValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const isEmpty = !selectedOption || selectedOption.value === "";
  const ariaLabel = title ?? (selectedOption?.label ? `เลือกอยู่: ${selectedOption.label}` : placeholder);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  function commit(nextValue: string) {
    const option = options.find((item) => item.value === nextValue);
    if (!option || option.disabled) return;

    if (!isControlled) setInternalValue(nextValue);
    onChange?.({
      currentTarget: { value: nextValue },
      target: { value: nextValue },
    });
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div className={clsx("relative min-w-0", className)}>
      {name && !disabled ? (
        <input form={form} type="hidden" name={name} value={selectedValue ?? ""} />
      ) : null}
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        data-required={required ? "true" : undefined}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        title={title}
        className={clsx(
          "motion-surface flex min-h-10 w-full cursor-pointer touch-manipulation items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/84 px-3 py-1.5 text-left text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(31,65,58,0.07)] outline-none backdrop-blur-xl transition-all duration-200 hover:bg-white/94 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55",
          isOpen ? "border-accent ring-2 ring-accent/16" : "",
        )}
      >
        <span className={clsx("min-w-0 truncate font-medium", isEmpty ? "text-muted" : "text-foreground")}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/70 bg-white/72 text-accent">
          <ChevronDown
            className={clsx("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")}
          />
        </span>
      </button>

      {isOpen && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[90] grid items-end bg-slate-950/28 p-3 backdrop-blur-[2px] sm:items-center sm:justify-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="motion-page max-h-[76vh] w-full overflow-hidden rounded-t-2xl border border-white/70 bg-white/94 shadow-[0_24px_70px_rgba(31,65,58,0.25)] backdrop-blur-2xl sm:max-h-[620px] sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold">เลือกตัวเลือก</p>
                <p className="truncate text-xs text-muted">{selectedOption?.label ?? placeholder}</p>
              </div>
              <button
                type="button"
                aria-label="ปิดตัวเลือก"
                onClick={() => setIsOpen(false)}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/70 bg-white/76 text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {options.length > 7 ? (
              <div className="border-b border-border p-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="ค้นหาตัวเลือก"
                    className="min-h-10 w-full rounded-lg border border-white/70 bg-white/82 px-3 py-1.5 pl-9 text-sm outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              </div>
            ) : null}

            <div className="grid max-h-[54vh] gap-2 overflow-y-auto p-3 sm:max-h-[430px]" role="listbox">
              {filteredOptions.map((option) => {
                const active = option.value === selectedValue;
                return (
                  <button
                    key={`${option.value}-${option.label}`}
                    type="button"
                    disabled={option.disabled}
                    aria-selected={active}
                    role="option"
                    onClick={() => commit(option.value)}
                    className={clsx(
                      "flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45",
                      active
                        ? "border-accent bg-accent text-white shadow-[0_12px_28px_rgba(229,64,79,0.2)]"
                        : "border-white/70 bg-white/72 text-foreground hover:bg-white",
                    )}
                  >
                    <span className="min-w-0 break-words">{option.label}</span>
                    {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })}

              {filteredOptions.length === 0 ? (
                <div className="rounded-lg border border-border bg-white/70 p-4 text-sm text-muted">
                  ไม่พบตัวเลือกที่ค้นหา
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
