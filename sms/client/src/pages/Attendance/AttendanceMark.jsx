import React, { useState } from 'react';
import { Save, CheckCircle, Users, Calendar, BookOpen } from 'lucide-react';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));

const SECTION_OPTIONS = ['A', 'B', 'C'].map((s) => ({
  value: s,
  label: `Section ${s}`,
}));

const SUBJECT_OPTIONS = [
  { value: '', label: 'Daily (All Subjects)' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Science', label: 'Science' },
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Social Science', label: 'Social Science' },
];

const STATUS_CONFIG = {
  Present: { color: 'bg-emerald-500 hover:bg-emerald-600', label: 'P', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  Absent: { color: 'bg-red-500 hover:bg-red-600', label: 'A', text: 'text-red-700', bg: 'bg-red-50' },
  Late: { color: 'bg-amber-500 hover:bg-amber-600', label: 'L', text: 'text-amber-700', bg: 'bg-amber-50' },
  HalfDay: { color: 'bg-blue-500 hover:bg-blue-600', label: 'H', text: 'text-blue-700', bg: 'bg-blue-50' },
  Excused: { color: 'bg-purple-500 hover:bg-purple-600', label: 'E', text: 'text-purple-700', bg: 'bg-purple-50' },
};

// Mock students
const mockStudents = Array.from({ length: 25 }, (_, i) => ({
  _id: `s${i + 1}`,
  rollNo: i + 1,
  fullName: `Student ${i + 1}`,
  status: 'Present',
}));

const AttendanceMark = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState(mockStudents);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateStatus = (id, status) => {
    setStudents((prev) => prev.map((s) => (s._id === id ? { ...s, status } : s)));
    setSaved(false);
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'Present' })));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/attendance', {
        class: selectedClass,
        section: selectedSection,
        date: selectedDate,
        subject: selectedSubject || undefined,
        records: students.map((s) => ({ studentId: s._id, status: s.status })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const summary = {
    total: students.length,
    present: students.filter((s) => s.status === 'Present').length,
    absent: students.filter((s) => s.status === 'Absent').length,
    late: students.filter((s) => s.status === 'Late').length,
    halfDay: students.filter((s) => s.status === 'HalfDay').length,
    excused: students.filter((s) => s.status === 'Excused').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Record daily or subject-wise attendance</p>
      </div>

      {/* Top Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
            <SelectField
              label="Class"
              name="class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={CLASS_OPTIONS}
            />
            <SelectField
              label="Section"
              name="section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              options={SECTION_OPTIONS}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <SelectField
              label="Subject (optional)"
              name="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              options={SUBJECT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Summary + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = summary[key.toLowerCase()] || 0;
            return (
              <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}>
                <span className={`w-3 h-3 rounded-full ${config.color.split(' ')[0]}`} />
                <span className={`text-sm font-medium ${config.text}`}>
                  {key}: {count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={markAllPresent}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={16} />
            Mark All Present
          </button>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Roll No</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-700">{student.rollNo}</td>
                  <td className="px-6 py-3 text-gray-800">{student.fullName}</td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        STATUS_CONFIG[student.status]?.bg || 'bg-gray-100'
                      } ${STATUS_CONFIG[student.status]?.text || 'text-gray-600'}`}
                    >
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(student._id, status)}
                          title={status}
                          className={`w-8 h-8 rounded-lg text-white text-xs font-bold transition-all ${config.color} ${
                            student.status === status ? 'ring-2 ring-offset-1 ring-gray-300 scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Total: <span className="font-semibold text-gray-800">{summary.total}</span> students | Present:{' '}
          <span className="font-semibold text-emerald-600">{summary.present}</span> | Absent:{' '}
          <span className="font-semibold text-red-600">{summary.absent}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
};

export default AttendanceMark;
