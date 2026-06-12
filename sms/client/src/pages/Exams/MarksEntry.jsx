import React, { useState } from 'react';
import { Save, Send, CheckCircle } from 'lucide-react';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const EXAM_OPTIONS = [
  { value: '1', label: 'Unit Test 1' },
  { value: '2', label: 'Mid Term Exam' },
  { value: '3', label: 'Final Exam' },
];

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));

const SUBJECT_OPTIONS = [
  { value: 'math', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'sst', label: 'Social Science' },
];

const getGrade = (marks, maxMarks = 100) => {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const mockStudents = Array.from({ length: 15 }, (_, i) => ({
  _id: `s${i + 1}`,
  rollNo: i + 1,
  fullName: `Student ${i + 1}`,
  marks: '',
  remarks: '',
}));

const MarksEntry = () => {
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState(mockStudents);
  const [maxMarks, setMaxMarks] = useState(100);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateMark = (id, marks) => {
    const numMarks = marks === '' ? '' : Math.min(Number(marks), maxMarks);
    setStudents((prev) =>
      prev.map((s) => (s._id === id ? { ...s, marks: numMarks } : s))
    );
    setSaved(false);
  };

  const updateRemarks = (id, remarks) => {
    setStudents((prev) =>
      prev.map((s) => (s._id === id ? { ...s, remarks } : s))
    );
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await api.post('/exams/marks', {
        examId: selectedExam,
        subject: selectedSubject,
        marks: students.map((s) => ({
          studentId: s._id,
          marksObtained: s.marks === '' ? null : Number(s.marks),
          remarks: s.remarks,
        })),
      });
      setSaved(true);
    } catch {
      alert('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/exams/marks/submit', {
        examId: selectedExam,
        subject: selectedSubject,
        marks: students.map((s) => ({
          studentId: s._id,
          marksObtained: s.marks === '' ? null : Number(s.marks),
          remarks: s.remarks,
        })),
      });
      alert('Marks submitted for approval');
    } catch {
      alert('Failed to submit marks');
    } finally {
      setSubmitting(false);
    }
  };

  const allEntered = students.every((s) => s.marks !== '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
        <p className="text-sm text-gray-500 mt-1">Enter and manage exam marks</p>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <SelectField label="Exam" name="exam" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} options={EXAM_OPTIONS} />
          <SelectField label="Class" name="class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} options={CLASS_OPTIONS} />
          <SelectField label="Subject" name="subject" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} options={SUBJECT_OPTIONS} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Marks</label>
            <input
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Roll No</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Marks (0-{maxMarks})</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Grade</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((s) => {
                const grade = s.marks !== '' ? getGrade(Number(s.marks), maxMarks) : '-';
                const isFail = s.marks !== '' && Number(s.marks) < maxMarks * 0.4;
                return (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-700">{s.rollNo}</td>
                    <td className="px-6 py-3 text-gray-800">{s.fullName}</td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        min={0}
                        max={maxMarks}
                        value={s.marks}
                        onChange={(e) => updateMark(s._id, e.target.value)}
                        className={`w-24 mx-auto block px-3 py-1.5 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isFail ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isFail ? 'bg-red-50 text-red-700' : grade.startsWith('A') ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {grade}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={s.remarks}
                        onChange={(e) => updateRemarks(s._id, e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle size={14} /> Draft saved
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !allEntered}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarksEntry;
