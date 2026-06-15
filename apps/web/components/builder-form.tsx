"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitBuilderState } from "@/lib/api-client";
import {
  EXPERIENCE_OPTIONS,
  STACK_OPTIONS,
  TEAM_OPTIONS,
} from "@/lib/constants";
import { useBuilderGps } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/logo";
import { PathLoading } from "@/components/path-loading";
import type { BuilderState } from "@shared/types";

const schema = z.object({
  goal: z.string().min(4, "Tell us a bit more").max(400),
  stack: z.array(z.string()).min(1, "Pick at least one"),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  team_size: z.enum(["solo", "small", "large"]),
  hours_per_day: z.number().int().min(4).max(16),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  goal: "",
  stack: [],
  experience: "intermediate",
  team_size: "solo",
  hours_per_day: 8,
};

export function BuilderForm() {
  const setPath = useBuilderGps((s) => s.setPath);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const submit = useMutation({
    mutationFn: (values: BuilderState) => submitBuilderState(values),
    onSuccess: (data) => setPath(data),
    onError: (err: unknown) => {
      setServerError(err instanceof Error ? err.message : String(err));
    },
  });

  const stack = watch("stack");
  const hours = watch("hours_per_day");

  function toggleStack(value: string) {
    const next = stack.includes(value)
      ? stack.filter((s) => s !== value)
      : [...stack, value];
    setValue("stack", next, { shouldValidate: true });
  }

  // Mid-LLM-call: show the planning animation instead of a frozen form.
  if (submit.isPending) {
    return <PathLoading />;
  }

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setServerError(null);
        submit.mutate(values);
      })}
      className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 sm:p-8"
    >
      <header className="flex flex-col gap-4 pt-8">
        <div className="flex items-center gap-2 self-start rounded-full border border-brand-900/60 bg-brand-950/40 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-brand-300">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
          </span>
          AABW · Jul 8–12 · HCMC
        </div>

        <Logo size={36} showWord />

        <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl">
          The AI guide
          <br />
          <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
            through Build Week.
          </span>
        </h1>

        <p className="max-w-md text-pretty text-sm leading-relaxed text-neutral-400">
          Tell us what you want to ship by Demo Day. We pick 6–10 sessions
          across Days 1–5 to get you there — and reroute live when you mark
          one attended or skipped.
        </p>
      </header>

      <div className="flex flex-col gap-7 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 backdrop-blur-sm sm:p-7">
        <Field
          label="What do you want to ship by Demo Day?"
          hint="One sentence. We work backward from this."
          error={errors.goal?.message}
        >
          <textarea
            {...register("goal")}
            rows={3}
            placeholder="e.g. Ship a payment-enabled agent demo by Friday"
            className="w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950/70 px-3.5 py-3 text-sm leading-relaxed text-neutral-100 transition-colors placeholder:text-neutral-600 hover:border-neutral-700 focus:border-brand-500 focus:outline-none"
          />
        </Field>

        <Field label="Stack you'll build on" error={errors.stack?.message}>
          <div className="flex flex-wrap gap-1.5">
            {STACK_OPTIONS.map((opt) => {
              const active = stack.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleStack(opt)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors duration-150",
                    active
                      ? "border-brand-500 bg-brand-500/15 text-brand-200"
                      : "border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Experience">
            <select
              {...register("experience")}
              className="w-full cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-neutral-100 transition-colors hover:border-neutral-700 focus:border-brand-500 focus:outline-none"
            >
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Team size">
            <select
              {...register("team_size")}
              className="w-full cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-neutral-100 transition-colors hover:border-neutral-700 focus:border-brand-500 focus:outline-none"
            >
              {TEAM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={`Hours per day available · ${hours}h`}>
          <input
            type="range"
            min={4}
            max={16}
            step={1}
            {...register("hours_per_day", { valueAsNumber: true })}
            className="w-full cursor-pointer accent-brand-500"
          />
          <div className="mt-1 flex justify-between text-[10px] tnum text-neutral-600">
            <span>4h</span>
            <span>10h</span>
            <span>16h</span>
          </div>
        </Field>
      </div>

      {serverError && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <div className="font-semibold">Couldn&rsquo;t plan your path.</div>
          <div className="mt-1 text-xs text-red-300/80">{serverError}</div>
          <div className="mt-2 text-xs text-red-300/60">
            Make sure GROQ_API_KEY is set in apps/api/.env, then restart
            uvicorn.
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || submit.isPending}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-xl border border-brand-400/60 bg-brand-500 px-4 py-3.5 text-sm font-semibold text-neutral-950 shadow-[0_0_24px_rgba(20,184,166,0.25)] transition-all duration-200",
          "hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(20,184,166,0.45)]",
          "disabled:cursor-wait disabled:opacity-60"
        )}
      >
        <span className="relative">
          {submit.isPending ? "Planning your week…" : "Plan my 5 days →"}
        </span>
      </button>

      <p className="text-center text-xs text-neutral-600">
        Two LLM calls. Then a 5-day timeline. Reroutes when you mark sessions.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="text-xs text-neutral-600">{hint}</span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}
