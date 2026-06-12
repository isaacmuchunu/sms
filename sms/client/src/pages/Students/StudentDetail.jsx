import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Pencil, User, Calendar, GraduationCap,
  Phone, Mail, MapPin, FileText, TrendingUp, IndianRupee,
  Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useFetch from '../../hooks/useFetch';

const attendanceMock = [
  { month: 'Jun', present: 22, absent: 2 },
  { month: 'Jul', present: 24, absent: 1 },
  { month: 'Aug', present: 20, absent: 4 },
  { month: 'Sep', present: 23, absent: 2 },
  { month: 'Oct', present: 25, absent: 0 },
  { month: 'Nov', present: 22, absent: 3 },
];

const feesMock = [
  { head: 'Tuition Fee', amount: 15000, paid: 15000, status: 'Paid' },
  { head: 'Exam Fee', amount: 2000, paid: 2000, status: 'Paid' },
  { head: 'Library Fee', amount: 1000, paid: 500, status: 'Partial' },
  { head: 'Transport Fee', amount: 8000, paid: 0, status: 'Pending' },
];

const resultsMock = [
  { subject: 'Mathematics', marks: 85, max: 100, grade: 'A' },
  { subject: 'Science', marks: 92, max: 100, grade: 'A+' },
  { subject: 'English', marks: 78, max: 100, grade: 'B+' },
  { subject: 'Hindi', marks: 88, max: 100, grade: 'A' },
  { subject: 'Social Science', marks: 90, max: 100, grade: 'A+' },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'attendance', label: 'Attendance', icon: TrendingUp },
  { id: 'fees', label: 'Fees', icon: IndianRupee },
  { id: 'results', label: 'Results', icon: Award },
];

