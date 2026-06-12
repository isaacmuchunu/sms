import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Filter } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';

const statusBadge = (status) => {
  const classes = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    OnLeave: 'bg-amber-50 text-amber-700 border-amber-200',
    Retired: 'bg-gray-100 text-gray-600 border-gray-200',
    Suspended: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes[status] || classes.Active}`}>
      {status || 'Active'}
    </span>
  );
};

const TeacherList = () => {
  const { data: teachers, loading, error } = useFetch('/teachers');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const departments = useMemo(() => {
    if (!teachers) return [];
    return [...new Set(teachers.map((t) => t.department).filter(Boolean))].sort();
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = !filterDept || t.department === filterDept;
      return matchesSearch && matchesDept;
    });
  }, [teachers, searchTerm, filterDept]);

  const columns = [
    { key: 'employeeId', label: 'Employee ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'designation', label: 'Designation', sortable: true },
    {
      key: 'subjects',
      label: 'Subjects',
      render: (val) =>
        Array.isArray(val) ? (
          <div className="flex flex-wrap gap-1">
            {val.slice(0, 2).map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{s}</span>
            ))}
            {val.length > 2 && <span className="text-xs text-gray-400">+{val.length - 2}</span>}
          </div>
        ) : val || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => statusBadge(val),
    },
  ];

  const actions = (row) => (
    <>
      <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
        <Eye size={16} />
      </button>
      <Link
        to={`/teachers/${row._id}?edit=true`}
        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </Link>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all teaching staff</p>
        </div>
        <Link
          to="/teachers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Teacher
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredTeachers} loading={loading} error={error} actions={actions} pageSize={10} />
    </div>
  );
};

export default TeacherList;
