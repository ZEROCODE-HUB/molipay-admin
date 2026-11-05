export function Toggle({
  enabled,
  onClick,
  label,
}: {
  enabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
        enabled ? "bg-moli-blue" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export const ErrorField = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-[11px] font-medium text-red-600">{msg}</p> : null;
