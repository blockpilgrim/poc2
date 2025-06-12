/**
 * Get user initials from display name, name, or email
 * @param user - User object with optional displayName, name, and email
 * @returns Two-letter initials or single character fallback
 */
export function getUserInitials(user: { displayName?: string; name?: string; email?: string } | null): string {
  if (!user) return '?';
  
  const nameToUse = user.displayName || user.name;
  
  if (!nameToUse) {
    return user.email ? user.email.charAt(0).toUpperCase() : '?';
  }
  
  const parts = nameToUse.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Format role names for display by converting separators to spaces and title-casing
 * @param role - Role string with potential separators like "Foster-Partner" or "admin_user"
 * @returns Formatted role name like "Foster Partner" or "Admin User"
 */
export function formatRoleName(role: string): string {
  return role
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}