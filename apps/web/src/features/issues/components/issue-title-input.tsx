import type { Ref } from "react";

interface IssueTitleInputProps {
  autoFocus?: boolean;
  describedBy?: string;
  disabled?: boolean;
  error?: string | null;
  id: string;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  variant: "dialog" | "page";
}

function IssueTitleInput({
  autoFocus = false,
  describedBy,
  disabled = false,
  error = null,
  id,
  inputRef,
  label,
  onChange,
  placeholder,
  value,
  variant,
}: IssueTitleInputProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const described = [describedBy, hintId, error === null ? null : errorId].filter(
    (item): item is string => item !== null && item !== undefined && item.length > 0,
  );

  return (
    <div className="min-w-0">
      {variant === "page" ? (
        <textarea
          autoFocus={autoFocus}
          aria-describedby={described.length > 0 ? described.join(" ") : undefined}
          aria-invalid={error === null ? undefined : true}
          aria-label={label}
          className="peer field-sizing-content w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-2xl font-medium wrap-break-word tracking-tight text-foreground shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:border-0 focus:bg-transparent focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 disabled:opacity-100 sm:text-3xl"
          disabled={disabled}
          id={id}
          maxLength={140}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder={placeholder}
          rows={1}
          value={value}
        />
      ) : (
        <input
          autoFocus={autoFocus}
          aria-describedby={described.length > 0 ? described.join(" ") : undefined}
          aria-invalid={error === null ? undefined : true}
          aria-label={label}
          className="peer w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-foreground shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:border-0 focus:bg-transparent focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 disabled:opacity-100"
          disabled={disabled}
          id={id}
          maxLength={140}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          ref={inputRef}
          value={value}
        />
      )}
      {error === null ? null : (
        <p className="text-sm text-destructive" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

export { IssueTitleInput };
