import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules & Info",
  description: "Fútbol con los pibes – Rules, and summary stats.",
};

export default function RulesPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-3xl font-bold text-black dark:text-white">
        Rules & Info
      </h1>
      <div className="mb-8 rounded-lg bg-gray-50 p-4 shadow dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">General Rules</h2>
        <ul className="list-disc pl-5 text-base text-gray-700 dark:text-gray-200">
          <li>No late arrivals. Arrive 10 minutes before kickoff.</li>
          <li>Pay before playing. No pay, no play.</li>
          <li>Respect all players and referees.</li>
          <li>2x1 rule: If you cancel late, you pay double next time.</li>
          <li>Guest players allowed if spots are open.</li>
        </ul>
      </div>
      <div className="mb-8 rounded-lg bg-gray-50 p-4 shadow dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">Match Rules</h2>
        <ul className="list-disc pl-5 text-base text-gray-700 dark:text-gray-200">
          <li>
            Si toca la red, es fuera.
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              If the ball touches the net, it's out.
            </span>
          </li>
          <li>
            El arquero no la puede agarrar si es pase de compañero.
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              The goalkeeper cannot grab the ball if it comes from a teammate's
              pass.
            </span>
          </li>
          <li>
            Goles solo desde la mitad de la cancha rival.
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Goals can only be scored from the opponent's half.
            </span>
          </li>
          <li>
            El arquero cuando saca con la mano, solo puede pasar la mitad de
            cancha si la pelota pica antes.
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              When the goalkeeper throws the ball, it can only cross midfield if
              it bounces before crossing.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