const StudentDetail = () => {
  const { id } = useParams();
  const { data: studentData, loading, error } = useFetch(`/students/${id}`);
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Link to="/students" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Students
        </Link>
      </div>
    );
  }

  const detail = studentData || {};
  const s = detail.student || detail;
  const classLabel =
    typeof s.currentClass === 'object' && s.currentClass
      ? `${s.currentClass.name} - Section ${s.currentClass.section}`
      : `${s.currentClass || '-'} - Section ${s.currentSection || '-'}`;

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
        <div className="space-y-3">
          <InfoRow icon={User} label="Full Name" value={s.fullName || `${s.firstName} ${s.lastName}`} />
          <InfoRow icon={Calendar} label="Date of Birth" value={s.dob ? new Date(s.dob).toLocaleDateString() : '-'} />
          <InfoRow icon={User} label="Gender" value={s.gender || '-'} />
          <InfoRow icon={User} label="Blood Group" value={s.bloodGroup || '-'} />
          <InfoRow icon={User} label="Religion" value={s.religion || '-'} />
          <InfoRow icon={User} label="Category" value={s.category || '-'} />
          <InfoRow icon={FileText} label="Aadhaar" value={s.aadhaarNo || '-'} />
        </div>
      </div>

      {/* Academic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Academic Information</h3>
        <div className="space-y-3">
          <InfoRow icon={FileText} label="Admission No" value={s.admissionNo || '-'} />
          <InfoRow icon={FileText} label="Roll No" value={s.rollNo || '-'} />
          <InfoRow icon={Calendar} label="Academic Year" value={s.academicYear || '-'} />
          <InfoRow icon={GraduationCap} label="Current Class" value={classLabel} />
          <InfoRow icon={GraduationCap} label="Previous School" value={s.previousSchool || '-'} />
          <InfoRow icon={GraduationCap} label="Previous Class %" value={s.previousClassPercentage ? `${s.previousClassPercentage}%` : '-'} />
        </div>
      </div>

      {/* Guardian Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Guardian Information</h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Father</p>
            <div className="mt-1 space-y-1">
              <InfoRow icon={User} label="Name" value={s.fatherName || '-'} />
              <InfoRow icon={Phone} label="Phone" value={s.fatherPhone || '-'} />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Mother</p>
            <div className="mt-1 space-y-1">
              <InfoRow icon={User} label="Name" value={s.motherName || '-'} />
              <InfoRow icon={Phone} label="Phone" value={s.motherPhone || '-'} />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Address</h3>
        <div className="space-y-3">
          <InfoRow icon={MapPin} label="Address" value={s.address || '-'} />
          <InfoRow icon={MapPin} label="City" value={s.city || '-'} />
          <InfoRow icon={MapPin} label="State" value={s.state || '-'} />
          <InfoRow icon={MapPin} label="Pincode" value={s.pincode || '-'} />
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatBox label="Total Days" value="136" color="indigo" />
        <StatBox label="Present" value="126" color="emerald" />
        <StatBox label="Absent" value="10" color="red" />
        <StatBox label="Attendance %" value="92.6%" color="blue" />
      </div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Attendance</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={attendanceMock}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Present" />
          <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderFees = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox label="Total Fee" value="Rs. 26,000" color="indigo" />
        <StatBox label="Paid" value="Rs. 17,500" color="emerald" />
        <StatBox label="Balance" value="Rs. 8,500" color="amber" />
        <StatBox label="Status" value="Partial" color="purple" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Fee Head</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Amount</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Paid</th>
              <th className="px-6 py-3 text-center font-medium text-gray-500">Balance</th>
              <th className="px-6 py-3 text-center font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {feesMock.map((f, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-800">{f.head}</td>
                <td className="px-6 py-3 text-right">Rs. {f.amount.toLocaleString()}</td>
                <td className="px-6 py-3 text-right">Rs. {f.paid.toLocaleString()}</td>
                <td className="px-6 py-3 text-center">Rs. {(f.amount - f.paid).toLocaleString()}</td>
                <td className="px-6 py-3 text-center">
                  <FeeStatusBadge status={f.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderResults = () => {
    const totalMarks = resultsMock.reduce((s, r) => s + r.marks, 0);
    const totalMax = resultsMock.reduce((s, r) => s + r.max, 0);
    const percentage = ((totalMarks / totalMax) * 100).toFixed(1);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox label="Total Marks" value={`${totalMarks}/${totalMax}`} color="indigo" />
          <StatBox label="Percentage" value={`${percentage}%`} color="emerald" />
          <StatBox label="Grade" value="A" color="amber" />
          <StatBox label="Rank" value="5th" color="purple" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Subject</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Marks</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Max</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Grade</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {resultsMock.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{r.subject}</td>
                  <td className="px-6 py-3 text-center font-semibold">{r.marks}</td>
                  <td className="px-6 py-3 text-center text-gray-500">{r.max}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      {r.grade}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${(r.marks / r.max) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const tabContent = {
    overview: renderOverview,
    attendance: renderAttendance,
    fees: renderFees,
    results: renderResults,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/students" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
              <User size={28} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{s.fullName || `${s.firstName || ''} ${s.lastName || ''}` || 'Student'}</h1>
              <p className="text-sm text-gray-500">
                Admission No: {s.admissionNo || '-'} | Class {classLabel}
              </p>
            </div>
          </div>
        </div>
        <Link
          to={`/students/${id}?edit=true`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Pencil size={16} />
          Edit
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="p-6">{tabContent[activeTab]()}</div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <span className="text-xs text-gray-500">{label}</span>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  </div>
);

const StatBox = ({ label, value, color }) => {
  const colorMap = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${colorMap[color] || 'text-gray-800'}`}>{value}</p>
    </div>
  );
};

const FeeStatusBadge = ({ status }) => {
  const classes = {
    Paid: 'bg-emerald-50 text-emerald-700',
    Partial: 'bg-amber-50 text-amber-700',
    Pending: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status] || classes.Pending}`}>
      {status}
    </span>
  );
};

export default StudentDetail;
