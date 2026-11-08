/**
 * There is no app to serve — this project is a command-line generator.
 *
 * The page exists because `next build` needs at least one route, and keeping
 * the build working means it stays a genuine end-to-end type check over the
 * templates and the Satori pipeline.
 */
const COMMANDS: Array<[string, string]> = [
  ["npm run new-day -- --date YYYY-MM-DD", "write a skeleton day file into input/"],
  ["npm run build-day -- --input input/<date>.json", "render the PNGs, CSV and contact sheet"],
  ["npm run samples", "re-render the 14 template samples into samples/"],
  ["npm run test", "unit tests"],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-mono text-xs uppercase tracking-[0.18em] text-money">
        Follow the Money
      </h1>
      <p className="mt-3 text-2xl font-semibold tracking-tight">FTM Studio</p>
      <p className="mt-4 text-navy-200">
        A command-line generator. It turns one hand-written JSON file per day into a folder of
        1080×1350 PNGs plus a CSV for Post Planner. Nothing is served and nothing is published
        from here.
      </p>
      <dl className="mt-10 space-y-4">
        {COMMANDS.map(([cmd, what]) => (
          <div key={cmd}>
            <dt className="font-mono text-sm text-money">{cmd}</dt>
            <dd className="text-sm text-navy-300">{what}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
