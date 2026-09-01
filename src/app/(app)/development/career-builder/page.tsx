import WeightPanel from './WeightPanel';

export default function CareerBuilderPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Career Builder</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Tune the weights the AI ranking engine uses to order content for agents.
      </p>
      <WeightPanel />
    </div>
  );
}
