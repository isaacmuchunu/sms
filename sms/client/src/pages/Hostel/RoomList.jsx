import React, { useState } from 'react';
import { BedDouble, Users, Wrench, ChevronRight, LogIn } from 'lucide-react';
import Modal from '../../components/Modal';
import useFetch from '../../hooks/useFetch';

const ROOM_TYPES = {
  single: { label: 'Single', capacity: 1 },
  double: { label: 'Double', capacity: 2 },
  triple: { label: 'Triple', capacity: 3 },
  dormitory: { label: 'Dormitory', capacity: 6 },
};

const mockRooms = Array.from({ length: 24 }, (_, i) => {
  const roomNo = 100 + i + 1;
  const types = ['single', 'double', 'triple', 'dormitory'];
  const type = types[i % 4];
  const capacity = ROOM_TYPES[type].capacity;
  const statusRoll = i % 5;
  const status = statusRoll === 0 ? 'maintenance' : statusRoll === 1 ? 'full' : 'available';
  const occupants = status === 'maintenance' ? 0 : status === 'full' ? capacity : Math.floor(Math.random() * capacity);

  return {
    _id: `r${i + 1}`,
    roomNo: String(roomNo),
    type,
    capacity,
    occupants,
    status,
    occupantsList: occupants > 0 ? Array.from({ length: occupants }, (_, j) => `Student ${i * 3 + j + 1}`) : [],
  };
});

const statusConfig = {
  available: { color: 'border-emerald-300 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', label: 'Available' },
  full: { color: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-700', label: 'Full' },
  maintenance: { color: 'border-amber-300 bg-amber-50', badge: 'bg-amber-100 text-amber-700', label: 'Maintenance' },
};

const RoomList = () => {
  const { data: roomsFromApi = [] } = useFetch('/hostel/rooms');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showVisitorLog, setShowVisitorLog] = useState(false);
  const rooms = Array.isArray(roomsFromApi) && roomsFromApi.length > 0
    ? roomsFromApi.map((room) => ({
        ...room,
        roomNo: room.roomNumber,
        occupants: room.occupants?.length || 0,
        occupantsList: room.occupants?.map((student) =>
          [student.firstName, student.lastName].filter(Boolean).join(' ')
        ) || [],
        status: room.status === 'partially_occupied' || room.status === 'occupied' ? 'available' : room.status,
      }))
    : mockRooms;

  const stats = {
    total: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    full: rooms.filter((r) => r.status === 'full').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
    totalOccupants: rooms.reduce((s, r) => s + r.occupants, 0),
    totalCapacity: rooms.reduce((s, r) => s + r.capacity, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hostel Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hostel room allocations</p>
        </div>
        <button
          onClick={() => setShowVisitorLog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <LogIn size={16} /> Visitor Log
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Total Rooms</p><p className="text-xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Available</p><p className="text-xl font-bold text-emerald-600">{stats.available}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Full</p><p className="text-xl font-bold text-red-600">{stats.full}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Maintenance</p><p className="text-xl font-bold text-amber-600">{stats.maintenance}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Occupancy</p><p className="text-xl font-bold text-blue-600">{stats.totalOccupants}/{stats.totalCapacity}</p>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {rooms.map((room) => {
          const config = statusConfig[room.status];
          const occupancyPct = Math.round((room.occupants / room.capacity) * 100);

          return (
            <div
              key={room._id}
              onClick={() => room.occupants > 0 && setSelectedRoom(room)}
              className={`rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition-all ${config.color} ${
                room.occupants > 0 ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <BedDouble size={18} className="text-gray-600" />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>{config.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-800">{room.roomNo}</p>
              <p className="text-xs text-gray-500 capitalize">{ROOM_TYPES[room.type].label}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{room.occupants}/{room.capacity}</span>
                  <Users size={12} />
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${room.status === 'full' ? 'bg-red-400' : room.status === 'available' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
              {room.occupants > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                  <span>View occupants</span>
                  <ChevronRight size={12} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Room Detail Modal */}
      <Modal isOpen={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={selectedRoom ? `Room ${selectedRoom.roomNo}` : ''} size="sm">
        {selectedRoom && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedRoom.status].badge}`}>
                {statusConfig[selectedRoom.status].label}
              </span>
              <span className="text-sm text-gray-500 capitalize">{ROOM_TYPES[selectedRoom.type].label} Room</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Occupants ({selectedRoom.occupants}/{selectedRoom.capacity})</p>
              <div className="space-y-2">
                {selectedRoom.occupantsList.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Users size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700">{name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${(selectedRoom.occupants / selectedRoom.capacity) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Visitor Log Modal */}
      <Modal isOpen={showVisitorLog} onClose={() => setShowVisitorLog(false)} title="Visitor Log" size="lg">
        <div className="space-y-3">
          {[
            { name: 'Mr. Sharma', student: 'Rahul Sharma', room: '101', in: '10:00 AM', out: '11:30 AM', date: '2025-01-15' },
            { name: 'Mrs. Patel', student: 'Priya Patel', room: '102', in: '2:00 PM', out: '-', date: '2025-01-15' },
            { name: 'Mr. Kumar', student: 'Amit Kumar', room: '103', in: '9:30 AM', out: '10:15 AM', date: '2025-01-14' },
          ].map((v, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">{v.name}</p>
                <p className="text-xs text-gray-500">Visiting: {v.student} (Room {v.room})</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{v.date}</p>
                <p className="text-xs text-gray-600">{v.in} - {v.out || 'Not out'}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default RoomList;
