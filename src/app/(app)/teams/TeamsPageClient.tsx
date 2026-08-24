'use client';

import { useEffect, useState } from 'react';
import TeamsPageHeader from './TeamsPageHeader';
import TeamsList, { type TeamsListResponse } from './TeamsList';
import { fetchOfficeOptions } from '@/lib/workspaces';

interface Props {
  initialList: TeamsListResponse;
}

/**
 * Owns the total count (for the header) and whether the Parent Office
 * filter is worth showing at all — per KAN-114, only when the caller's
 * scope spans more than one Office. fetchOfficeOptions already scopes to
 * the caller server-side (all offices for Master/Admin, just their own for
 * a Manager/Leader), so a single result means there's nothing to filter by.
 */
export default function TeamsPageClient({ initialList }: Props) {
  const [total, setTotal] = useState(initialList.total);
  const [showParentOfficeFilter, setShowParentOfficeFilter] = useState(false);

  useEffect(() => {
    fetchOfficeOptions('', 2).then((offices) => {
      setShowParentOfficeFilter(offices.length > 1);
    });
  }, []);

  return (
    <>
      <TeamsPageHeader total={total} />
      <TeamsList initialData={initialList} showParentOfficeFilter={showParentOfficeFilter} onTotalChange={setTotal} />
    </>
  );
}
