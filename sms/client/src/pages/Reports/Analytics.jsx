import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, IndianRupee, ClipboardCheck, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import StatCard from '../../components/StatCard';

const enrollmentData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'][i],
  students: 400 + i * 15 + Math.floor(Math.random() * 20),
}));

const feeData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'][i],
  collection: 250000 + Math.floor(Math.random() * 100000),
}));

const attendanceData = [
  { name: 'Present', value: 85, color: '#10b981' },
  { name: 'Absent', value: 8, color: '#ef4444' },
  { name: 'Late', value: 4, color: '#f59e0b' },
  { name: 'Half Day', value: 2, color: '#3b82f6' },
  { name: 'Excused', value: 1, color: '#8b5cf6' },
];

const examData = [
  { grade: 'A+', count: 45 },
  { grade: 'A', count: 78 },
  { grade: 'B+', count: 92 },
  { grade: 'B', count: 65 },
  { grade: 'C', count: 35 },
  { grade: 'D', count: 18 },
  { grade: 'F', count: 8 },
];

const libraryData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'][i],
  issued: 200 + Math.floor(Math.random() * 150),
  returned: 180 + Math.floor(Math.random() * 150),
}));

const kpis = [
  { title: 'Total Students', value: '572', icon: Users, color: 'indigo' },
  { title: 'Fee Collection', value: 'Rs. 3.6M', icon: IndianRupee, color: 'emerald' },
  { title: 'Avg Attendance', value: '94.2%', icon: ClipboardCheck, color: 'amber' },
  { title: 'Books Circulated', value: '2,847', icon: BookOpen, color: 'blue' },
  { title: 'Pass Rate', value: '91.5%', icon: GraduationCap, color: 'purple' },
  { title: 'Growth', value: '+12%', icon: TrendingUp, color: 'cyan' },
];

const Analytics = () => {
  const [dateRange, setDateRange] = useState({ start: '2024-06-01', end: '2025-05-31' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive school analytics and reports</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400 self-center">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <StatCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} color={kpi.color} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Student Enrollment Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={enrollmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="students" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Fee Collection</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={feeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(val) => `Rs. ${val.toLocaleString()}`} />
              <Bar dataKey="collection" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Status Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={attendanceData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {attendanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Exam Results Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={examData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Library Book Circulation</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={libraryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="issued" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} name="Books Issued" />
            <Area type="monotone" dataKey="returned" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Books Returned" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
