import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FloppyDisk,
  ArrowLeft,
  User,
  Briefcase,
  CurrencyInr,
  Check,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card, { CardContent } from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';

const TABS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'salary', label: 'Salary', icon: CurrencyInr },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'resigned', label: 'Resigned' },
];

const EMPLOYMENT_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];

const DEPARTMENT_OPTIONS = [
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

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  gender: '',
  dob: '',
  employeeId: '',
  department: '',
  designation: '',
  joiningDate: '',
  status: 'active',
  employmentType: 'full_time',
  qualification: '',
  specialization: '',
  subjects: [],
  classTeacherClass: '',
  classTeacherSection: '',
  salary: '',
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const TeacherForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState('personal');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: teacherData, loading: teacherLoading } = useFetch(
    isEditing ? `/teachers/${id}` : null,
    { immediate: isEditing }
  );
  const teacher = teacherData?.teacher || teacherData;

  const { data: subjects = [], loading: subjectsLoading } = useFetch('/subjects');
  const { data: classes = [], loading: classesLoading } = useFetch('/classes');

  const sections = useMemo(() => {
    if (!form.classTeacherClass) return [];
    const cls = (classes || []).find((c) => c._id === form.classTeacherClass);
    return cls?.sections || [];
  }, [form.classTeacherClass, classes]);

  useEffect(() => {
    if (!teacher) return;
    setForm({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      address: teacher.address || '',
      gender: teacher.gender || '',
      dob: formatDate(teacher.dob),
      employeeId: teacher.employeeId || '',
      department: teacher.department || '',
      designation: teacher.designation || '',
      joiningDate: formatDate(teacher.joiningDate),
      status: teacher.status || 'active',
      employmentType: teacher.employmentType || 'full_time',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      subjects: Array.isArray(teacher.subjects)
        ? teacher.subjects.map((s) => (typeof s === 'object' ? s._id : s))
        : [],
      classTeacherClass: teacher.classTeacher?.class?._id || teacher.classTeacher?.class || '',
      classTeacherSection: teacher.classTeacher?.section || '',
      salary: teacher.salary ?? '',
    });
  }, [teacher]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      classTeacherClass: value,
      classTeacherSection: '',
    }));
  };

  const toggleSubject = (subjectId) => {
    setForm((prev) => {
      const next = prev.subjects.includes(subjectId)
        ? prev.subjects.filter((s) => s !== subjectId)
        : [...prev.subjects, subjectId];
      return { ...prev, subjects: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      gender: form.gender,
      dob: form.dob,
      employeeId: form.employeeId.trim(),
      department: form.department,
      designation: form.designation,
      joiningDate: form.joiningDate,
      status: form.status,
      employmentType: form.employmentType,
      qualification: form.qualification.trim(),
      specialization: form.specialization.trim(),
      subjects: form.subjects,
      salary: form.salary === '' ? 0 : Number(form.salary),
    };

    if (form.classTeacherClass && form.classTeacherSection) {
      payload.classTeacher = {
        class: form.classTeacherClass,
        section: form.classTeacherSection,
      };
    } else {
      payload.classTeacher = { class: null, section: null };
    }

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    const validationErrors = [];

    if (!payload.firstName) validationErrors.push('First name is required');
    else if (payload.firstName.length > 100) validationErrors.push('First name must be 100 characters or less');

    if (!payload.lastName) validationErrors.push('Last name is required');
    else if (payload.lastName.length > 100) validationErrors.push('Last name must be 100 characters or less');

    if (!payload.email) validationErrors.push('Email is required');
    else if (!emailRegex.test(payload.email)) validationErrors.push('Please enter a valid email address');

    if (payload.phone && !phoneRegex.test(payload.phone)) {
      validationErrors.push('Phone number contains invalid characters');
    }

    if (!payload.gender) validationErrors.push('Gender is required');
    if (!payload.employmentType) validationErrors.push('Employment type is required');
    if (!payload.designation) validationErrors.push('Designation is required');

    if (!payload.dob) validationErrors.push('Date of birth is required');
    if (!payload.joiningDate) validationErrors.push('Joining date is required');

    const dobDate = payload.dob ? new Date(payload.dob) : null;
    const joiningDate = payload.joiningDate ? new Date(payload.joiningDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dobDate && joiningDate && dobDate >= joiningDate) {
      validationErrors.push('Date of birth must be before joining date');
    }

    if (joiningDate) {
      const joiningDay = new Date(joiningDate);
      joiningDay.setHours(0, 0, 0, 0);
      if (joiningDay > today) validationErrors.push('Joining date cannot be in the future');
    }

    if (validationErrors.length > 0) {
      setFormError(validationErrors.join('. '));
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/teachers/${id}`, payload);
        toast.success('Teacher updated successfully');
      } else {
        await api.post('/teachers', payload);
        toast.success('Teacher created successfully');
      }
      navigate('/teachers');
    } catch (err) {
      const message = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} teacher`;
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const renderPersonal = () => (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Input
        label="First name"
        name="firstName"
        value={form.firstName}
        onChange={handleChange}
        placeholder="e.g. Rajesh"
        required
      />
      <Input
        label="Last name"
        name="lastName"
        value={form.lastName}
        onChange={handleChange}
        placeholder="e.g. Sharma"
        required
      />
      <Select
        label="Gender"
        name="gender"
        value={form.gender}
        onChange={handleChange}
        options={GENDER_OPTIONS}
        placeholder="Select gender"
        required
      />
      <Input
        label="Date of birth"
        name="dob"
        type="date"
        value={form.dob}
        onChange={handleChange}
        required
      />
      <Input
        label="Email"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        placeholder="rajesh.sharma@school.edu.in"
        required
      />
      <Input
        label="Phone"
        name="phone"
        type="tel"
        value={form.phone}
        onChange={handleChange}
        placeholder="10-digit mobile number"
        required
      />
      <div className="md:col-span-2">
        <Input
          label="Address"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Street, town, county, postal code"
        />
      </div>
    </div>
  );

  const renderProfessional = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Input
          label="Employee ID"
          name="employeeId"
          value={form.employeeId}
          onChange={handleChange}
          placeholder="Leave blank to auto-generate"
          helper={isEditing ? undefined : 'Format: EMP-YYYY-XXXXX'}
        />
        <Select
          label="Department"
          name="department"
          value={form.department}
          onChange={handleChange}
          options={DEPARTMENT_OPTIONS}
          placeholder="Select department"
          required
        />
        <Select
          label="Designation"
          name="designation"
          value={form.designation}
          onChange={handleChange}
          options={DESIGNATION_OPTIONS}
          placeholder="Select designation"
          required
        />
        <Input
          label="Joining date"
          name="joiningDate"
          type="date"
          value={form.joiningDate}
          onChange={handleChange}
          required
        />
        <Select
          label="Status"
          name="status"
          value={form.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
          required
        />
        <Select
          label="Employment type"
          name="employmentType"
          value={form.employmentType}
          onChange={handleChange}
          options={EMPLOYMENT_OPTIONS}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Input
          label="Qualification"
          name="qualification"
          value={form.qualification}
          onChange={handleChange}
          placeholder="e.g. M.Sc., B.Ed."
        />
        <Input
          label="Specialization"
          name="specialization"
          value={form.specialization}
          onChange={handleChange}
          placeholder="e.g. Organic Chemistry"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">Subjects assigned</label>
        {subjectsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (subjects || []).length === 0 ? (
          <p className="text-sm text-zinc-500">No subjects available. Add subjects first.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(subjects || []).map((subject) => {
              const checked = form.subjects.includes(subject._id);
              return (
                <label
                  key={subject._id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    checked
                      ? 'border-accent-300 bg-accent-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      checked ? 'border-accent-600 bg-accent-600' : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {checked && <Check size={10} weight="bold" className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleSubject(subject._id)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{subject.name}</p>
                    <p className="text-xs text-zinc-500">{subject.code}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Select
          label="Class teacher of"
          name="classTeacherClass"
          value={form.classTeacherClass}
          onChange={handleClassChange}
          options={(classes || []).map((c) => ({ value: c._id, label: c.name }))}
          placeholder="Select class"
        />
        <Select
          label="Section"
          name="classTeacherSection"
          value={form.classTeacherSection}
          onChange={handleChange}
          options={sections.map((s) => ({ value: s._id, label: s.name }))}
          placeholder={form.classTeacherClass ? 'Select section' : 'Select class first'}
          disabled={!form.classTeacherClass}
        />
      </div>
    </div>
  );

  const renderSalary = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Salary"
          name="salary"
          type="number"
          min="0"
          value={form.salary}
          onChange={handleChange}
          placeholder="Annual gross salary in KES"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Annual salary</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">
          KSh{Number(form.salary || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Stored as a single annual component</p>
      </div>
    </div>
  );

  const tabContent = {
    personal: renderPersonal,
    professional: renderProfessional,
    salary: renderSalary,
  };

  if (isEditing && teacherLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/teachers')} aria-label="Back">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {isEditing ? 'Edit teacher' : 'Add teacher'}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {isEditing ? 'Update staff profile and assignments' : 'Register a new teaching staff member'}
            </p>
          </div>
        </div>
        <Button type="submit" form="teacher-form" isLoading={saving} disabled={saving}>
          <FloppyDisk size={18} weight="bold" />
          {saving ? 'Saving...' : isEditing ? 'Update teacher' : 'Save teacher'}
        </Button>
      </div>

      {formError && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          {formError}
        </div>
      )}

      <Card>
        <div className="flex border-b border-zinc-100 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-accent-600 text-accent-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Icon size={18} weight={isActive ? 'bold' : 'regular'} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <CardContent>
          <form id="teacher-form" onSubmit={handleSubmit} className="space-y-6">
            {tabContent[activeTab]()}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeacherForm;
