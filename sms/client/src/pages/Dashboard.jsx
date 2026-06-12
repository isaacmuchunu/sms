import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, ClipboardCheck, IndianRupee,
  TrendingUp, UserPlus, DollarSign, BookOpen,
  ArrowRight, Activity
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard';
import useFetch from '../hooks/useFetch';

const enrollmentData = [
  { month: 'Jun', students: 420 },
  { month: 'Jul', students: 435 },
  { month: 'Aug', students: 450 },
  { month: 'Sep', students: 465 },
  { month: 'Oct', students: 478 },
  { month: 'Nov', students: 490 },
  { month: 'Dec', students: 485 },
  { month: 'Jan', students: 510 },
  { month: 'Feb', students: 525 },
  { month: 'Mar', students: 540 },
  { month: 'Apr', students: 555 },
  { month: 'May', students: 572 },
];

const genderData = [
  { name: 'Male', value: 310, color: '#4f46e5' },
  { name: 'Female', value: 262, color: '#ec4899' },
];

const classWiseData = [
  { class: '1-A', count: 35 }, { class: '1-B', count: 38 },
  { class: '2-A', count: 40 }, { class: '2-B', count: 36 },
  { class: '3-A', count: 42 }, { class: '3-B', count: 39 },
  { class: '4-A', count: 45 }, { class: '4-B', count: 41 },
  { class: '5-A', count: 38 }, { class: '5-B', count: 44 },
  { class: '6-A', count: 46 }, { class: '6-B', count: 40 },
];

const feeCollectionData = [
  { month: 'Jun', collected: 280000, target: 300000 },
  { month: 'Jul', collected: 295000, target: 300000 },
  { month: 'Aug', collected: 310000, target: 300000 },
  { month: 'Sep', collected: 285000, target: 300000 },
  { month: 'Oct', collected: 320000, target: 300000 },
  { month: 'Nov', collected: 305000, target: 300000 },
  { month: 'Dec', collected: 290000, target: 300000 },
  { month: 'Jan', collected: 325000, target: 300000 },
  { month: 'Feb', collected: 315000, target: 300000 },
  { month: 'Mar', collected: 340000, target: 300000 },
  { month: 'Apr', collected: 330000, target: 300000 },
  { month: 'May', collected: 350000, target: 300000 },
];

const recentActivities = [
  { id: 1, action: 'New student enrolled', detail: 'Rahul Sharma admitted to Class 5-A', time: '10 min ago', icon: UserPlus, color: 'emerald' },
  { id: 2, action: 'Fee payment received', detail: 'Rs. 25,000 from Priya Patel', time: '25 min ago', icon: DollarSign, color: 'blue' },
  { id: 3, action: 'Exam results published', detail: 'Term 1 results for Class 8', time: '1 hr ago', icon: BookOpen, color: 'purple' },
  { id: 4, action: 'Teacher assigned', detail: 'Mr. Kumar assigned to Class 10-B', time: '2 hrs ago', icon: GraduationCap, color: 'amber' },
  { id: 5, action: 'Attendance marked', detail: '95% attendance for Class 3-A today', time: '3 hrs ago', icon: ClipboardCheck, color: 'cyan' },
  { id: 6, action: 'Book issued', detail: 'Physics NCERT issued to Student #1042', time: '4 hrs ago', icon: BookOpen, color: 'rose' },
];

const quickActions = [
  { label: 'Add Student', path: '/students/new', icon: UserPlus, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { label: 'Collect Fee', path: '/fees/collection', icon: IndianRupee, color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'Mark Attendance', path: '/attendance', icon: ClipboardCheck, color: 'bg-purple-600 hover:bg-purple-700' },
  { label: 'Add Teacher', path: '/teachers/new', icon: GraduationCap, color: 'bg-amber-600 hover:bg-amber-700' },
];

const Dashboard = () => {
  const { data: dashboardData } = useFetch('/reports/dashboard');
  const stats = dashboardData?.stats || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity size={16} />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats.students ?? 572} icon={Users} color="indigo" subtitle="Active enrollment" />
        <StatCard title="Total Teachers" value={stats.teachers ?? 48} icon={GraduationCap} color="emerald" subtitle="Active staff" />
        <StatCard title="Present Today" value={stats.presentToday ?? 0} icon={ClipboardCheck} color="amber" subtitle="Marked attendance" />
        <StatCard title="Fee Collected Today" value={`Rs. ${(stats.feeCollectedToday ?? 0).toLocaleString()}`} icon={IndianRupee} color="blue" subtitle="Recorded payments" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.path}
            className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${action.color}`}
          >
            <action.icon size={16} />
            {action.label}
          </Link>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Student Enrollment Trend</h3>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={enrollmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="students" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} name="Students" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {genderData.map((g) => (
              <div key={g.name} className="text-center">
                <p className="text-xl font-bold" style={{ color: g.color }}>{g.value}</p>
                <p className="text-xs text-gray-500">{g.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class-wise Student Count */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Class-wise Student Count</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={classWiseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="class" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee Collection vs Target */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Fee Collection vs Target</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={feeCollectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(val) => `Rs. ${val.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="collected" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} name="Collected" />
              <Area type="monotone" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeDasharray="5 5" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
          <Link to="/reports" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-3">
          {recentActivities.map((activity) => {
            const Icon = activity.icon;
            const colorMap = {
              emerald: 'bg-emerald-50 text-emerald-600',
              blue: 'bg-blue-50 text-blue-600',
              purple: 'bg-purple-50 text-purple-600',
              amber: 'bg-amber-50 text-amber-600',
              cyan: 'bg-cyan-50 text-cyan-600',
              rose: 'bg-rose-50 text-rose-600',
            };
            return (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-lg ${colorMap[activity.color]}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.detail}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
