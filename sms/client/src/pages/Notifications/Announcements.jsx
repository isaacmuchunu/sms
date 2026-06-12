import React, { useState } from 'react';
import { Plus, Send, Calendar, Clock, X, Bell, Users, GraduationCap, UserCheck } from 'lucide-react';
import Modal from '../../components/Modal';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const typeBadge = (type) => {
  const classes = {
    General: 'bg-blue-50 text-blue-700',
    Urgent: 'bg-red-50 text-red-700',
    Academic: 'bg-indigo-50 text-indigo-700',
    Event: 'bg-emerald-50 text-emerald-700',
    Holiday: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[type] || classes.General}`}>
      {type || 'General'}
    </span>
  );
};

const mockAnnouncements = [
  { _id: '1', title: 'Annual Day Celebration 2025', message: 'We are pleased to announce that the Annual Day Celebration will be held on February 15th. All students and parents are invited...', type: 'Event', date: '2025-01-20', sentBy: 'Principal', targetRoles: ['all'] },
  { _id: '2', title: 'Mid-Term Exam Schedule', message: 'The mid-term examinations for Classes 6-12 will commence from February 10th. Please check the detailed timetable...', type: 'Academic', date: '2025-01-18', sentBy: 'Academic Coordinator', targetRoles: ['student', 'teacher', 'parent'] },
  { _id: '3', title: 'School Closure - Republic Day', message: 'The school will remain closed on January 26th on account of Republic Day. Wishing everyone a happy Republic Day...', type: 'Holiday', date: '2025-01-15', sentBy: 'Admin', targetRoles: ['all'] },
  { _id: '4', title: 'Fee Payment Reminder', message: 'This is a gentle reminder that the fee payment deadline for Q4 is approaching. Please ensure timely payment...', type: 'Urgent', date: '2025-01-14', sentBy: 'Accounts Department', targetRoles: ['parent'] },
  { _id: '5', title: 'New Library Hours', message: 'The school library will now operate from 8:00 AM to 5:00 PM on all working days. Students are encouraged...', type: 'General', date: '2025-01-12', sentBy: 'Librarian', targetRoles: ['student', 'teacher'] },
];

const ROLE_OPTIONS = [
  { value: 'student', label: 'Students', icon: Users },
  { value: 'teacher', label: 'Teachers', icon: GraduationCap },
  { value: 'parent', label: 'Parents', icon: UserCheck },
  { value: 'admin', label: 'Admin Staff', icon: Users },
];

const Announcements = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'General',
    targetRoles: [],
    scheduleDate: '',
    sendNow: true,
  });
  const [sending, setSending] = useState(false);

  const toggleRole = (role) => {
    setForm((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/notifications/announcements', {
        ...form,
        scheduledFor: form.sendNow ? null : form.scheduleDate,
      });
      setShowForm(false);
      setForm({ title: '', message: '', type: 'General', targetRoles: [], scheduleDate: '', sendNow: true });
    } catch {
      alert('Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">Send and manage school announcements</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Create Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {mockAnnouncements.map((a) => (
          <div key={a._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {typeBadge(a.type)}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(a.date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-800">{a.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.message}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Users size={12} />
                <span>By {a.sentBy}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Announcement" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Title"
            name="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Enter announcement message..."
              required
            />
          </div>
          <SelectField
            label="Type"
            name="type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[
              { value: 'General', label: 'General' },
              { value: 'Urgent', label: 'Urgent' },
              { value: 'Academic', label: 'Academic' },
              { value: 'Event', label: 'Event' },
              { value: 'Holiday', label: 'Holiday' },
            ]}
          />

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                const isSelected = form.targetRoles.includes(role.value);
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => toggleRole(role.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={14} />
                    {role.label}
                    {isSelected && <CheckCircle size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.sendNow}
                  onChange={() => setForm({ ...form, sendNow: true })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Send Now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!form.sendNow}
                  onChange={() => setForm({ ...form, sendNow: false })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Schedule</span>
              </label>
            </div>
            {!form.sendNow && (
              <div className="mt-2">
                <input
                  type="datetime-local"
                  value={form.scheduleDate}
                  onChange={(e) => setForm({ ...form, scheduleDate: e.target.value })}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || form.targetRoles.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {sending ? 'Sending...' : form.sendNow ? 'Send Now' : 'Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Simple check circle for the target audience buttons
const CheckCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default Announcements;
