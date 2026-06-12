import React, { useState, useMemo } from 'react';
import { Download, Award, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import SelectField from '../../components/Form/SelectField';

const EXAM_OPTIONS = [
  { value: '1', label: 'Unit Test 1' },
  { value: '2', label: 'Mid Term Exam' },
];

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));

const subjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science'];

const generateMockResults = () =>
  Array.from({ length: 20 }, (_, i) => {
    const marks = subjects.map(() => Math.floor(Math.random() * 60) + 40);
    const total = marks.reduce((s, m) => s + m, 0);
    const percentage = (total / (subjects.length * 100)) * 100;
    const passed = marks.every((m) => m >= 40);
    return {
      _id: `s${i + 1}`,
      rollNo: i + 1,
      fullName: `Student ${i + 1}`,
      marks,
      total,
      percentage: percentage.toFixed(1),
      grade: percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : 'D',
      passed,
      rank: 0,
    };
  }).sort((a, b) => b.total - a.total).map((r, i) => ({ ...r, rank: i + 1 }));

const Results = () => {
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [results] = useState(generateMockResults);

  const summary = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = ((passed / total) * 100).toFixed(1);
    return { total, passed, failed, passRate };
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results</h1>
          <p className="text-sm text-gray-500 mt-1">View exam results and generate report cards</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Download size={16} /> Export Report Cards
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <SelectField label="Exam" name="exam" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} options={EXAM_OPTIONS} />
          <SelectField label="Class" name="class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} options={CLASS_OPTIONS} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg"><Users size={20} className="text-indigo-600" /></div>
          <div><p className="text-xs text-gray-500">Total Students</p><p className="text-xl font-bold text-gray-900">{summary.total}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg"><CheckCircle size={20} className="text-emerald-600" /></div>
          <div><p className="text-xs text-gray-500">Passed</p><p className="text-xl font-bold text-emerald-600">{summary.passed}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg"><XCircle size={20} className="text-red-600" /></div>
          <div><p className="text-xs text-gray-500">Failed</p><p className="text-xl font-bold text-red-600">{summary.failed}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg"><Award size={20} className="text-purple-600" /></div>
          <div><p className="text-xs text-gray-500">Pass Rate</p><p className="text-xl font-bold text-purple-600">{summary.passRate}%</p></div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                {subjects.map((s) => (
                  <th key={s} className="px-4 py-3 text-center font-medium text-gray-500">{s}</th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-gray-500">Total</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">%</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Grade</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((r) => (
                <tr key={r._id} className={`hover:bg-gray-50 transition-colors ${!r.passed ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 font-bold text-gray-700">#{r.rank}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.fullName}</td>
                  {r.marks.map((m, i) => (
                    <td key={i} className={`px-4 py-3 text-center font-medium ${m < 40 ? 'text-red-600' : 'text-gray-700'}`}>
                      {m}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-bold text-gray-800">{r.total}</td>
                  <td className="px-4 py-3 text-center font-semibold">{r.percentage}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      r.grade.startsWith('A') ? 'bg-emerald-50 text-emerald-700' : r.grade.startsWith('B') ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {r.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.passed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle size={14} /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                        <XCircle size={14} /> Fail
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Results;
