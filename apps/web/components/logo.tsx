import { cn } from "@/lib/cn";

interface LogoProps {
  size?: number;
  className?: string;
  showWord?: boolean;
}

/**
 * Builder GPS mark — minimal compass rose w/ off-center "north"
 * pointer (the AI is biased toward your goal).
 */
export function Logo({ size = 28, className, showWord = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Builder GPS"
      >
        <defs>
          <linearGradient id="bgps-grad" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="url(#bgps-grad)"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <circle cx="16" cy="16" r="2" fill="url(#bgps-grad)" />
        <path
          d="M16 4 L19 16 L16 14 L13 16 Z"
          fill="url(#bgps-grad)"
        />
        <path
          d="M16 28 L13.5 18 L16 19 L18.5 18 Z"
          fill="#5eead4"
          opacity="0.4"
        />
      </svg>
      {showWord && (
        <span className="text-sm font-semibold tracking-tight text-neutral-100">
          Builder<span className="text-brand-400">GPS</span>
        </span>
      )}
    </span>
  );
}
