import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules & Info",
  description: "Football With Friends – Rules, pot, and summary stats.",
};

export default function RulesPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-3xl font-bold text-black dark:text-white">
        Rules & Info
      </h1>
      <div className="mb-8 rounded-lg bg-gray-50 p-4 shadow dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">Game Rules</h2>
        <ul className="list-disc pl-5 text-base text-gray-700 dark:text-gray-200">
          <li>No late arrivals. Arrive 10 minutes before kickoff.</li>
          <li>Pay before playing. No pay, no play.</li>
          <li>Respect all players and referees.</li>
          <li>2x1 rule: If you cancel late, you pay double next time.</li>
          <li>Guest players allowed if spots are open.</li>
        </ul>
      </div>
      {/* <div className="mb-8 rounded-lg bg-gray-50 p-4 shadow dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">Pot (Pozo)</h2>
        <p className="text-base text-gray-700 dark:text-gray-200">
          The current pot is <span className="font-bold">$0</span>{" "}
          (placeholder).
        </p>
      </div> */}
      <div className="rounded-lg bg-gray-50 p-4 shadow dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">Summary Stats</h2>
        <ul className="list-disc pl-5 text-base text-gray-700 dark:text-gray-200">
          <li>
            Total matches played: <span className="font-bold">0</span>{" "}
            (placeholder)
          </li>
          <li>
            Most punctual player: <span className="font-bold">TBD</span>
          </li>
          <li>
            Most goals: <span className="font-bold">TBD</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
