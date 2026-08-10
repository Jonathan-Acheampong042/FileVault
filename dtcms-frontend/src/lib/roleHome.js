import { NAV_LINKS } from './navLinks';

// Works out where "home" means for a signed-in user — used by the DTCMS
// logo link in Navbar.jsx so it routes back into the app instead of always
// going to the public landing page regardless of sign-in state. This also
// fixes "can't get back to the admin area from /notifications" — since
// Sidebar only renders inside /admin/* (post-BUG-059), the logo doubling as
// a role-aware home link is the only way back from any page outside both
// /admin/* and /member/*.
export function getHomeHref(user) {
  if (!user) return '/';
  if (user.role === 'DRIVER') return '/driver/trips';
  if (user.member) return '/member/dashboard';

  const firstAllowed = NAV_LINKS.find((link) => link.roles.includes(user.role));
  return firstAllowed ? firstAllowed.href : '/';
}