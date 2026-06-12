import React, { useState } from 'react';
import { Save, School, Calendar, Award, Bell, CheckCircle } from 'lucide-react';
import InputField from '../../components/Form/InputField';

const TABS = [
  { id: 'school', label: 'School Info', icon: School },
  { id: 'academic', label: 'Academic Year', icon: Calendar },
  { id: 'grading', label: 'Grading Scale', icon: Award },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const defaultGradingScale = [
  { grade: 'A+', minPercent: 90, maxPercent: 100 },
  { grade: 'A', minPercent: 80, maxPercent: 89 },
  { grade: 'B+', minPercent: 70, maxPercent: 79 },
  { grade: 'B', minPercent: 60, maxPercent: 69 },
  { grade: 'C', minPercent: 50, maxPercent: 59 },
  { grade: 'D', minPercent: 40, maxPercent: 49 },
  { grade: 'F', minPercent: 0, maxPercent: 39 },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('school');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [schoolInfo, setSchoolInfo] = useState({
    name: 'Springfield Public School',
    address: '123 Education Lane, Springfield',
    phone: '+91-9876543210',
    email: 'info@springfieldschool.edu',
  });

  const [academicYear, setAcademicYear] = useState({
    year: '2024-2025',
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    terms: [
      { name: 'Term 1', start: '2024-06-01', end: '2024-09-30' },
      { name: 'Term 2', start: '2024-10-01', end: '2024-12-31' },
      { name: 'Term 3', start: '2025-01-01', end: '2025-03-31' },
      { name: 'Term 4', start: '2025-04-01', end: '2025-05-31' },
    ],
  });

  const [gradingScale, setGradingScale] = useState(defaultGradingScale);

  const [notificationSettings, setNotificationSettings] = useState({
    emailAnnouncements: true,
    smsAlerts: true,
    pushNotifications: false,
    feeReminders: true,
    attendanceAlerts: true,
    examResults: true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(
        'sms_settings',
        JSON.stringify({ schoolInfo, academicYear, gradingScale, notificationSettings })
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateGrading = (idx, field, value) => {
    setGradingScale((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, [field]: Number(value) } : g))
    );
  };

  const renderSchoolInfo = () => (
    <div className="space-y-5 max-w-lg">
      <InputField
        label="School Name"
        name="schoolName"
        value={schoolInfo.name}
        onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
        <textarea
          value={schoolInfo.address}
          onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
      <InputField
        label="Phone"
        name="phone"
        value={schoolInfo.phone}
        onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
      />
      <InputField
        label="Email"
        name="email"
        type="email"
        value={schoolInfo.email}
        onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
      />
    </div>
  );

  const renderAcademicYear = () => (
    <div className="space-y-5 max-w-lg">
      <InputField
        label="Academic Year"
        name="year"
        value={academicYear.year}
        onChange={(e) => setAcademicYear({ ...academicYear, year: e.target.value })}
        placeholder="2024-2025"
      />
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Start Date"
          name="startDate"
          type="date"
          value={academicYear.startDate}
          onChange={(e) => setAcademicYear({ ...academicYear, startDate: e.target.value })}
        />
        <InputField
          label="End Date"
          name="endDate"
          type="date"
          value={academicYear.endDate}
          onChange={(e) => setAcademicYear({ ...academicYear, endDate: e.target.value })}
        />
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Terms</h4>
        <div className="space-y-3">
          {academicYear.terms.map((term, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-xs text-gray-500">Name</label>
                <input
                  type="text"
                  value={term.name}
                  onChange={(e) => {
                    const newTerms = [...academicYear.terms];
                    newTerms[i].name = e.target.value;
                    setAcademicYear({ ...academicYear, terms: newTerms });
                  }}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Start</label>
                <input
                  type="date"
                  value={term.start}
                  onChange={(e) => {
                    const newTerms = [...academicYear.terms];
                    newTerms[i].start = e.target.value;
                    setAcademicYear({ ...academicYear, terms: newTerms });
                  }}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">End</label>
                <input
                  type="date"
                  value={term.end}
                  onChange={(e) => {
                    const newTerms = [...academicYear.terms];
                    newTerms[i].end = e.target.value;
                    setAcademicYear({ ...academicYear, terms: newTerms });
                  }}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGradingScale = () => (
    <div className="max-w-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Grade</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Min %</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Max %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {gradingScale.map((g, i) => (
              <tr key={g.grade} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{g.grade}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={g.minPercent}
                    onChange={(e) => updateGrading(i, 'minPercent', e.target.value)}
                    className="w-20 mx-auto block px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={g.maxPercent}
                    onChange={(e) => updateGrading(i, 'maxPercent', e.target.value)}
                    className="w-20 mx-auto block px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4 max-w-lg">
      {[
        { key: 'emailAnnouncements', label: 'Email Announcements', desc: 'Receive announcements via email' },
        { key: 'smsAlerts', label: 'SMS Alerts', desc: 'Get important alerts via SMS' },
        { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
        { key: 'feeReminders', label: 'Fee Reminders', desc: 'Reminders for fee payment deadlines' },
        { key: 'attendanceAlerts', label: 'Attendance Alerts', desc: 'Notifications for low attendance' },
        { key: 'examResults', label: 'Exam Results', desc: 'Get notified when results are published' },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-500">{item.desc}</p>
          </div>
          <button
            onClick={() => setNotificationSettings((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              notificationSettings[item.key] ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                notificationSettings[item.key] ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );

  const tabContent = {
    school: renderSchoolInfo,
    academic: renderAcademicYear,
    grading: renderGradingScale,
    notifications: renderNotifications,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure system settings and preferences</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {tabContent[activeTab]()}

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle size={14} /> Settings saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
