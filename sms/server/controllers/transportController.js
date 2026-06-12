const Route = require('../models/Route');
const Vehicle = require('../models/Vehicle');
const Student = require('../models/Student');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ── Routes ─────────────────────────────────────────────────

// @desc    Get all routes with vehicle info
// @route   GET /api/v1/transport/routes
// @access  Admin
exports.getRoutes = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [routes, total] = await Promise.all([
    Route.find(query)
      .populate('vehicle', 'registrationNumber type capacity')
      .populate('students', 'firstName lastName admissionNo')
      .sort('routeName')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Route.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { routes, meta }, 'Routes retrieved successfully');
});

// @desc    Create new route with stops
// @route   POST /api/v1/transport/routes
// @access  Admin
exports.createRoute = catchAsync(async (req, res) => {
  const {
    routeName,
    routeCode,
    vehicle,
    stops,
    startPoint,
    endPoint,
    totalDistance,
    estimatedTime,
    fare,
    description,
  } = req.body;

  // Check route code unique
  const existing = await Route.findOne({ routeCode });
  if (existing) {
    throw new ApiError('Route with this code already exists', 400);
  }

  const route = await Route.create({
    routeName,
    routeCode,
    vehicle,
    stops: stops || [],
    startPoint,
    endPoint,
    totalDistance,
    estimatedTime,
    fare,
    description,
  });

  const populatedRoute = await Route.findById(route._id)
    .populate('vehicle', 'registrationNumber type capacity');

  return ApiResponse.success(res, { route: populatedRoute }, 'Route created successfully', 201);
});

// @desc    Update route
// @route   PUT /api/v1/transport/routes/:id
// @access  Admin
exports.updateRoute = catchAsync(async (req, res) => {
  const {
    routeName,
    vehicle,
    stops,
    startPoint,
    endPoint,
    totalDistance,
    estimatedTime,
    fare,
    status,
    description,
  } = req.body;

  const route = await Route.findById(req.params.id);
  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  const updateData = {};
  if (routeName) updateData.routeName = routeName;
  if (vehicle) updateData.vehicle = vehicle;
  if (stops) updateData.stops = stops;
  if (startPoint) updateData.startPoint = startPoint;
  if (endPoint) updateData.endPoint = endPoint;
  if (totalDistance) updateData.totalDistance = totalDistance;
  if (estimatedTime) updateData.estimatedTime = estimatedTime;
  if (fare) updateData.fare = fare;
  if (status) updateData.status = status;
  if (description !== undefined) updateData.description = description;

  const updatedRoute = await Route.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('vehicle', 'registrationNumber type capacity');

  return ApiResponse.success(res, { route: updatedRoute }, 'Route updated successfully');
});

// @desc    Delete route (if no student allocations)
// @route   DELETE /api/v1/transport/routes/:id
// @access  Admin
exports.deleteRoute = catchAsync(async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  // Check if students are allocated
  if (route.students && route.students.length > 0) {
    throw new ApiError(
      `Cannot delete route. ${route.students.length} student(s) are allocated. Remove them first.`,
      400
    );
  }

  await Route.findByIdAndDelete(req.params.id);

  return ApiResponse.success(res, null, 'Route deleted successfully');
});

// @desc    Assign student to a route
// @route   POST /api/v1/transport/routes/:id/assign-student
// @access  Admin
exports.assignStudent = catchAsync(async (req, res) => {
  const { studentId, stopName } = req.body;

  const route = await Route.findById(req.params.id);
  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  // Check if student already assigned to this route
  if (route.students.includes(studentId)) {
    throw new ApiError('Student is already assigned to this route', 400);
  }

  route.students.push(studentId);
  await route.save();

  // Update student's route reference
  await Student.findByIdAndUpdate(studentId, {
    transportRoute: route._id,
    transportStop: stopName,
  });

  const updatedRoute = await Route.findById(route._id)
    .populate('vehicle', 'registrationNumber type capacity')
    .populate('students', 'firstName lastName admissionNo');

  return ApiResponse.success(res, { route: updatedRoute }, 'Student assigned to route');
});

// @desc    Remove student from a route
// @route   POST /api/v1/transport/routes/:id/remove-student
// @access  Admin
exports.removeStudent = catchAsync(async (req, res) => {
  const { studentId } = req.body;

  const route = await Route.findById(req.params.id);
  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  route.students = route.students.filter((s) => s.toString() !== studentId);
  await route.save();

  // Remove route reference from student
  await Student.findByIdAndUpdate(studentId, {
    $unset: { transportRoute: '', transportStop: '' },
  });

  const updatedRoute = await Route.findById(route._id)
    .populate('vehicle', 'registrationNumber type capacity')
    .populate('students', 'firstName lastName admissionNo');

  return ApiResponse.success(res, { route: updatedRoute }, 'Student removed from route');
});

// ── Vehicles ───────────────────────────────────────────────

// @desc    Get all vehicles
// @route   GET /api/v1/transport/vehicles
// @access  Admin
exports.getVehicles = catchAsync(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;

  const skip = (Number(page) - 1) * Number(limit);

  const [vehicles, total] = await Promise.all([
    Vehicle.find(query)
      .sort('registrationNumber')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Vehicle.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { vehicles, meta }, 'Vehicles retrieved successfully');
});

// @desc    Add new vehicle
// @route   POST /api/v1/transport/vehicles
// @access  Admin
exports.addVehicle = catchAsync(async (req, res) => {
  const {
    registrationNumber,
    type,
    capacity,
    model,
    manufacturer,
    yearOfManufacture,
    color,
    insuranceExpiry,
    fitnessExpiry,
    driverName,
    driverPhone,
    status,
  } = req.body;

  // Check registration number unique
  const existing = await Vehicle.findOne({ registrationNumber });
  if (existing) {
    throw new ApiError('Vehicle with this registration number already exists', 400);
  }

  const vehicle = await Vehicle.create({
    registrationNumber,
    type,
    capacity,
    model,
    manufacturer,
    yearOfManufacture,
    color,
    insuranceExpiry,
    fitnessExpiry,
    driverName,
    driverPhone,
    status: status || 'active',
  });

  return ApiResponse.success(res, { vehicle }, 'Vehicle added successfully', 201);
});

// @desc    Update vehicle details
// @route   PUT /api/v1/transport/vehicles/:id
// @access  Admin
exports.updateVehicle = catchAsync(async (req, res) => {
  const {
    type,
    capacity,
    model,
    manufacturer,
    yearOfManufacture,
    color,
    insuranceExpiry,
    fitnessExpiry,
    driverName,
    driverPhone,
    status,
  } = req.body;

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    throw new ApiError('Vehicle not found', 404);
  }

  const updateData = {};
  if (type) updateData.type = type;
  if (capacity) updateData.capacity = capacity;
  if (model) updateData.model = model;
  if (manufacturer) updateData.manufacturer = manufacturer;
  if (yearOfManufacture) updateData.yearOfManufacture = yearOfManufacture;
  if (color) updateData.color = color;
  if (insuranceExpiry) updateData.insuranceExpiry = insuranceExpiry;
  if (fitnessExpiry) updateData.fitnessExpiry = fitnessExpiry;
  if (driverName) updateData.driverName = driverName;
  if (driverPhone) updateData.driverPhone = driverPhone;
  if (status) updateData.status = status;

  const updatedVehicle = await Vehicle.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  return ApiResponse.success(res, { vehicle: updatedVehicle }, 'Vehicle updated successfully');
});
