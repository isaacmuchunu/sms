import React, { useState } from 'react';
import { Plus, Bus, MapPin, Users, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../../components/Modal';
import InputField from '../../components/Form/InputField';
import api from '../../services/api';

const mockRoutes = [
  {
    _id: '1', name: 'Route 1 - City Center', code: 'R001', vehicleRegNo: 'DL-01-AB-1234',
    driver: 'Ram Prasad', stopsCount: 8, studentCount: 35, fee: 2500,
    stops: ['School Gate', 'MG Road', 'City Center', 'Railway Station', 'Bus Stand', 'Market Area', 'Housing Board', 'Green Valley']
  },
  {
    _id: '2', name: 'Route 2 - North Zone', code: 'R002', vehicleRegNo: 'DL-01-CD-5678',
    driver: 'Shyam Kumar', stopsCount: 6, studentCount: 28, fee: 2200,
    stops: ['School Gate', 'Civil Lines', 'University Road', 'Medical College', 'Defence Colony', 'North Extension']
  },
  {
    _id: '3', name: 'Route 3 - East Zone', code: 'R003', vehicleRegNo: 'DL-01-EF-9012',
    driver: 'Mohan Singh', stopsCount: 7, studentCount: 42, fee: 2800,
    stops: ['School Gate', 'Industrial Area', 'IT Park', 'Shopping Mall', 'Residential Complex', 'Lake View', 'East End']
  },
  {
    _id: '4', name: 'Route 4 - South Zone', code: 'R004', vehicleRegNo: 'DL-01-GH-3456',
    driver: 'Suresh Yadav', stopsCount: 9, studentCount: 30, fee: 3000,
    stops: ['School Gate', 'Old City', 'Temple Road', 'Flower Market', 'Sports Stadium', 'Garden Area', 'South Point', 'Hill View', 'Valley Road']
  },
  {
    _id: '5', name: 'Route 5 - West Zone', code: 'R005', vehicleRegNo: 'DL-01-IJ-7890',
    driver: 'Prakash Verma', stopsCount: 5, studentCount: 22, fee: 2000,
    stops: ['School Gate', 'Metro Station', 'Tech Hub', 'Business Park', 'West Gate']
  },
];

const RouteList = () => {
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', vehicleRegNo: '', driver: '', fee: '' });
  const [saving, setSaving] = useState(false);

  const toggleExpand = (id) => {
    setExpandedRoute((prev) => (prev === id ? null : id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/transport/routes', form);
      setShowForm(false);
    } catch {
      alert('Failed to create route');
    } finally {
      setSaving(false);
    }
  };

  const totalStudents = mockRoutes.reduce((s, r) => s + r.studentCount, 0);
  const totalVehicles = mockRoutes.length;
  const avgFee = Math.round(mockRoutes.reduce((s, r) => s + r.fee, 0) / mockRoutes.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Routes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage school bus routes and stops</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Add Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg"><Bus size={20} className="text-indigo-600" /></div>
          <div><p className="text-xs text-gray-500">Routes</p><p className="text-xl font-bold text-gray-900">{mockRoutes.length}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg"><Users size={20} className="text-emerald-600" /></div>
          <div><p className="text-xs text-gray-500">Students</p><p className="text-xl font-bold text-gray-900">{totalStudents}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><Bus size={20} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Vehicles</p><p className="text-xl font-bold text-gray-900">{totalVehicles}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg"><IndianRupee size={20} className="text-amber-600" /></div>
          <div><p className="text-xs text-gray-500">Avg Fee</p><p className="text-xl font-bold text-gray-900">Rs. {avgFee}</p></div>
        </div>
      </div>

      {/* Route Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockRoutes.map((route) => {
          const isExpanded = expandedRoute === route._id;
          return (
            <div key={route._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div
                className="p-5 cursor-pointer"
                onClick={() => toggleExpand(route._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-lg">
                      <Bus size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{route.name}</h3>
                      <p className="text-xs text-gray-500">{route.code} | {route.vehicleRegNo}</p>
                    </div>
                  </div>
                  <span className="text-gray-400">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Driver</p>
                    <p className="text-sm font-medium text-gray-700">{route.driver}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Stops</p>
                    <p className="text-sm font-medium text-gray-700">{route.stopsCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Students</p>
                    <p className="text-sm font-medium text-gray-700">{route.studentCount}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <IndianRupee size={14} />
                    <span className="font-medium">{route.fee}/month</span>
                  </div>
                  <span className="text-xs text-gray-400">Click to view stops</span>
                </div>
              </div>

              {/* Expanded Stops */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Route Stops</h4>
                  <div className="space-y-2">
                    {route.stops.map((stop, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{i + 1}</span>
                          </div>
                          {i < route.stops.length - 1 && <div className="w-0.5 h-4 bg-indigo-200" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{stop}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Route" size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <InputField label="Route Name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Route Code" name="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <InputField label="Monthly Fee" name="fee" type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Vehicle Reg No" name="vehicleRegNo" value={form.vehicleRegNo} onChange={(e) => setForm({ ...form, vehicleRegNo: e.target.value })} required />
            <InputField label="Driver Name" name="driver" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RouteList;
