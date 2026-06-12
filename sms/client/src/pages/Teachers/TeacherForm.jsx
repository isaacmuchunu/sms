import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User, Briefcase, IndianRupee, Plus, X } from 'lucide-react';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'professional', label: 'Professional Info', icon: Briefcase },
  { id: 'salary', label: 'Salary', icon: IndianRupee },
];

const DEPT_OPTIONS = [
  { value: 'Science', label: 'Science' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Social Science', label: 'Social Science' },
  { value: 'Computer', label: 'Computer' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Physical Education', label: 'Physical Education' },
];

const DESIGNATION_OPTIONS = [
  { value: 'Principal', label: 'Principal' },
  { value: 'Vice Principal', label: 'Vice Principal' },
  { value: 'Head of Department', label: 'Head of Department' },
  { value: 'Senior Teacher', label: 'Senior Teacher' },
  { value: 'Teacher', label: 'Teacher' },
  { value: 'Assistant Teacher', label: 'Assistant Teacher' },
  { value: 'Librarian', label: 'Librarian' },
  { value: 'Lab Assistant', label: 'Lab Assistant' },
];

const TeacherForm = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    employeeId: '',
    department: '',
    designation: '',
    joiningDate: '',
    qualifications: [''],
    subjects: [],
    assignedClasses: [],
    baseSalary: '',
    da: '',
    hra: '',
    ta: '',
  });

  const totalSalary =
    (Number(form.baseSalary) || 0) +
    (Number(form.da) || 0) +
    (Number(form.hra) || 0) +
    (Number(form.ta) || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQualificationChange = (idx, value) => {
    setForm((prev) => {
      const q = [...prev.qualifications];
      q[idx] = value;
      return { ...prev, qualifications: q };
    });
  };

  const addQualification = () => {
    setForm((prev) => ({ ...prev, qualifications: [...prev.qualifications, ''] }));
  };

  const removeQualification = (idx) => {
    setForm((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== idx),
    }));
  };

  const handleMultiSelect = (e) => {
    const { name, options } = e.target;
    const values = Array.from(options)
      .filter((o) => o.selected)
      .map((o) => o.value);
    setForm((prev) => ({ ...prev, [name]: values }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        qualifications: form.qualifications.filter((q) => q.trim()),
      };
      await api.post('/teachers', payload);
      navigate('/teachers');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create teacher');
    } finally {
      setSaving(false);
    }
  };

  const renderPersonal = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <InputField label="Full Name" name="name" value={form.name} onChange={handleChange} required />
      <InputField label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
      <InputField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required />
      <InputField label="Address" name="address" value={form.address} onChange={handleChange} />
    </div>
  );

  const renderProfessional = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InputField label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange} required />
        <SelectField label="Department" name="department" value={form.department} onChange={handleChange} options={DEPT_OPTIONS} required />
        <SelectField label="Designation" name="designation" value={form.designation} onChange={handleChange} options={DESIGNATION_OPTIONS} required />
        <InputField label="Joining Date" name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
        <div className="space-y-2">
          {form.qualifications.map((q, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={q}
                onChange={(e) => handleQualificationChange(idx, e.target.value)}
                placeholder={`Qualification ${idx + 1}`}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {form.qualifications.length > 1 && (
                <button
                  onClick={() => removeQualification(idx)}
                  className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addQualification}
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={16} />
            Add Qualification
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SelectField
          label="Subjects (Multi-select)"
          name="subjects"
          value={form.subjects}
          onChange={handleMultiSelect}
          options={DEPT_OPTIONS}
          multiple
        />
        <SelectField
          label="Assigned Classes (Multi-select)"
          name="assignedClasses"
          value={form.assignedClasses}
          onChange={handleMultiSelect}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Class ${i + 1}` }))}
          multiple
        />
      </div>
    </div>
  );

  const renderSalary = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <InputField label="Basic Salary" name="baseSalary" type="number" value={form.baseSalary} onChange={handleChange} placeholder="0" />
        <InputField label="DA" name="da" type="number" value={form.da} onChange={handleChange} placeholder="0" />
        <InputField label="HRA" name="hra" type="number" value={form.hra} onChange={handleChange} placeholder="0" />
        <InputField label="TA" name="ta" type="number" value={form.ta} onChange={handleChange} placeholder="0" />
      </div>

      <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-200">
        <p className="text-sm text-indigo-600 font-medium mb-1">Total Salary</p>
        <p className="text-3xl font-bold text-indigo-800">Rs. {totalSalary.toLocaleString()}</p>
        <p className="text-xs text-indigo-500 mt-1">Auto-calculated from components</p>
      </div>
    </div>
  );

  const tabContent = { personal: renderPersonal, professional: renderProfessional, salary: renderSalary };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teachers')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Teacher</h1>
            <p className="text-sm text-gray-500 mt-1">Register a new teacher</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Teacher'}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

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
        <div className="p-6">{tabContent[activeTab]()}</div>
      </div>
    </div>
  );
};

export default TeacherForm;
