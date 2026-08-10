// Single source of truth for which staff roles can see each admin area.
// Sidebar.jsx reads this directly. Every admin page's RoleGuard should match
// the roles listed here for its route (see BUG-037–043, BUG-055, BUG-059).
export const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', roles: ['ADMIN', 'SECRETARY'] },
  { href: '/admin/members', label: 'Members', roles: ['ADMIN', 'SECRETARY'] },
  { href: '/admin/applications', label: 'Applications', roles: ['ADMIN', 'SECRETARY'] },
  { href: '/admin/vehicles', label: 'Vehicles', roles: ['ADMIN'] },
  { href: '/admin/trips', label: 'Trips', roles: ['ADMIN', 'CLIENT_MANAGER'] },
  { href: '/admin/bookings', label: 'Bookings', roles: ['ADMIN', 'CLIENT_MANAGER'] },
  { href: '/admin/payments', label: 'Payments', roles: ['ADMIN', 'TREASURER'] },
  { href: '/admin/reports', label: 'Reports', roles: ['ADMIN', 'SECRETARY', 'TREASURER', 'COMMITTEE'] },
];