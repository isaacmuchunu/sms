import React, { useState } from 'react';
import { Save, Plus, Trash2, Pencil } from 'lucide-react';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));

const mockFeeHeads = [
  { _id: '1', name: 'Tuition Fee', description: 'Monthly tuition charges', frequency: 'Monthly' },
  { _id: '2', name: 'Admission Fee', description: 'One-time admission charges', frequency: 'One-time' },
  { _id: '3', name: 'Examination Fee', description: 'Term examination charges', frequency: 'Per Term' },
  { _id: '4', name: 'Library Fee', description: 'Library maintenance', frequency: 'Yearly' },
  { _id: '5', name: 'Sports Fee', description: 'Sports and activities', frequency: 'Yearly' },
  { _id: '6', name: 'Transport Fee', description: 'School bus charges', frequency: 'Monthly' },
  { _id: '7', name: 'Computer Lab Fee', description: 'Computer lab usage', frequency: 'Yearly' },
];

const FeeStructure = () => {
  const [selectedClass, setSelectedClass] = useState('1');
  const [feeHeads, setFeeHeads] = useState(mockFeeHeads);
  const [classFees, setClassFees] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAmountChange = (feeHeadId, amount) => {
    setClassFees((prev) => ({
      ...prev,
      [`${selectedClass}-${feeHeadId}`]: amount,
    }));
  };

  const getAmount = (feeHeadId) => {
    return classFees[`${selectedClass}-${feeHeadId}`] || '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/fees/structure', {
        class: selectedClass,
        fees: feeHeads.map((fh) => ({
          feeHeadId: fh._id,
          amount: Number(getAmount(fh._id)) || 0,
        })),
      });
      alert('Fee structure saved');
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fee Structure</h1>
        <p className="text-sm text-gray-500 mt-1">Configure fee heads and class-wise fee amounts</p>
      </div>

      {/* Fee Heads Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Fee Heads</h3>
          <button className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Add Fee Head
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Frequency</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeHeads.map((fh) => (
                <tr key={fh._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{fh.name}</td>
                  <td className="px-4 py-3 text-gray-600">{fh.description}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {fh.frequency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors mr-1"><Pencil size={14} /></button>
                    <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class-wise Fee Structure */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Class-wise Fee Structure</h3>
          <SelectField
            name="class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            options={CLASS_OPTIONS}
            className="w-40"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fee Head</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Frequency</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeHeads.map((fh) => (
                <tr key={fh._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{fh.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{fh.frequency}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={getAmount(fh._id)}
                      onChange={(e) => handleAmountChange(fh._id, e.target.value)}
                      placeholder="0"
                      className="w-32 ml-auto block px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Fee Structure'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeStructure;
