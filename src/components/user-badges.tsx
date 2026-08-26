/**
 * Shared role/status badge styling and avatar helpers for any table that
 * renders `UsersListItem` rows — originally UsersTable.tsx (Users
 * directory), also used by TeamMembersTable.tsx (KAN-115 Team Profile) so
 * the two rosters render identically instead of drifting.
 */

export const ROLE_BADGES: Record<string, { label: string; cls: string }> = {
  agent: { label: 'Agent', cls: 'bg-blue-50 text-blue-700' },
  leader: { label: 'Leader', cls: 'bg-emerald-50 text-emerald-700' },
  manager: { label: 'Manager', cls: 'bg-purple-50 text-purple-700' },
  admin: { label: 'PCx Admin', cls: 'bg-amber-50 text-amber-700' },
  master: { label: 'PCx Master Admin', cls: 'bg-red-50 text-red-700' },
};

export const STATUS_BADGES: Record<string, { label: string; dot: string; cls: string }> = {
  active: { label: 'Active', dot: 'bg-green-500', cls: 'bg-green-50 text-green-600' },
  pending: { label: 'Pending', dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-500' },
  invited: { label: 'Invited', dot: 'bg-blue-500', cls: 'bg-blue-50 text-blue-600' },
  suspended: { label: 'Suspended', dot: 'bg-orange-500', cls: 'bg-orange-50 text-orange-600' },
};

const AVATAR_PALETTE = [
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
];

export function avatarClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
