import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  FloppyDisk,
  User,
  Student as StudentIcon,
  Users,
  MapPin,
  CaretRight,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'personal', label: 'Personal info', icon: User },
  { id: 'academic', label: 'Academic info', icon: StudentIcon },
  { id: 'guardian', label: 'Guardian info', icon: Users },
  { id: 'address', label: 'Address', icon: MapPin },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => ({
  value: b,
  label: b,
}));

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'day', label: 'Day' },
  { value: 'other', label: 'Other' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const emptyForm = {
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  bloodGroup: '',
  religion: '',
  category: '',
  aadharNumber: '',
  admissionNo: '',
  rollNo: '',
  class: '',
  section: '',
  academicYear: '',
  previousSchool: '',
  previousClassPercentage: '',
  fatherName: '',
  fatherPhone: '',
  fatherOccupation: '',
  motherName: '',
  motherPhone: '',
  motherOccupation: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const StudentForm = ({ mode: modeProp, studentId: studentIdProp, initialData, onSuccess }) => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const isEdit = modeProp === 'edit' || !!routeId;
  const studentId = studentIdProp || routeId;

  const { data: classesResponse, loading: classesLoading } = useFetch('/classes');
  const { data: studentResponse, loading: studentLoading } = useFetch(
    isEdit && studentId ? `/students/${studentId}` : null
  );

  const classes = useMemo(() => {
    if (!classesResponse) return [];
    return Array.isArray(classesResponse)
      ? classesResponse
      : classesResponse.items || [];
  }, [classesResponse]);

  const student = useMemo(() => {
    if (initialData) return initialData;
    if (!studentResponse) return null;
    return studentResponse.student || studentResponse;
  }, [initialData, studentResponse]);

  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!student) return;
    const clsId = typeof student.class === 'object' ? student.class?._id : student.class;
    const secId = typeof student.section === 'object' ? student.section?._id : student.section;
    const ayId =
      typeof student.academicYear === 'object'
        ? student.academicYear?._id
        : student.academicYear || '';

    setForm({
      ...emptyForm,
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
      gender: student.gender || '',
      bloodGroup: student.bloodGroup || '',
      religion: student.religion || '',
      category: student.category || '',
      aadharNumber: student.aadharNumber || '',
      admissionNo: student.admissionNo || '',
      rollNo: student.rollNo || '',
      class: clsId || '',
      section: secId || '',
      academicYear: ayId,
      previousSchool: student.previousSchool || '',
      previousClassPercentage: student.previousClassPercentage ?? '',
      fatherName: student.fatherName || '',
      fatherPhone: student.fatherPhone || '',
      fatherOccupation: student.fatherOccupation || '',
      motherName: student.motherName || '',
      motherPhone: student.motherPhone || '',
      motherOccupation: student.motherOccupation || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianRelation: student.guardianRelation || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pincode: student.pincode || '',
    });
  }, [student]);

  const selectedClass = useMemo(
    () => classes.find((c) => c._id === form.class),
    [classes, form.class]
  );

  const classOptions = useMemo(
    () =>
      classes
        .filter((c) => c.status !== 'inactive')
        .map((c) => ({ value: c._id, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [classes]
  );

  const sectionOptions = useMemo(() => {
    if (!selectedClass || !Array.isArray(selectedClass.sections)) return [];
    return selectedClass.sections
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({ value: s._id, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass?.academicYear) {
      const ayId =
        typeof selectedClass.academicYear === 'object'
          ? selectedClass.academicYear?._id
          : selectedClass.academicYear;
      setForm((prev) => ({ ...prev, academicYear: ayId || '' }));
    }
  }, [selectedClass]);

  useEffect(() => {
    if (form.class && !sectionOptions.find((s) => s.value === form.section)) {
      setForm((prev) => ({ ...prev, section: '' }));
    }
  }, [sectionOptions, form.class]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!form.dob) nextErrors.dob = 'Date of birth is required';
    if (!form.gender) nextErrors.gender = 'Gender is required';
    if (!form.admissionNo.trim()) nextErrors.admissionNo = 'Admission number is required';
    if (!form.class) nextErrors.class = 'Class is required';
    if (!form.section) nextErrors.section = 'Section is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        religion: form.religion.trim(),
        category: form.category || 'general',
        aadharNumber: form.aadharNumber.trim(),
        admissionNo: form.admissionNo.trim(),
        rollNo: form.rollNo.trim(),
        class: form.class,
        section: form.section,
        academicYear: form.academicYear,
        previousSchool: form.previousSchool.trim(),
        previousClassPercentage: form.previousClassPercentage
          ? Number(form.previousClassPercentage)
          : undefined,
        fatherName: form.fatherName.trim(),
        fatherPhone: form.fatherPhone.trim(),
        fatherOccupation: form.fatherOccupation.trim(),
        motherName: form.motherName.trim(),
        motherPhone: form.motherPhone.trim(),
        motherOccupation: form.motherOccupation.trim(),
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        guardianRelation: form.guardianRelation.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      };

      if (isEdit && studentId) {
        await api.put(`/students/${studentId}`, payload);
        toast.success('Student updated successfully');
      } else if (isTeacher) {
        await api.post('/students/provisional', payload);
        toast.success('Provisional registration submitted for admin approval');
      } else {
        await api.post('/students', payload);
        toast.success('Student created successfully');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/students');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save student';
      toast.error(message);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setSaving(false);
    }
  };

  const isLoading = classesLoading || (isEdit && studentLoading);
  const title = isEdit
    ? 'Edit student'
    : isTeacher
    ? 'Register provisional student'
    : 'Add student';
  const subtitle = isEdit
    ? 'Update student details'
    : isTeacher
    ? 'Submit a new student for admin approval'
    : 'Register a new student';

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  const renderTabError = () => {
    const hasErrors = Object.keys(errors).length > 0;
    if (!hasErrors) return null;
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
        Please fill in all required fields.
      </div>
    );
  };

  const renderPersonalTab = () => (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Input
        label="First name"
        name="firstName"
        value={form.firstName}
        onChange={handleChange}
        error={errors.firstName}
        required
      />
      <Input
        label="Last name"
        name="lastName"
        value={form.lastName}
        onChange={handleChange}
        error={errors.lastName}
        required
      />
      <Input
        label="Date of birth"
        name="dob"
        type="date"
        value={form.dob}
        onChange={handleChange}
        error={errors.dob}
        required
      />
      <Select
        label="Gender"
        name="gender"
        value={form.gender}
        onChange={handleChange}
        options={GENDER_OPTIONS}
        error={errors.gender}
        required
      />
      <Select
        label="Blood group"
        name="bloodGroup"
        value={form.bloodGroup}
        onChange={handleChange}
        options={BLOOD_GROUP_OPTIONS}
      />
      <Input label="Religion" name="religion" value={form.religion} onChange={handleChange} />
      <Select
        label="Category"
        name="category"
        value={form.category}
        onChange={handleChange}
        options={CATEGORY_OPTIONS}
      />
      <Input
        label="National ID"
        name="aadharNumber"
        value={form.aadharNumber}
        onChange={handleChange}
        placeholder="XXXXXX"
      />
    </div>
  );

  const renderAcademicTab = () => (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Input
        label="Admission number"
        name="admissionNo"
        value={form.admissionNo}
        onChange={handleChange}
        error={errors.admissionNo}
        required
      />
      <Input
        label="Roll number"
        name="rollNo"
        value={form.rollNo}
        onChange={handleChange}
        helper="Auto-generated if left blank"
      />
      <Select
        label="Class"
        name="class"
        value={form.class}
        onChange={handleChange}
        options={classOptions}
        placeholder="Select class"
        error={errors.class}
        required
        disabled={classesLoading}
      />
      <Select
        label="Section"
        name="section"
        value={form.section}
        onChange={handleChange}
        options={sectionOptions}
        placeholder={form.class ? 'Select section' : 'Select a class first'}
        error={errors.section}
        required
        disabled={!form.class}
      />
      <Input
        label="Previous school"
        name="previousSchool"
        value={form.previousSchool}
        onChange={handleChange}
      />
      <Input
        label="Previous class percentage"
        name="previousClassPercentage"
        type="number"
        min={0}
        max={100}
        value={form.previousClassPercentage}
        onChange={handleChange}
        placeholder="0-100"
      />
      <input type="hidden" name="academicYear" value={form.academicYear} />
    </div>
  );

  const renderGuardianTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Input
          label="Father's name"
          name="fatherName"
          value={form.fatherName}
          onChange={handleChange}
        />
        <Input
          label="Father's phone"
          name="fatherPhone"
          type="tel"
          value={form.fatherPhone}
          onChange={handleChange}
        />
        <Input
          label="Father's occupation"
          name="fatherOccupation"
          value={form.fatherOccupation}
          onChange={handleChange}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Input
          label="Mother's name"
          name="motherName"
          value={form.motherName}
          onChange={handleChange}
        />
        <Input
          label="Mother's phone"
          name="motherPhone"
          type="tel"
          value={form.motherPhone}
          onChange={handleChange}
        />
        <Input
          label="Mother's occupation"
          name="motherOccupation"
          value={form.motherOccupation}
          onChange={handleChange}
        />
      </div>
      <div className="border-t border-zinc-100 pt-5">
        <h4 className="mb-4 text-sm font-medium text-zinc-700">Local guardian (if different)</h4>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Input
            label="Guardian's name"
            name="guardianName"
            value={form.guardianName}
            onChange={handleChange}
          />
          <Input
            label="Guardian's phone"
            name="guardianPhone"
            type="tel"
            value={form.guardianPhone}
            onChange={handleChange}
          />
          <Input
            label="Relation"
            name="guardianRelation"
            value={form.guardianRelation}
            onChange={handleChange}
            placeholder="e.g. Uncle"
          />
        </div>
      </div>
    </div>
  );

  const renderAddressTab = () => (
    <div className="space-y-5">
      <Input
        label="Address"
        name="address"
        value={form.address}
        onChange={handleChange}
        placeholder="Street address"
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Input label="Town / City" name="city" value={form.city} onChange={handleChange} />
        <Input label="County" name="state" value={form.state} onChange={handleChange} />
        <Input label="Postal code" name="pincode" value={form.pincode} onChange={handleChange} />
      </div>
    </div>
  );

  const tabContent = {
    personal: renderPersonalTab,
    academic: renderAcademicTab,
    guardian: renderGuardianTab,
    address: renderAddressTab,
  };

  const backPath = isEdit && studentId ? `/students/${studentId}` : '/students';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card className="p-5">
          <Skeleton className="mb-6 h-10 w-full" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" {...itemProps}>
        <div className="flex items-center gap-3">
          <Button as={Link} to={backPath} variant="ghost" size="icon" aria-label="Go back">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <Button onClick={handleSubmit} isLoading={saving}>
          <FloppyDisk size={18} weight="bold" />
          {saving ? 'Saving...' : 'Save student'}
        </Button>
      </motion.div>

      <motion.div {...itemProps}>
        <Card>
          {renderTabError()}
          <div className="flex border-b border-zinc-100 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-accent-600 text-accent-700'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} id="student-form">
              {tabContent[activeTab]()}
            </form>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const idx = TABS.findIndex((t) => t.id === activeTab);
                if (idx > 0) setActiveTab(TABS[idx - 1].id);
              }}
              disabled={activeTab === TABS[0].id}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const idx = TABS.findIndex((t) => t.id === activeTab);
                if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
              }}
              disabled={activeTab === TABS[TABS.length - 1].id}
              className="gap-1"
            >
              Next
              <CaretRight size={16} />
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default StudentForm;
