import WeightPanel from '../WeightPanel';

export default function RankingWeightsPage() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900">Ranking weights</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Tune the weights the Career Builder ranking engine uses to order content for agents.
      </p>
      <WeightPanel />
    </div>
  );
}
