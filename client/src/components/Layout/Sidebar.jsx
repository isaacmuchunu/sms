import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  SquaresFour,
  Users,
  ChalkboardTeacher,
  BookOpen,
  Books,
  CheckCircle,
  Exam,
  Coins,
  Wallet,
  ChartBar,
  House,
  Bus,
  ChartPie,
  Bell,
  Gear,
  CaretLeft,
  CaretRight,
  CaretDown,
  GraduationCap,
  SignOut,
  User,
  UsersThree,
  Trophy,
  Calendar,
  Envelope,
  Buildings,
  ToggleRight,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const getNavigationGroups = (role, modules = {}) => {
  const isModuleEnabled = (name) => modules[name] !== false;
  if (role === 'parent') {
    return [
      {
        items: [
          { key: 'parent-portal', label: 'Parent Portal', icon: UsersThree, path: '/parent' },
        ],
      },
      {
        title: 'My Children',
        items: [
          { key: 'parent-attendance', label: 'Attendance', icon: CheckCircle, path: '/parent/attendance' },
          { key: 'parent-fees', label: 'Fees & Payments', icon: Coins, path: '/parent/fees' },
          { key: 'parent-results', label: 'Results', icon: Trophy, path: '/parent/results' },
          { key: 'parent-library', label: 'Library', icon: Books, path: '/parent/library', module: 'library' },
        ],
      },
      {
        title: 'School',
        items: [
          { key: 'parent-meetings', label: 'Meetings', icon: Calendar, path: '/parent/meetings' },
          { key: 'announcements', label: 'Announcements', icon: Bell, path: '/announcements' },
          { key: 'notifications', label: 'Notifications', icon: Envelope, path: '/notifications' },
        ],
      },
    ];
  }

  return [
    {
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: SquaresFour, path: '/dashboard', allowedRoles: ['admin', 'teacher', 'principal', 'accountant', 'librarian', 'staff', 'super_admin'] },
      ],
    },
    {
      title: 'People',
      items: [
        { key: 'students', label: 'Students', icon: Users, path: '/students', allowedRoles: ['admin', 'teacher', 'principal'] },
        { key: 'teachers', label: 'Teachers', icon: ChalkboardTeacher, path: '/teachers', allowedRoles: ['admin', 'teacher', 'principal'] },
        { key: 'users', label: 'Users', icon: User, path: '/users', allowedRoles: ['admin', 'super_admin'] },
      ],
    },
    {
      title: 'Academics',
      items: [
        { key: 'classes', label: 'Classes', icon: BookOpen, path: '/classes', allowedRoles: ['admin', 'teacher', 'principal'] },
        { key: 'subjects', label: 'Subjects', icon: Books, path: '/subjects', allowedRoles: ['admin', 'teacher', 'principal'] },
      ],
    },
    {
      title: 'Operations',
      items: [
        { key: 'attendance', label: 'Attendance', icon: CheckCircle, path: '/attendance', allowedRoles: ['admin', 'teacher', 'principal'] },
        { key: 'exams', label: 'Exams', icon: Exam, path: '/exams', allowedRoles: ['admin', 'teacher', 'principal'] },
      ],
    },
    {
      title: 'Finance',
      items: [
        { key: 'fee-structure', label: 'Fee Structure', icon: Coins, path: '/finance/fee-structure', allowedRoles: ['admin', 'accountant', 'principal'] },
        { key: 'fee-collection', label: 'Collection', icon: Wallet, path: '/finance/collection', allowedRoles: ['admin', 'accountant', 'principal'] },
        { key: 'finance-reports', label: 'Reports', icon: ChartBar, path: '/finance/reports', allowedRoles: ['admin', 'accountant', 'principal'] },
      ],
    },
    {
      title: 'Facilities',
      items: [
        { key: 'library', label: 'Library', icon: Books, path: '/library', allowedRoles: ['admin', 'librarian', 'teacher', 'student'], module: 'library' },
        { key: 'transport', label: 'Transport', icon: Bus, path: '/transport', allowedRoles: ['admin', 'transport_manager'], module: 'transport' },
        { key: 'hostel', label: 'Hostel', icon: House, path: '/hostel', allowedRoles: ['admin', 'warden'], module: 'hostel' },
      ],
    },
    {
      title: 'Other',
      items: [
        { key: 'reports', label: 'Reports', icon: ChartPie, path: '/reports', allowedRoles: ['admin', 'teacher', 'principal'] },
        { key: 'announcements', label: 'Announcements', icon: Bell, path: '/announcements', allowedRoles: ['admin', 'principal', 'teacher', 'staff'] },
        { key: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', allowedRoles: ['admin', 'principal', 'teacher', 'staff', 'student', 'parent'] },
        { key: 'module-requests', label: 'Module Requests', icon: ToggleRight, path: '/module-requests', allowedRoles: ['admin'] },
        { key: 'schools', label: 'Schools', icon: Buildings, path: '/schools', allowedRoles: ['super_admin'] },
        { key: 'settings', label: 'Settings', icon: Gear, path: '/settings', allowedRoles: ['admin', 'principal', 'teacher', 'staff', 'super_admin'] },
      ],
    },
  ];
};

