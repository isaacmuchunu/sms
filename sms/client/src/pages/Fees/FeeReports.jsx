import React from 'react';
import { IndianRupee, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const monthlyData = [
  { month: 'Jun', collected: 280000, outstanding: 45000 },
  { month: 'Jul', collected: 295000, outstanding: 38000 },
  { month: 'Aug', collected: 310000, outstanding: 32000 },
  { month: 'Sep', collected: 285000, outstanding: 52000 },
  { month: 'Oct', collected: 320000, outstanding: 28000 },
  { month: 'Nov', collected: 305000, outstanding: 35000 },
  { month: 'Dec', collected: 290000, outstanding: 41000 },
  { month: 'Jan', collected: 325000, outstanding: 25000 },
  { month: 'Feb', collected: 315000, outstanding: 30000 },
  { month: 'Mar', collected: 340000, outstanding: 20000 },
  { month: 'Apr', collected: 330000, outstanding: 22000 },
  { month: 'May', collected: 350000, outstanding: 18000 },
];

const classWiseData = [
  { class: 'Class 1', collected: 240000, outstanding: 15000 },
  { class: 'Class 2', collected: 255000, outstanding: 22000 },
  { class: 'Class 3', collected: 260000, outstanding: 18000 },
  { class: 'Class 4', collected: 275000, outstanding: 25000 },
  { class: 'Class 5', collected: 280000, outstanding: 30000 },
  { class: 'Class 6', collected: 290000, outstanding: 20000 },
];

const defaulters = [
  { name: 'Amit Kumar', class: '5-A', amount: 25000, contact: '9876543210' },
  { name: 'Priya Sharma', class: '7-B', amount: 18000, contact: '9876543211' },
  { name: 'Rohan Verma', class: '3-A', amount: 15000, contact: '9876543212' },
  { name: 'Sneha Patel', class: '8-C', amount: 32000, contact: '9876543213' },
  { name: 'Vikram Singh', class: '10-A', amount: 45000, contact: '9876543214' },
];

const totalCollection = monthlyData.reduce((s, m) => s + m.collected, 0);
const totalOutstanding = monthlyData.reduce((s, m) => s + m.outstanding, 0);
const collectionRate = ((totalCollection / (totalCollection + totalOutstanding)) * 100).toFixed(1);

const FeeReports = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive fee collection analytics</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          <Download size={16} /> Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg"><IndianRupee size={24} className="text-emerald-600" /></div>
          <div><p className="text-sm text-gray-500">Total Collection</p><p className="text-2xl font-bold text-gray-900">Rs. {(totalCollection / 100000).toFixed(2)}L</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg"><AlertTriangle size={24} className="text-red-600" /></div>
          <div><p className="text-sm text-gray-500">Total Outstanding</p><p className="text-2xl font-bold text-red-600">Rs. {totalOutstanding.toLocaleString()}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><TrendingUp size={24} className="text-blue-600" /></div>
          <div><p className="text-sm text-gray-500">Collection Rate</p><p className="text-2xl font-bold text-blue-600">{collectionRate}%</p></div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Collection vs Outstanding</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(val) => `Rs. ${val.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} name="Collected" />
            <Bar dataKey="outstanding" fill="#ef4444" radius={[4, 4, 0, 0]} name="Outstanding" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class-wise Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Class-wise Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Class</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Collected</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classWiseData.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.class}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">Rs. {c.collected.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-600">Rs. {c.outstanding.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Defaulters List */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Defaulters</h3>
          <div className="space-y-3">
            {defaulters.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.class} | {d.contact}</p>
                </div>
                <p className="text-sm font-bold text-red-600">Rs. {d.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeReports;
