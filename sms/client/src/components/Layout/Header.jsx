import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  Search,
  Bell,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const breadcrumbMap = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/teachers': 'Teachers',
  '/classes': 'Classes',
  '/subjects': 'Subjects',
  '/attendance': 'Attendance',
  '/exams': 'Exams',
  '/finance/fee-structure': 'Fee Structure',
  '/finance/collection': 'Fee Collection',
  '/finance/reports': 'Finance Reports',
  '/library': 'Library',
  '/transport': 'Transport',
  '/hostel': 'Hostel',
  '/reports': 'Reports',
  '/announcements': 'Announcements',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

const Header = ({ onMenuClick, notificationCount = 3 }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Build breadcrumb from current path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ label: 'Home', path: '/dashboard' }];

    if (path !== '/dashboard' && path !== '/') {
      const matched = breadcrumbMap[path];
      if (matched) {
        crumbs.push({ label: matched, path });
      } else {
        // Try to match parent paths
        const segments = path.split('/').filter(Boolean);
        let currentPath = '';
        segments.forEach((segment) => {
          currentPath += `/${segment}`;
          if (breadcrumbMap[currentPath]) {
            crumbs.push({ label: breadcrumbMap[currentPath], path: currentPath });
          }
        });
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
      {/* Left: Menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              <span
                className={clsx(
                  idx === breadcrumbs.length - 1
                    ? 'font-medium text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {crumb.label}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Center: Search */}
      <div className="mx-4 hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search students, teachers, classes..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {getInitials(user?.firstName || user?.name)}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium leading-tight text-gray-900">
                {user?.firstName || user?.name || 'Guest'}
              </p>
              <p className="text-xs leading-tight text-gray-500 capitalize">
                {user?.role || 'User'}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="animate-scale-in absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-dropdown">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName || user?.name || 'Guest'}
                </p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>

              <button
                onClick={() => setDropdownOpen(false)}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4 text-gray-400" />
                Profile
              </button>
              <button
                onClick={() => setDropdownOpen(false)}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
