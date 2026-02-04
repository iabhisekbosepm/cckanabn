import { useLocation } from 'react-router-dom';

function Header({ onMenuClick, sidebarOpen }) {
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Projects';
    if (path === '/today') return 'Today';
    if (path === '/global') return 'Global View';
    if (path === '/calendar') return 'Calendar';
    if (path === '/stats') return 'Statistics';
    if (path === '/weekly-report') return 'Weekly Report';
    if (path === '/settings') return 'Settings';
    if (path.startsWith('/project/')) return 'Project Board';
    return 'Dashboard';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 lg:hidden"
              title={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page title */}
            <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
          </div>

          {/* Right side - can add search, notifications, user menu later */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">CodeClouds Products Board</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
