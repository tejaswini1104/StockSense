/** Single source of truth for sidebar navigation and page headings. */

const icon = (path) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={path}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        description: 'Your StockSense workspace at a glance.',
        icon: icon('M4 13h6v7H4v-7Zm0-9h6v6H4V4Zm10 0h6v10h-6V4Zm0 13h6v3h-6v-3Z'),
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        to: '/products',
        label: 'Products',
        description: 'Catalogue of every item you stock.',
        icon: icon('M20 7.5 12 3.5 4 7.5l8 4 8-4Zm0 0v9l-8 4-8-4v-9M12 11.5v9'),
      },
      {
        to: '/warehouse',
        label: 'Warehouse',
        description: 'Locations, zones and storage bins.',
        icon: icon('M3 10.5 12 4l9 6.5V20H3v-9.5Zm6 9.5v-6h6v6'),
      },
    ],
  },
  {
    title: 'Movement',
    items: [
      {
        to: '/operations',
        label: 'Operations',
        description: 'Receipts, issues, transfers and adjustments.',
        icon: icon('M4 8h11m0 0-3-3m3 3-3 3M20 16H9m0 0 3-3m-3 3 3 3'),
      },
      {
        to: '/move-history',
        label: 'Move History',
        description: 'Every completed stock movement.',
        icon: icon('M12 8v5l3.5 2M21 12a9 9 0 1 1-2.6-6.3M21 3.5V9h-5.5'),
      },
      {
        to: '/stock-ledger',
        label: 'Stock Ledger',
        description: 'Running balance per product and location.',
        icon: icon('M5 4h11l3 3v13H5V4Zm3 5h8M8 13h8M8 17h5'),
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        to: '/profile',
        label: 'Profile',
        description: 'Your account details and role.',
        icon: icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0'),
      },
    ],
  },
]

export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

export const findNavItem = (pathname) =>
  NAV_ITEMS.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
