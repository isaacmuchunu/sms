import React, { useState, useMemo } from 'react';
import { Search, Download, AlertTriangle, TrendingUp, Users, Calendar } from 'lucide-react';
import SelectField from '../../components/Form/SelectField';

const mockData = Array.from({ length: 30 }, (_, i) => ({
  _id: `s${i + 1}`,
  rollNo: i + 1,
  fullName: `Student ${i + 1}`,
  totalDays: 120,
  present: 110 - (i % 15),
  absent: 5 + (i % 10),
  late: 2 + (i % 3),
}));

mockData.forEach((s) => {
  s.percentage = ((s.present / s.totalDays) * 100).toFixed(1);
});

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(2024 - i),
  label: String(2024 - i),
}));

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));

const AttendanceReport = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm) return mockData;
    const lower = searchTerm.toLowerCase();
    return mockData.filter((s) => s.fullName.toLowerCase().includes(lower));
  }, [searchTerm]);

  const avgAttendance = (filteredData.reduce((s, d) => s + Number(d.percentage), 0) / filteredData.length).toFixed(1);
  const defaulters = filteredData.filter((d) => Number(d.percentage) < 75).length;
  const mostAbsent = [...filteredData].sort((a, b) => b.absent - a.absent)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
        <p className="text-sm text-gray-500 mt-1">View and analyze attendance records</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <SelectField label="Class" name="class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} options={CLASS_OPTIONS} />
            <SelectField label="Month" name="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} options={MONTHS} />
            <SelectField label="Year" name="year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} options={YEARS} />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors self-end">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg"><Users size={20} className="text-indigo-600" /></div>
          <div><p className="text-xs text-gray-500">Total Students</p><p className="text-xl font-bold text-gray-900">{filteredData.length}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg"><TrendingUp size={20} className="text-emerald-600" /></div>
          <div><p className="text-xs text-gray-500">Avg Attendance</p><p className="text-xl font-bold text-gray-900">{avgAttendance}%</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-red-600" /></div>
          <div><p className="text-xs text-gray-500">Defaulters (&lt;75%)</p><p className="text-xl font-bold text-red-600">{defaulters}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg"><Calendar size={20} className="text-amber-600" /></div>
          <div><p className="text-xs text-gray-500">Most Absent</p><p className="text-sm font-bold text-gray-900">{mostAbsent?.fullName}</p></div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search student..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Roll No</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Total Days</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Present</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Absent</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Late</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">%</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((s) => {
                const pct = Number(s.percentage);
                const isDefaulter = pct < 75;
                const barColor = isDefaulter ? 'bg-red-500' : pct >= 90 ? 'bg-emerald-500' : 'bg-amber-500';

                return (
                  <tr key={s._id} className={`hover:bg-gray-50 transition-colors ${isDefaulter ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-3 font-medium text-gray-700">{s.rollNo}</td>
                    <td className="px-6 py-3 text-gray-800">{s.fullName}</td>
                    <td className="px-6 py-3 text-center">{s.totalDays}</td>
                    <td className="px-6 py-3 text-center text-emerald-600 font-medium">{s.present}</td>
                    <td className="px-6 py-3 text-center text-red-600 font-medium">{s.absent}</td>
                    <td className="px-6 py-3 text-center text-amber-600 font-medium">{s.late}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`font-semibold ${isDefaulter ? 'text-red-600' : 'text-emerald-600'}`}>
                        {s.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2 ml-auto">
                        <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;
