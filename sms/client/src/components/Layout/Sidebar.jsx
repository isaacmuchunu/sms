import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardCheck,
  Award,
  IndianRupee,
  Wallet,
  BarChart3,
  Library,
  Bus,
  Home,
  PieChart,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  School,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigationGroups = [
  {
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ],
  },
  {
    title: 'People',
    items: [
      { key: 'students', label: 'Students', icon: Users, path: '/students' },
      { key: 'teachers', label: 'Teachers', icon: GraduationCap, path: '/teachers' },
    ],
  },
  {
    title: 'Academics',
    items: [
      { key: 'classes', label: 'Classes', icon: BookOpen, path: '/classes' },
      { key: 'subjects', label: 'Subjects', icon: FileText, path: '/subjects' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { key: 'attendance', label: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
      { key: 'exams', label: 'Exams', icon: Award, path: '/exams' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { key: 'fee-structure', label: 'Fee Structure', icon: IndianRupee, path: '/finance/fee-structure' },
      { key: 'fee-collection', label: 'Collection', icon: Wallet, path: '/finance/collection' },
      { key: 'finance-reports', label: 'Reports', icon: BarChart3, path: '/finance/reports' },
    ],
  },
  {
    title: 'Facilities',
    items: [
      { key: 'library', label: 'Library', icon: Library, path: '/library' },
      { key: 'transport', label: 'Transport', icon: Bus, path: '/transport' },
      { key: 'hostel', label: 'Hostel', icon: Home, path: '/hostel' },
    ],
  },
  {
    title: 'Other',
    items: [
      { key: 'reports', label: 'Reports', icon: PieChart, path: '/reports' },
      { key: 'announcements', label: 'Announcements', icon: Bell, path: '/announcements' },
      { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ],
  },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};
    navigationGroups.forEach((group, idx) => {
      if (group.title) initial[idx] = true;
    });
    return initial;
  });

  const toggleGroup = (groupIdx) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupIdx]: !prev[groupIdx],
    }));
  };

  const isActivePath = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={clsx(
        'sidebar-transition fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white shadow-sidebar',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600">
            <School className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="animate-fade-in truncate text-lg font-bold text-gray-900">
              EduManage
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {navigationGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-2">
            {/* Group Title */}
            {group.title && !collapsed && (
              <button
                onClick={() => toggleGroup(groupIdx)}
                className="mb-1 flex w-full items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
              >
                <span>{group.title}</span>
                <ChevronDown
                  className={clsx(
                    'h-3 w-3 transition-transform',
                    !expandedGroups[groupIdx] && '-rotate-90'
                  )}
                />
              </button>
            )}

            {/* Group Items */}
            {(!group.title || expandedGroups[groupIdx] || collapsed) && (
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isActivePath(item.path);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.path)}
                      className={clsx(
                        'group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        collapsed && 'justify-center'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={clsx(
                          'h-5 w-5 shrink-0',
                          isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                        )}
                      />
                      {!collapsed && (
                        <span className="animate-fade-in truncate">{item.label}</span>
                      )}
                      {isActive && !collapsed && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 p-2">
        {/* User Info */}
        <div
          className={clsx(
            'mb-2 flex items-center gap-3 rounded-lg px-2 py-2',
            collapsed ? 'justify-center' : ''
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            {getInitials(user?.firstName || user?.name)}
          </div>
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.firstName || user?.name || 'Guest'}
              </p>
              <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {user?.role || 'User'}
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle & Logout */}
        <div className={clsx('flex gap-1', collapsed ? 'flex-col' : '')}>
          <button
            onClick={onToggle}
            className="flex flex-1 items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={logout}
            className="flex flex-1 items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
