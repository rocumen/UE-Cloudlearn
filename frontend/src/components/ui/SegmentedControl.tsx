export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  className = ''
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={[
        'inline-flex flex-wrap items-center gap-1 rounded-[14px] border border-hairline bg-subtle p-1',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={[
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-[10px] px-3.5 py-1.5 text-[0.875rem] apple-transition apple-focus-ring',
              selected
                ? 'bg-surface font-semibold text-primary shadow-card'
                : 'font-medium text-secondary hover:text-primary'
            ].join(' ')}
          >
            <span>{option.label}</span>
            {typeof option.count === 'number' ? (
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[0.75rem] leading-none tabular-nums',
                  selected
                    ? 'bg-accent-soft text-accent'
                    : 'bg-surface text-secondary'
                ].join(' ')}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
