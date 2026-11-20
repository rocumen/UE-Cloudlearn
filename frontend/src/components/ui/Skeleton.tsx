export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={['bg-subtle animate-pulse rounded-[12px]', className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
