import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Filter } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../services/api';

const statusBadge = (status) => {
  const classes = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    transferred: 'bg-red-50 text-red-700 border-red-200',
    passed_out: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const labels = { active: 'Active', inactive: 'Inactive', transferred: 'Transferred', passed_out: 'Passed Out' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes[status] || classes.inactive}`}>
      {labels[status] || 'Inactive'}
    </span>
  );
};

const StudentList = () => {
  const { data: students, loading, error, refetch } = useFetch('/students');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getStudentName = (student) =>
    student.fullName || [student.firstName, student.lastName].filter(Boolean).join(' ');

  const getClassLabel = (student) =>
    typeof student.currentClass === 'object' && student.currentClass
      ? `${student.currentClass.name} - ${student.currentClass.section}`
      : student.currentClass || '';

  const classes = useMemo(() => {
    if (!students) return [];
    const cls = [...new Set(students.map((s) => getClassLabel(s)).filter(Boolean))];
    return cls.sort();
  }, [students]);

  const sections = useMemo(() => {
    if (!students) return [];
    const sec = [...new Set(students.map((s) => s.currentSection).filter(Boolean))];
    return sec.sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        getStudentName(s).toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = !filterClass || getClassLabel(s) === filterClass;
      const matchesSection = !filterSection || s.currentSection === filterSection;
      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, searchTerm, filterClass, filterSection]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/students/${deleteId}`);
      setDeleteId(null);
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    { key: 'admissionNo', label: 'Admission No', sortable: true },
    { key: 'fullName', label: 'Name', sortable: true, render: (_, row) => getStudentName(row) },
    { key: 'currentClass', label: 'Class', sortable: true, render: (_, row) => getClassLabel(row) },
    { key: 'currentSection', label: 'Section', sortable: true },
    { key: 'gender', label: 'Gender', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (val) => statusBadge(val),
    },
  ];

  const actions = (row) => (
    <>
      <Link
        to={`/students/${row._id}`}
        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        title="View"
      >
        <Eye size={16} />
      </Link>
      <Link
        to={`/students/${row._id}?edit=true`}
        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </Link>
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
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all students in the school</p>
        </div>
        <Link
          to="/students/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Student
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or admission no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>Section {s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredStudents}
        loading={loading}
        error={error}
        actions={actions}
        pageSize={10}
      />

      {/* Delete Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete this student? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StudentList;
