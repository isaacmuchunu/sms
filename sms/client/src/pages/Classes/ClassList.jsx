import React, { useState } from 'react';
import { Plus, Users, UserCheck, X } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import Modal from '../../components/Modal';

const ClassList = () => {
  const { data: classes, loading, error } = useFetch('/classes');
  const [expandedClass, setExpandedClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const toggleExpand = (id) => {
    setExpandedClass((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500 bg-red-50 rounded-lg border border-red-200">
        <p>{error}</p>
      </div>
    );
  }

  const classData = classes || [
    { _id: '1', name: 'Class 1', section: 'A', capacity: 40, studentsCount: 35, classTeacher: 'Mrs. Sharma' },
    { _id: '2', name: 'Class 1', section: 'B', capacity: 40, studentsCount: 38, classTeacher: 'Mr. Kumar' },
    { _id: '3', name: 'Class 2', section: 'A', capacity: 40, studentsCount: 40, classTeacher: 'Mrs. Patel' },
    { _id: '4', name: 'Class 2', section: 'B', capacity: 40, studentsCount: 36, classTeacher: 'Mr. Singh' },
    { _id: '5', name: 'Class 3', section: 'A', capacity: 45, studentsCount: 42, classTeacher: 'Mrs. Gupta' },
    { _id: '6', name: 'Class 3', section: 'B', capacity: 45, studentsCount: 39, classTeacher: 'Mr. Reddy' },
    { _id: '7', name: 'Class 4', section: 'A', capacity: 45, studentsCount: 45, classTeacher: 'Mrs. Iyer' },
    { _id: '8', name: 'Class 4', section: 'B', capacity: 45, studentsCount: 41, classTeacher: 'Mr. Nair' },
    { _id: '9', name: 'Class 5', section: 'A', capacity: 45, studentsCount: 38, classTeacher: 'Mrs. Joshi' },
    { _id: '10', name: 'Class 5', section: 'B', capacity: 45, studentsCount: 44, classTeacher: 'Mr. Mehta' },
    { _id: '11', name: 'Class 6', section: 'A', capacity: 50, studentsCount: 46, classTeacher: 'Mrs. Khan' },
    { _id: '12', name: 'Class 6', section: 'B', capacity: 50, studentsCount: 40, classTeacher: 'Mr. Verma' },
  ];
  const totalStudents = classData.reduce((s, c) => s + (c.studentsCount || 0), 0);
  const totalCapacity = classData.reduce((s, c) => s + (c.capacity || 0), 0);
  const getTeacherName = (teacher) =>
    typeof teacher === 'object' && teacher
      ? [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.name
      : teacher;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all classes and sections</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={16} />
          Add Class
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Total Classes</p>
          <p className="text-2xl font-bold text-indigo-600">{classData.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Total Students</p>
          <p className="text-2xl font-bold text-emerald-600">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Total Capacity</p>
          <p className="text-2xl font-bold text-blue-600">{totalCapacity}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Avg Occupancy</p>
          <p className="text-2xl font-bold text-amber-600">
            {totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {classData.map((cls) => {
          const occupancyPercent = cls.capacity > 0 ? Math.round(((cls.studentsCount || 0) / cls.capacity) * 100) : 0;
          const barColor = occupancyPercent >= 90 ? 'bg-red-500' : occupancyPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500';

          return (
            <div
              key={cls._id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedClass(cls)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">
                  {cls.name} - {cls.section}
                </h3>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                  Sec {cls.section}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={14} />
                  <span>{cls.studentsCount || 0} / {cls.capacity || 0} students</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <UserCheck size={14} />
                  <span>{getTeacherName(cls.classTeacher) || 'Not assigned'}</span>
                </div>
              </div>

              {/* Capacity Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Capacity</span>
                  <span>{occupancyPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${barColor} h-2 rounded-full transition-all`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        title={selectedClass ? `${selectedClass.name} - Section ${selectedClass.section}` : ''}
        size="md"
      >
        {selectedClass && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500">Students</p>
                <p className="text-xl font-bold text-indigo-600">{selectedClass.studentsCount || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500">Capacity</p>
                <p className="text-xl font-bold text-emerald-600">{selectedClass.capacity || 0}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Class Teacher</p>
              <p className="text-base font-medium text-gray-800">{getTeacherName(selectedClass.classTeacher) || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Capacity Utilization</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full"
                  style={{
                    width: `${
                      selectedClass.capacity > 0
                        ? Math.round(((selectedClass.studentsCount || 0) / selectedClass.capacity) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedClass.capacity > 0
                  ? Math.round(((selectedClass.studentsCount || 0) / selectedClass.capacity) * 100)
                  : 0}% full
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClassList;
