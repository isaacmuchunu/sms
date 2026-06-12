const Room = require('../models/Room');
const VisitorLog = require('../models/VisitorLog');
const Student = require('../models/Student');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ── Rooms ──────────────────────────────────────────────────

// @desc    Get all rooms with filters
// @route   GET /api/v1/hostel/rooms
// @access  Admin
exports.getRooms = catchAsync(async (req, res) => {
  const {
    block,
    type,
    status,
    page = 1,
    limit = 20,
    sort = 'block roomNumber',
  } = req.query;

  const query = {};

  if (block) query.block = block;
  if (type) query.type = type;
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [rooms, total] = await Promise.all([
    Room.find(query)
      .populate('occupants', 'firstName lastName admissionNo gender')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Room.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { rooms, meta }, 'Rooms retrieved successfully');
});

// @desc    Create new room
// @route   POST /api/v1/hostel/rooms
// @access  Admin
exports.createRoom = catchAsync(async (req, res) => {
  const {
    roomNumber,
    block,
    floor,
    type,
    capacity,
    facilities,
    monthlyRent,
    description,
  } = req.body;

  // Check if room already exists in block
  const existing = await Room.findOne({ roomNumber, block });
  if (existing) {
    throw new ApiError(`Room ${roomNumber} already exists in block ${block}`, 400);
  }

  const room = await Room.create({
    roomNumber,
    block,
    floor,
    type: type || 'standard',
    capacity: capacity || 2,
    facilities: facilities || [],
    monthlyRent,
    description,
  });

  return ApiResponse.success(res, { room }, 'Room created successfully', 201);
});

// @desc    Update room details
// @route   PUT /api/v1/hostel/rooms/:id
// @access  Admin
exports.updateRoom = catchAsync(async (req, res) => {
  const {
    floor,
    type,
    capacity,
    facilities,
    monthlyRent,
    status,
    description,
  } = req.body;

  const room = await Room.findById(req.params.id);
  if (!room) {
    throw new ApiError('Room not found', 404);
  }

  const updateData = {};
  if (floor) updateData.floor = floor;
  if (type) updateData.type = type;
  if (capacity) updateData.capacity = capacity;
  if (facilities) updateData.facilities = facilities;
  if (monthlyRent) updateData.monthlyRent = monthlyRent;
  if (status) updateData.status = status;
  if (description !== undefined) updateData.description = description;

  const updatedRoom = await Room.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('occupants', 'firstName lastName admissionNo');

  return ApiResponse.success(res, { room: updatedRoom }, 'Room updated successfully');
});

// @desc    Allocate student to room
// @route   POST /api/v1/hostel/rooms/:id/allocate
// @access  Admin
exports.allocateRoom = catchAsync(async (req, res) => {
  const { studentId, allocationDate } = req.body;

  const room = await Room.findById(req.params.id);
  if (!room) {
    throw new ApiError('Room not found', 404);
  }

  // Check capacity
  if (room.occupants.length >= room.capacity) {
    throw new ApiError('Room is at full capacity', 400);
  }

  // Check if student already allocated
  if (room.occupants.includes(studentId)) {
    throw new ApiError('Student is already allocated to this room', 400);
  }

  room.occupants.push(studentId);

  // Update room status
  if (room.occupants.length >= room.capacity) {
    room.status = 'occupied';
  } else if (room.occupants.length > 0) {
    room.status = 'partially_occupied';
  }

  await room.save();

  // Update student record
  await Student.findByIdAndUpdate(studentId, {
    hostelRoom: room._id,
    hostelAllocationDate: allocationDate || new Date(),
  });

  const updatedRoom = await Room.findById(room._id)
    .populate('occupants', 'firstName lastName admissionNo gender');

  return ApiResponse.success(res, { room: updatedRoom }, 'Student allocated to room');
});

// @desc    Vacate student from room
// @route   POST /api/v1/hostel/rooms/:id/vacate
// @access  Admin
exports.vacateRoom = catchAsync(async (req, res) => {
  const { studentId } = req.body;

  const room = await Room.findById(req.params.id);
  if (!room) {
    throw new ApiError('Room not found', 404);
  }

  room.occupants = room.occupants.filter((o) => o.toString() !== studentId);

  // Update room status
  if (room.occupants.length === 0) {
    room.status = 'available';
  } else {
    room.status = 'partially_occupied';
  }

  await room.save();

  // Update student record
  await Student.findByIdAndUpdate(studentId, {
    $unset: { hostelRoom: '', hostelAllocationDate: '' },
  });

  const updatedRoom = await Room.findById(room._id)
    .populate('occupants', 'firstName lastName admissionNo');

  return ApiResponse.success(res, { room: updatedRoom }, 'Student vacated from room');
});

// ── Visitor Logs ───────────────────────────────────────────

// @desc    Get visitor logs with filters
// @route   GET /api/v1/hostel/visitor-logs
// @access  Admin
exports.getVisitorLogs = catchAsync(async (req, res) => {
  const {
    student,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (student) query.student = student;
  if (status) query.status = status;
  if (startDate && endDate) {
    query.visitDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    VisitorLog.find(query)
      .populate('student', 'firstName lastName admissionNo')
      .populate('room', 'roomNumber block')
      .sort('-visitDate')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    VisitorLog.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { logs, meta }, 'Visitor logs retrieved');
});

// @desc    Add visitor log entry
// @route   POST /api/v1/hostel/visitor-logs
// @access  Admin
exports.addVisitor = catchAsync(async (req, res) => {
  const {
    student,
    room,
    visitorName,
    visitorPhone,
    relation,
    purpose,
    visitDate,
    idProofType,
    idProofNumber,
  } = req.body;

  const log = await VisitorLog.create({
    student,
    room,
    visitorName,
    visitorPhone,
    relation,
    purpose,
    visitDate: visitDate || new Date(),
    idProofType,
    idProofNumber,
    status: 'checked_in',
    checkedInBy: req.user.id,
  });

  const populatedLog = await VisitorLog.findById(log._id)
    .populate('student', 'firstName lastName admissionNo')
    .populate('room', 'roomNumber block');

  return ApiResponse.success(res, { log: populatedLog }, 'Visitor log created', 201);
});

// @desc    Checkout visitor
// @route   PUT /api/v1/hostel/visitor-logs/:id/checkout
// @access  Admin
exports.checkoutVisitor = catchAsync(async (req, res) => {
  const log = await VisitorLog.findById(req.params.id);
  if (!log) {
    throw new ApiError('Visitor log not found', 404);
  }

  if (log.status === 'checked_out') {
    throw new ApiError('Visitor is already checked out', 400);
  }

  log.exitTime = new Date();
  log.status = 'checked_out';
  log.checkedOutBy = req.user.id;

  await log.save();

  const updatedLog = await VisitorLog.findById(log._id)
    .populate('student', 'firstName lastName admissionNo')
    .populate('room', 'roomNumber block');

  return ApiResponse.success(res, { log: updatedLog }, 'Visitor checked out successfully');
});
