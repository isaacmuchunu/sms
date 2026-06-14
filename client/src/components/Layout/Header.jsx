import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Bell,
  CaretRight,
  User,
  Gear,
  SignOut,
  List,
  EnvelopeOpen,
  CheckCircle,
  Clock,
} from '@phosphor-icons/react';
import { formatDistanceToNow, isValid } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import api from '../../services/api';

const breadcrumbMap = {
  '/dashboard': 'Dashboard',
  '/parent': 'Parent Portal',
  '/parent/attendance': 'Attendance',
  '/parent/fees': 'Fees & Payments',
  '/parent/results': 'Results',
  '/parent/meetings': 'Meetings',
  '/parent/library': 'Library',
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
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

const POLL_INTERVAL = 30000;
const RECENT_LIMIT = 5;

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (!isValid(date)) return '';
  return formatDistanceToNow(date, { addSuffix: true });
};

const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);
  const userDropdownRef = useRef(null);
  const userTriggerRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const notifTriggerRef = useRef(null);

  const displayName = user?.firstName || user?.name || 'Guest';

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ label: 'Home', path: '/dashboard' }];

    if (path !== '/dashboard' && path !== '/') {
      const matched = breadcrumbMap[path];
      if (matched) {
        crumbs.push({ label: matched, path });
      } else {
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

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setNotificationCount(response.data?.data?.unreadCount || 0);
    } catch {
      // Silently fail; don't spam the user if the endpoint is unreachable.
      setNotificationCount(0);
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications', {
        params: { isRead: 'false', limit: RECENT_LIMIT, sort: '-createdAt' },
      });
      const payload = response.data?.data || {};
      setRecentNotifications(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setRecentNotifications([]);
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    fetchUnreadCount();
    fetchRecentNotifications();
  }, [fetchUnreadCount, fetchRecentNotifications]);

  useEffect(() => {
    refreshNotifications();

    const interval = setInterval(refreshNotifications, POLL_INTERVAL);
    const onFocus = () => refreshNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target) &&
        userTriggerRef.current &&
        !userTriggerRef.current.contains(event.target)
      ) {
        setUserDropdownOpen(false);
      }
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target) &&
        notifTriggerRef.current &&
        !notifTriggerRef.current.contains(event.target)
      ) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      refreshNotifications();
      setNotifDropdownOpen(false);
      navigate('/notifications');
    } catch {
      // Let the notifications page handle errors on navigation.
      setNotifDropdownOpen(false);
      navigate('/notifications');
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      refreshNotifications();
    } catch {
      // Silently fail in the header; user can retry on the full page.
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 shadow-sm sm:px-6">
      {/* Left: Menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 lg:hidden"
          aria-label="Open menu"
        >
          <List className="h-5 w-5" />
        </button>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {idx > 0 && <CaretRight className="h-3.5 w-3.5 text-zinc-400" />}
              <span
                className={clsx(
                  idx === breadcrumbs.length - 1
                    ? 'font-semibold text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-700'
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
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchValue.trim()) {
                navigate(`/students?search=${encodeURIComponent(searchValue.trim())}`);
                setSearchValue('');
              }
            }}
            placeholder="Search students, teachers, classes..."
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-160 hover:border-zinc-300 focus:border-accent-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-600/20"
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notification Bell */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            ref={notifTriggerRef}
            onClick={() => {
              setNotifDropdownOpen((prev) => !prev);
              if (!notifDropdownOpen) refreshNotifications();
            }}
            className="relative rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
            aria-expanded={notifDropdownOpen}
            aria-haspopup="menu"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                style={{ transformOrigin: 'top right' }}
                className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white py-1 shadow-dropdown sm:w-96"
                role="menu"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">Notifications</p>
                  {notificationCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={markingAll}
                      className="flex items-center gap-1 text-xs font-medium text-accent-600 transition-colors hover:text-accent-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {markingAll ? 'Marking...' : 'Mark all read'}
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {recentNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                        <Bell className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-zinc-900">No unread notifications</p>
                      <p className="text-xs text-zinc-500">You are all caught up!</p>
                    </div>
                  ) : (
                    recentNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="group flex w-full items-start gap-3 border-b border-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-50 last:border-b-0"
                        role="menuitem"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                          <EnvelopeOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900 group-hover:text-accent-700">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                            {notification.message}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                            <Clock className="h-3 w-3" />
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" aria-hidden="true" />
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-zinc-100 px-4 py-2">
                  <button
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      navigate('/notifications');
                    }}
                    className="w-full rounded-lg py-2 text-center text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            ref={userTriggerRef}
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-zinc-100"
            aria-expanded={userDropdownOpen}
            aria-haspopup="menu"
          >
            <Avatar name={displayName} size="sm" />
            <div className="hidden text-left md:block">
              <p className="text-sm font-semibold leading-tight text-zinc-900">
                {displayName}
              </p>
              <p className="text-xs leading-tight text-zinc-500 capitalize">
                {user?.role || 'User'}
              </p>
            </div>
          </button>

          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                style={{ transformOrigin: 'top right' }}
                className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white py-1 shadow-dropdown"
                role="menu"
              >
                <div className="border-b border-zinc-100 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-zinc-500">{user?.email || ''}</p>
                </div>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  role="menuitem"
                >
                  <User className="h-4 w-4 text-zinc-400" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  role="menuitem"
                >
                  <Gear className="h-4 w-4 text-zinc-400" />
                  Settings
                </button>

                <div className="my-1 border-t border-zinc-100" />

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 transition-colors hover:bg-danger-50"
                  role="menuitem"
                >
                  <SignOut className="h-4 w-4" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
