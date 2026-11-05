import { type PermissionDefinition } from "@/features/rbac/rbac.types";
import { useEffect,useRef } from "react";
import { checkboxClass } from "@/features/rbac/roles.rules";

export function PermissionCheckbox({
  permission,
  checked,
  disabled,
  onChange,
}: {
  permission: PermissionDefinition;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const hint = [permission.name, permission.description, permission.isSensitive ? "Sensible" : null]
    .filter(Boolean)
    .join(" — ");
  return (
    <input
      type="checkbox"
      aria-label={permission.name}
      title={hint}
      className={`${checkboxClass} ${permission.isSensitive ? "accent-red-600" : ""}`}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

/** Checkbox con estado intermedio (algunas funcionalidades del modulo). */
export function ModuleCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      className={checkboxClass}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
