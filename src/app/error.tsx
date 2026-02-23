"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError(props: ErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-slate-50">
          Something went wrong.
        </h1>
        <p className="text-sm text-slate-400">
          We encountered an unexpected error processing this civic data.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={props.reset}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

