import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User, School, Users, MapPin } from 'lucide-react';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'academic', label: 'Academic Info', icon: School },
  { id: 'guardian', label: 'Guardian Info', icon: Users },
  { id: 'address', label: 'Address', icon: MapPin },
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATEGORY_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'OBC', label: 'OBC' },
  { value: 'SC', label: 'SC' },
  { value: 'ST', label: 'ST' },
  { value: 'EWS', label: 'EWS' },
];

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));

const SECTION_OPTIONS = ['A', 'B', 'C', 'D'].map((s) => ({
  value: s,
  label: `Section ${s}`,
}));

const StudentForm = () => {
  const navigate = useNavigate();
  const { data: classes = [] } = useFetch('/classes');
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    religion: '',
    category: '',
    aadhaarNo: '',
    photo: '',
    admissionNo: '',
    rollNo: '',
    academicYear: '',
    currentClass: '',
    currentSection: '',
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
  });

  const classOptions = useMemo(() => {
    if (!Array.isArray(classes) || classes.length === 0) {
      return CLASS_OPTIONS;
    }

    return classes.map((cls) => ({
      value: cls._id,
      label: `${cls.name} - Section ${cls.section}`,
    }));
  }, [classes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const payload = {
        ...form,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
      };
      await api.post('/students', payload);
      navigate('/students');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  const renderPersonalTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <InputField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} required />
      <InputField label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} required />
      <InputField label="Date of Birth" name="dob" type="date" value={form.dob} onChange={handleChange} required />
      <SelectField label="Gender" name="gender" value={form.gender} onChange={handleChange} options={GENDER_OPTIONS} required />
      <SelectField
        label="Blood Group"
        name="bloodGroup"
        value={form.bloodGroup}
        onChange={handleChange}
        options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))}
      />
      <InputField label="Religion" name="religion" value={form.religion} onChange={handleChange} />
      <SelectField label="Category" name="category" value={form.category} onChange={handleChange} options={CATEGORY_OPTIONS} />
      <InputField label="Aadhaar Number" name="aadhaarNo" value={form.aadhaarNo} onChange={handleChange} placeholder="XXXX-XXXX-XXXX" />
    </div>
  );

  const renderAcademicTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <InputField label="Admission Number" name="admissionNo" value={form.admissionNo} onChange={handleChange} required />
      <InputField label="Roll Number" name="rollNo" value={form.rollNo} onChange={handleChange} />
      <InputField label="Academic Year" name="academicYear" value={form.academicYear} onChange={handleChange} placeholder="2024-2025" required />
      <SelectField label="Current Class" name="currentClass" value={form.currentClass} onChange={handleChange} options={classOptions} required />
      <SelectField label="Current Section" name="currentSection" value={form.currentSection} onChange={handleChange} options={SECTION_OPTIONS} required />
      <InputField label="Previous School" name="previousSchool" value={form.previousSchool} onChange={handleChange} />
      <InputField label="Previous Class %" name="previousClassPercentage" type="number" value={form.previousClassPercentage} onChange={handleChange} placeholder="0-100" />
    </div>
  );

  const renderGuardianTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <InputField label="Father's Name" name="fatherName" value={form.fatherName} onChange={handleChange} />
        <InputField label="Father's Phone" name="fatherPhone" type="tel" value={form.fatherPhone} onChange={handleChange} />
        <InputField label="Father's Occupation" name="fatherOccupation" value={form.fatherOccupation} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <InputField label="Mother's Name" name="motherName" value={form.motherName} onChange={handleChange} />
        <InputField label="Mother's Phone" name="motherPhone" type="tel" value={form.motherPhone} onChange={handleChange} />
        <InputField label="Mother's Occupation" name="motherOccupation" value={form.motherOccupation} onChange={handleChange} />
      </div>
      <div className="border-t border-gray-200 pt-5">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Local Guardian (if different)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <InputField label="Guardian's Name" name="guardianName" value={form.guardianName} onChange={handleChange} />
          <InputField label="Guardian's Phone" name="guardianPhone" type="tel" value={form.guardianPhone} onChange={handleChange} />
          <InputField label="Relation" name="guardianRelation" value={form.guardianRelation} onChange={handleChange} placeholder="e.g. Uncle" />
        </div>
      </div>
    </div>
  );

  const renderAddressTab = () => (
    <div className="space-y-5">
      <InputField label="Address" name="address" value={form.address} onChange={handleChange} placeholder="Street address" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <InputField label="City" name="city" value={form.city} onChange={handleChange} />
        <InputField label="State" name="state" value={form.state} onChange={handleChange} />
        <InputField label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />
      </div>
    </div>
  );

  const tabContent = {
    personal: renderPersonalTab,
    academic: renderAcademicTab,
    guardian: renderGuardianTab,
    address: renderAddressTab,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/students')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Student</h1>
            <p className="text-sm text-gray-500 mt-1">Register a new student</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Student'}
        </button>
      </div>

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {formError}
        </div>
      )}

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

        <div className="p-6">
          {tabContent[activeTab]()}
        </div>
      </div>
    </div>
  );
};

export default StudentForm;