const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const navigationGroups = useMemo(() => getNavigationGroups(user?.role, user?.modules), [user?.role, user?.modules]);
  const [schoolName, setSchoolName] = useState(user?.schoolName || '');

  useEffect(() => {
    if (!user?.schoolId) {
      setSchoolName('');
      return;
    }
    if (user?.schoolName) {
      setSchoolName(user.schoolName);
      return;
    }
    let cancelled = false;
    api.get(`/schools/${user.schoolId}`)
      .then((res) => {
        const name = res.data?.data?.school?.name;
        if (!cancelled && name) setSchoolName(name);
      })
      .catch(() => {
        if (!cancelled) setSchoolName(user.schoolId);
      });
    return () => { cancelled = true; };
  }, [user?.schoolId, user?.schoolName]);

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

  const displayName = user?.firstName || user?.name || 'Guest';
  const roleLabel = user?.role || 'User';

  return (
    <aside
      className={clsx(
        'sidebar-transition fixed left-0 top-0 z-40 flex min-h-[100dvh] flex-col border-r border-zinc-200 bg-white shadow-sidebar',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 shrink-0 items-center border-b border-zinc-200 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-600">
            <GraduationCap className="h-5 w-5 text-white" weight="fill" />
          </div>
          {!collapsed && (
            <span className="animate-fade-in truncate text-lg font-bold tracking-tight text-zinc-900">
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
                className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <span>{group.title}</span>
                <CaretDown
                  className={clsx(
                    'h-3 w-3 transition-transform duration-200',
                    !expandedGroups[groupIdx] && '-rotate-90'
                  )}
                />
              </button>
            )}

            {/* Group Items */}
            {(!group.title || expandedGroups[groupIdx] || collapsed) && (
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => (!item.allowedRoles || item.allowedRoles.includes(user?.role)) && (!item.module || isModuleEnabled(item.module)))
                  .map((item) => {
                  const isActive = isActivePath(item.path);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.path)}
                      className={clsx(
                        'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-160',
                        isActive
                          ? 'bg-accent-50 text-accent-700'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                        collapsed && 'justify-center'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={clsx(
                          'h-5 w-5 shrink-0 transition-colors',
                          isActive ? 'text-accent-600' : 'text-zinc-400 group-hover:text-zinc-600'
                        )}
                        weight={isActive ? 'fill' : 'regular'}
                      />
                      {!collapsed && (
                        <span className="animate-fade-in truncate">{item.label}</span>
                      )}
                      {isActive && !collapsed && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-500" />
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
      <div className="shrink-0 border-t border-zinc-200 p-2">
        {/* Current School */}
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Current school
            </p>
            <p className="truncate text-sm font-medium text-accent-700">
              {user?.schoolId ? schoolName || 'Loading...' : 'Super Admin'}
            </p>
          </div>
        )}

        {/* User Card */}
        <div
          className={clsx(
            'mb-2 flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-zinc-100 hover:bg-zinc-50',
            collapsed ? 'justify-center' : ''
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
            {getInitials(displayName)}
          </div>
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {displayName}
              </p>
              <p className="truncate text-xs capitalize text-zinc-500">
                {roleLabel}
              </p>
            </div>
          )}
        </div>

        {/* Collapse Toggle & Logout */}
        <div className={clsx('flex gap-1', collapsed ? 'flex-col' : '')}>
          <button
            onClick={onToggle}
            className="flex flex-1 items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <CaretRight className="h-4 w-4" />
            ) : (
              <CaretLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={logout}
            className="flex flex-1 items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
            title="Logout"
            aria-label="Logout"
          >
            <SignOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
