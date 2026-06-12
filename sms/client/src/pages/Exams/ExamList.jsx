import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Send, Calendar } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const typeBadge = (type) => {
  const classes = {
    'Unit Test': 'bg-blue-50 text-blue-700 border-blue-200',
    'Mid Term': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Final': 'bg-purple-50 text-purple-700 border-purple-200',
    'Quiz': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes[type] || classes['Unit Test']}`}>
      {type || 'Unit Test'}
    </span>
  );
};

const statusBadge = (status) => {
  const classes = {
    Upcoming: 'bg-blue-50 text-blue-700',
    Ongoing: 'bg-amber-50 text-amber-700',
    Completed: 'bg-emerald-50 text-emerald-700',
    Published: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status] || classes.Upcoming}`}>
      {status || 'Upcoming'}
    </span>
  );
};

const mockExams = [
  { _id: '1', name: 'Unit Test 1', type: 'Unit Test', class: '5', startDate: '2025-01-15', endDate: '2025-01-20', status: 'Published' },
  { _id: '2', name: 'Mid Term Exam', type: 'Mid Term', class: '8', startDate: '2025-02-10', endDate: '2025-02-25', status: 'Completed' },
  { _id: '3', name: 'Final Exam', type: 'Final', class: '10', startDate: '2025-03-15', endDate: '2025-03-30', status: 'Upcoming' },
  { _id: '4', name: 'Quiz Round 1', type: 'Quiz', class: '3', startDate: '2025-01-22', endDate: '2025-01-22', status: 'Ongoing' },
  { _id: '5', name: 'Unit Test 2', type: 'Unit Test', class: '7', startDate: '2025-02-05', endDate: '2025-02-10', status: 'Upcoming' },
  { _id: '6', name: 'Mid Term Exam', type: 'Mid Term', class: '12', startDate: '2025-02-15', endDate: '2025-03-01', status: 'Upcoming' },
];

const ExamList = () => {
  const { data: examsFromApi, loading, error, refetch } = useFetch('/exams');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [publishId, setPublishId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'Unit Test', class: '', startDate: '', endDate: '' });
  const [formLoading, setFormLoading] = useState(false);

  const exams = examsFromApi || mockExams;

  const filteredExams = useMemo(() => {
    if (!searchTerm) return exams;
    const lower = searchTerm.toLowerCase();
    return exams.filter((e) => e.name?.toLowerCase().includes(lower) || e.class?.includes(lower));
  }, [exams, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/exams', form);
      setShowForm(false);
      refetch();
    } catch {
      alert('Failed to create exam');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!publishId) return;
    try {
      await api.patch(`/exams/${publishId}/publish`);
      setPublishId(null);
      refetch();
    } catch {
      alert('Failed to publish exam');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', render: (val) => typeBadge(val) },
    { key: 'class', label: 'Class', sortable: true, render: (val) => `Class ${val}` },
    {
      key: 'startDate',
      label: 'Duration',
      render: (_, row) => (
        <span className="text-gray-600">
          {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (val) => statusBadge(val) },
  ];

  const actions = (row) => (
    <>
      <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View"><Eye size={16} /></button>
      <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit"><Pencil size={16} /></button>
      {row.status !== 'Published' && (
        <button
          onClick={() => setPublishId(row._id)}
          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Publish"
        >
          <Send size={16} />
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-sm text-gray-500 mt-1">Manage exam schedules and results</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Create Exam
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filteredExams} loading={loading} error={error} actions={actions} pageSize={8} />

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Exam" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Exam Name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Type"
              name="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={[
                { value: 'Unit Test', label: 'Unit Test' },
                { value: 'Mid Term', label: 'Mid Term' },
                { value: 'Final', label: 'Final' },
                { value: 'Quiz', label: 'Quiz' },
              ]}
            />
            <SelectField
              label="Class"
              name="class"
              value={form.class}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
              options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Class ${i + 1}` }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Start Date" name="startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            <InputField label="End Date" name="endDate" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={formLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
              {formLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Publish Modal */}
      <Modal isOpen={!!publishId} onClose={() => setPublishId(null)} title="Publish Exam Results" size="sm">
        <p className="text-sm text-gray-600 mb-4">This will publish the exam results to all students and parents. Continue?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setPublishId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handlePublish} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">Publish</button>
        </div>
      </Modal>
    </div>
  );
};

export default ExamList;
