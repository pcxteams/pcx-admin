interface Props {
  total: number;
}

export default function TeamsPageHeader({ total }: Props) {
  return (
    <div className="mb-8">
      <h1 className="text-xl font-semibold text-gray-900">Teams</h1>
      <p className="text-sm text-gray-500 mt-0.5">
        {total} {total === 1 ? 'team' : 'teams'}
      </p>
    </div>
  );
}
