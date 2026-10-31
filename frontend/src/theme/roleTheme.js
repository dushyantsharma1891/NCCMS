// Visual "rank" theming — each role gets a distinct identity across the app,
// signalling its place in the hierarchy (Citizen < Officer < Admin < Super Admin).
const roleTheme = {
  citizen: {
    label: 'Citizen',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    accentBg: 'bg-accent-500 hover:bg-accent-600',
    sidebarActive: 'bg-navy-900 text-white',
    ring: 'ring-blue-200',
  },
  officer: {
    label: 'Government Officer',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    accentBg: 'bg-teal-600 hover:bg-teal-700',
    sidebarActive: 'bg-teal-700 text-white',
    ring: 'ring-teal-200',
  },
  admin: {
    label: 'Admin',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    accentBg: 'bg-purple-700 hover:bg-purple-800',
    sidebarActive: 'bg-purple-700 text-white',
    ring: 'ring-purple-300',
  },
  super_admin: {
    label: 'Super Admin',
    badge: 'bg-gradient-to-r from-amber-100 to-rose-100 text-rose-800 dark:from-amber-950 dark:to-rose-950 dark:text-rose-300',
    accentBg: 'bg-gradient-to-r from-rose-700 to-navy-900 hover:from-rose-800 hover:to-navy-950',
    sidebarActive: 'bg-gradient-to-r from-rose-700 to-navy-900 text-white',
    ring: 'ring-rose-300',
  },
};

export default roleTheme;
