import { getLabelFromHref } from '@/lib/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const href = '/' + slug.join('/');
  const label = getLabelFromHref(href);

  return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-500">{label}</h1>
    </div>
  );
}
