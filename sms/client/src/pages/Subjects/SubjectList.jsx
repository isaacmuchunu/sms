import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const typeBadge = (type) => {
  const classes = {
    Core: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Elective: 'bg-purple-50 text-purple-700 border-purple-200',
    'Co-curricular': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes[type] || classes.Core}`}>
      {type || 'Core'}
    </span>
  );
};

const statusBadge = (status) => {
  const classes = {
    Active: 'bg-emerald-50 text-emerald-700',
    Inactive: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status] || classes.Inactive}`}>
      {status || 'Inactive'}
    </span>
  );
};

const SubjectList = () => {
  const { data: subjects, loading, error, refetch } = useFetch('/subjects');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'Core',
    credits: '',
    maxMarks: '100',
    status: 'Active',
  });

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    if (!searchTerm) return subjects;
    const lower = searchTerm.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name?.toLowerCase().includes(lower) ||
        s.code?.toLowerCase().includes(lower)
    );
  }, [subjects, searchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingSubject(null);
    setForm({ code: '', name: '', type: 'Core', credits: '', maxMarks: '100', status: 'Active' });
    setShowForm(true);
  };

  const openEdit = (subject) => {
    setEditingSubject(subject);
    setForm({
      code: subject.code || '',
      name: subject.name || '',
      type: subject.type || 'Core',
      credits: subject.credits || '',
      maxMarks: subject.maxMarks || '100',
      status: subject.status || 'Active',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, form);
      } else {
        await api.post('/subjects', form);
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/subjects/${deleteId}`);
      setDeleteId(null);
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  const columns = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    {
      key: 'type',
      label: 'Type',
      render: (val) => typeBadge(val),
    },
    { key: 'credits', label: 'Credits', sortable: true },
    { key: 'maxMarks', label: 'Max Marks', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (val) => statusBadge(val),
    },
  ];

  const actions = (row) => (
    <>
      <button
        onClick={() => openEdit(row)}
        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => setDeleteId(row._id)}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all subjects in the curriculum</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Subject
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredSubjects} loading={loading} error={error} actions={actions} pageSize={10} />

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingSubject ? 'Edit Subject' : 'Add Subject'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Subject Code" name="code" value={form.code} onChange={handleChange} required />
            <InputField label="Subject Name" name="name" value={form.name} onChange={handleChange} required />
            <SelectField
              label="Type"
              name="type"
              value={form.type}
              onChange={handleChange}
              options={[
                { value: 'Core', label: 'Core' },
                { value: 'Elective', label: 'Elective' },
                { value: 'Co-curricular', label: 'Co-curricular' },
              ]}
            />
            <InputField label="Credits" name="credits" type="number" value={form.credits} onChange={handleChange} />
            <InputField label="Max Marks" name="maxMarks" type="number" value={form.maxMarks} onChange={handleChange} />
            <SelectField
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
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
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete" size="sm">
        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this subject?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SubjectList;
