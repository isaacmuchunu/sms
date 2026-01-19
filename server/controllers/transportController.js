const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool, getSchoolFilter } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

// ── Helpers ────────────────────────────────────────────────

const escapeLike = (string) => string.replace(/[%_\\]/g, '\\$&');

const VEHICLE_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  vehicleNo: '"vehicle_no"',
  registrationNo: '"registration_no"',
  type: '"type"',
  capacity: '"capacity"',
  model: '"model"',
  manufacturer: '"manufacturer"',
  status: '"status"',
  driverName: '"driver_name"',
};

const ROUTE_SORT_ALLOWLIST = {
  createdAt: 'r.created_at',
  name: 'r.name',
  routeCode: 'r.route_code',
  status: 'r.status',
};

const ALLOCATION_SORT_ALLOWLIST = {
  createdAt: 'st.created_at',
  updatedAt: 'st.updated_at',
  status: 'st.status',
};

const mapBody = (body, fieldMap) => {
  const result = {};
  Object.keys(fieldMap).forEach((key) => {
    if (body[key] !== undefined) {
      result[fieldMap[key]] = body[key];
    }
  });
  return result;
};

const vehicleFieldMap = {
  vehicleNo: 'vehicle_no',
  registrationNo: 'registration_no',
  type: 'type',
  capacity: 'capacity',
  model: 'model',
  manufacturer: 'manufacturer',
  status: 'status',
  driverName: 'driver_name',
  driverPhone: 'driver_phone',
  attendantName: 'attendant_name',
  insuranceExpiry: 'insurance_expiry',
  pollutionExpiry: 'pollution_expiry',
  fitnessExpiry: 'fitness_expiry',
};

const routeFieldMap = {
  name: 'name',
  routeCode: 'route_code',
  vehicle: 'vehicle_id',
  vehicleId: 'vehicle_id',
  driver: 'driver',
  attendant: 'attendant',
  totalDistance: 'total_distance',
  monthlyFee: 'monthly_fee',
  status: 'status',
};

const stopFieldMap = {
  name: 'name',
  sequence: 'sequence',
  pickupTime: 'pickup_time',
  dropTime: 'drop_time',
  fee: 'fee',
};

const allocationFieldMap = {
  student: 'student_id',
  studentId: 'student_id',
  route: 'route_id',
  routeId: 'route_id',
  pickupStop: 'pickup_stop',
  dropStop: 'drop_stop',
  monthlyFee: 'monthly_fee',
  effectiveFrom: 'effective_from',
  effectiveTo: 'effective_to',
  status: 'status',
};

const mapVehicle = (row) => ({
  id: row.id,
  vehicleNo: row.vehicle_no,
  type: row.type,
  capacity: row.capacity,
  model: row.model,
  manufacturer: row.manufacturer,
  registrationNo: row.registration_no,
  insuranceExpiry: row.insurance_expiry,
  pollutionExpiry: row.pollution_expiry,
  fitnessExpiry: row.fitness_expiry,
  driverName: row.driver_name,
  driverPhone: row.driver_phone,
  attendantName: row.attendant_name,
  status: row.status,
});

const mapStop = (row) => ({
  id: row.id,
  name: row.name,
  sequence: row.sequence,
  pickupTime: row.pickup_time,
  dropTime: row.drop_time,
  fee: row.fee,
});

const mapRoute = (row) => ({
  id: row.id,
  name: row.name,
  routeCode: row.route_code,
  vehicle: row.vehicle_id,
  driver: row.driver,
  attendant: row.attendant,
  totalDistance: row.total_distance,
  monthlyFee: row.monthly_fee,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAllocation = (row) => ({
  id: row.id,
  student: {
    id: row.student_id,
    firstName: row.first_name,
    lastName: row.last_name,
    admissionNo: row.admission_no,
    rollNo: row.roll_no,
    class: row.class_name,
    section: row.section_name,
    status: row.student_status,
  },
  route: {
    id: row.route_id,
    name: row.route_name,
    routeCode: row.route_code,
    monthlyFee: row.route_monthly_fee,
    vehicle: mapVehicle({ ...row, id: row.vehicle_id, status: row.vehicle_status }),
  },
  pickupStop: row.pickup_stop,
  dropStop: row.drop_stop,
  monthlyFee: row.monthly_fee,
  effectiveFrom: row.effective_from,
  effectiveTo: row.effective_to,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeStops = (stops = []) =>
  stops
    .map((stop, index) => ({
      name: stop.name,
      sequence: Number(stop.sequence) || index + 1,
      pickupTime: stop.pickupTime || '',
      dropTime: stop.dropTime || '',
      fee: Number(stop.fee) || 0,
    }))
    .sort((a, b) => a.sequence - b.sequence);

const getRouteWithVehicleAndStops = async (routeId, req) => {
  const rows = await db.raw(
    `SELECT r.*, v.id as vehicle_id, v.vehicle_no, v.type, v.capacity, v.model, v.manufacturer, v.status as vehicle_status, v.driver_name
     FROM transport_routes r
     JOIN vehicles v ON r.vehicle_id = v.id
     WHERE r.id = $1 AND r.school_id = $2
     LIMIT 1`,
    [routeId, req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id]
  );
  if (!rows[0]) return null;
  const stops = await db.findMany('transport_route_stops', {
    where: { route_id: routeId, ...getSchoolFilter(req) },
    orderBy: 'sequence ASC',
  });
  return {
    ...mapRoute(rows[0]),
    vehicle: mapVehicle({ ...rows[0], id: rows[0].vehicle_id, status: rows[0].vehicle_status }),
    stops: stops.map(mapStop),
  };
};

const getAllocationById = async (id, req) => {
  const schoolId = req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id;
  const rows = await db.raw(
    `SELECT
      st.id, st.student_id, st.route_id, st.pickup_stop, st.drop_stop, st.monthly_fee,
      st.effective_from, st.effective_to, st.status, st.created_at, st.updated_at,
      s.first_name, s.last_name, s.admission_no, s.roll_no, s.status as student_status,
      c.name as class_name, cs.name as section_name,
      r.name as route_name, r.route_code, r.monthly_fee as route_monthly_fee,
      v.id as vehicle_id, v.vehicle_no, v.type, v.capacity, v.model, v.manufacturer, v.status as vehicle_status, v.driver_name
     FROM student_transports st
     JOIN students s ON st.student_id = s.id
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN class_sections cs ON s.section_id = cs.id
     JOIN transport_routes r ON st.route_id = r.id
     JOIN vehicles v ON r.vehicle_id = v.id
     WHERE st.id = $1 AND st.school_id = $2
     LIMIT 1`,
    [id, schoolId]
  );
  if (!rows[0]) return null;
  return mapAllocation(rows[0]);
};

const assertVehicleExists = async (vehicleId, req) => {
  const vehicle = await db.findOne('vehicles', { id: vehicleId, ...getSchoolFilter(req) });
  if (!vehicle) {
    throw new ApiError('Vehicle not found', 404);
  }
  return mapVehicle(vehicle);
};

const assertRouteExists = async (routeId, req) => {
  const route = await getRouteWithVehicleAndStops(routeId, req);
  if (!route) {
    throw new ApiError('Route not found', 404);
  }
  return route;
};

const getActiveAllocationCounts = async (routeIds, req) => {
  if (!routeIds.length) return {};
  const schoolId = req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id;
  const counts = await db.raw(
    `SELECT route_id, COUNT(*)::int as count
     FROM student_transports
     WHERE route_id = ANY($1::uuid[]) AND school_id = $2 AND status = 'active'
     GROUP BY route_id`,
    [routeIds, schoolId]
  );
  const map = {};
  counts.forEach((c) => {
    map[c.route_id] = c.count;
  });
  return map;
};

const resolveStudentIdsBySearch = async (search, req) => {
  const term = `%${escapeLike(search)}%`;
  const students = await db.raw(
    `SELECT id FROM students
     WHERE school_id = $1
       AND (first_name ILIKE $2 ESCAPE '\\'
        OR last_name ILIKE $2 ESCAPE '\\'
        OR admission_no ILIKE $2 ESCAPE '\\')`,
    [req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id, term]
  );
  return students.map((s) => s.id);
};

async function createAndPopulateAllocation(payload, req) {
  const { student, route: routeId, pickupStop, dropStop, monthlyFee } = payload;

  const route = await assertRouteExists(routeId, req);
  if (route.status !== 'active') {
    throw new ApiError('Route is not active', 400);
  }
  if (!route.vehicle || route.vehicle.status !== 'active') {
    throw new ApiError('Route does not have an active vehicle assigned', 400);
  }

  const stopNames = route.stops.map((s) => s.name);
  if (!stopNames.includes(pickupStop) || !stopNames.includes(dropStop)) {
    throw new ApiError('Pickup or drop stop does not exist on this route', 400);
  }

  const studentDoc = await db.findOne('students', { id: student, ...getSchoolFilter(req) });
  if (!studentDoc) {
    throw new ApiError('Student not found', 404);
  }

  if (payload.status === 'active') {
    const existing = await db.findOne('student_transports', { student_id: student, status: 'active', ...getSchoolFilter(req) });
    if (existing) {
      throw new ApiError('Student already has an active transport allocation', 409);
    }
  }

  const allocated = await db.count('student_transports', { route_id: route.id, status: 'active', ...getSchoolFilter(req) });
  if (allocated >= route.vehicle.capacity) {
    throw new ApiError('Route vehicle capacity exceeded', 409);
  }

  const fee = monthlyFee !== undefined ? monthlyFee : route.monthlyFee;

  const allocation = await db.insert('student_transports', {
    ...mapBody(payload, allocationFieldMap),
    monthly_fee: fee,
    school_id: req.user.school_id,
  });

  return getAllocationById(allocation.id, req);
}

// ── Vehicles ─────────────────────────────────────────────────

exports.getVehicles = catchAsync(async (req, res) => {
  const { status, type, search, sort = 'vehicleNo' } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'school_id'));
  params.push(...schoolParams);

  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  if (type) {
    conditions.push(`type = $${params.length + 1}`);
    params.push(type);
  }
  if (search) {
    const term = `%${escapeLike(search)}%`;
    conditions.push(
      `(vehicle_no ILIKE $${params.length + 1} ESCAPE '\\' OR registration_no ILIKE $${params.length + 2} ESCAPE '\\' OR model ILIKE $${params.length + 3} ESCAPE '\\' OR manufacturer ILIKE $${params.length + 4} ESCAPE '\\')`
    );
    params.push(term, term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, VEHICLE_SORT_ALLOWLIST, '"vehicle_no" ASC');

  const [vehicles, total] = await Promise.all([
    db.raw(
      `SELECT * FROM vehicles ${where} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, skip]
    ),
    db.raw(`SELECT COUNT(*)::text as count FROM vehicles ${where}`, params),
  ]);

  const meta = getPaginationMeta(page, limit, parseInt(total[0].count, 10));
  return ApiResponse.paginated(res, vehicles.map(mapVehicle), meta, 'Vehicles retrieved successfully');
});

exports.getVehicle = catchAsync(async (req, res) => {
  const vehicle = await db.findOne('vehicles', { id: req.params.id, ...getSchoolFilter(req) });
  if (!vehicle) {
    throw new ApiError('Vehicle not found', 404);
  }
  return ApiResponse.success(res, { vehicle: mapVehicle(vehicle) }, 'Vehicle retrieved successfully');
});

exports.createVehicle = catchAsync(async (req, res) => {
  const { vehicleNo, registrationNo } = req.body;

  const existing = await db.raw(
    `SELECT * FROM vehicles WHERE school_id = $1 AND (vehicle_no = $2 OR registration_no = $3) LIMIT 1`,
    [req.user.school_id, vehicleNo, registrationNo]
  );
  if (existing[0]) {
    throw new ApiError('Vehicle number or registration number already exists', 400);
  }

  const vehicle = await db.insert('vehicles', { ...mapBody(req.body, vehicleFieldMap), school_id: req.user.school_id });
  return ApiResponse.success(res, { vehicle: mapVehicle(vehicle) }, 'Vehicle created successfully', 201);
});

exports.updateVehicle = catchAsync(async (req, res) => {
  const vehicle = await db.findOne('vehicles', { id: req.params.id, ...getSchoolFilter(req) });
  if (!vehicle) {
    throw new ApiError('Vehicle not found', 404);
  }

  const { vehicleNo, registrationNo } = req.body;
  if (vehicleNo || registrationNo) {
    const orConditions = [];
    const p = [];
    if (vehicleNo) {
      orConditions.push(`vehicle_no = $${p.length + 1}`);
      p.push(vehicleNo);
    }
    if (registrationNo) {
      orConditions.push(`registration_no = $${p.length + 1}`);
      p.push(registrationNo);
    }

    const duplicate = await db.raw(
      `SELECT * FROM vehicles WHERE school_id = $1 AND id <> $2 AND (${orConditions.join(' OR ')}) LIMIT 1`,
      [vehicle.school_id, req.params.id, ...p]
    );
    if (duplicate[0]) {
      throw new ApiError('Vehicle number or registration number already in use', 400);
    }
  }

  const data = mapBody(req.body, vehicleFieldMap);
  const [updated] = await db.update('vehicles', data, { id: req.params.id });
  return ApiResponse.success(res, { vehicle: mapVehicle(updated) }, 'Vehicle updated successfully');
});

exports.deleteVehicle = catchAsync(async (req, res) => {
  const vehicle = await db.findOne('vehicles', { id: req.params.id, ...getSchoolFilter(req) });
  if (!vehicle) {
    throw new ApiError('Vehicle not found', 404);
  }

  const linkedRoutes = await db.count('transport_routes', { vehicle_id: req.params.id, ...getSchoolFilter(req) });
  if (linkedRoutes > 0) {
    throw new ApiError(`Cannot delete vehicle. It is assigned to ${linkedRoutes} route(s).`, 400);
  }

  await db.delete('vehicles', { id: req.params.id });
  return ApiResponse.success(res, null, 'Vehicle deleted successfully');
});

// ── Routes ───────────────────────────────────────────────────

exports.getRoutes = catchAsync(async (req, res) => {
  const { status, vehicle, search, sort = 'name' } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'r.school_id'));
  params.push(...schoolParams);

  if (status) {
    conditions.push(`r.status = $${params.length + 1}`);
    params.push(status);
  }
  if (vehicle) {
    conditions.push(`r.vehicle_id = $${params.length + 1}`);
    params.push(vehicle);
  }
  if (search) {
    const term = `%${escapeLike(search)}%`;
    conditions.push(
      `(r.name ILIKE $${params.length + 1} ESCAPE '\\' OR r.route_code ILIKE $${params.length + 2} ESCAPE '\\')`
    );
    params.push(term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, ROUTE_SORT_ALLOWLIST, 'r.name ASC');

  const query = `
    SELECT r.*, v.id as vehicle_id, v.vehicle_no, v.type, v.capacity, v.model, v.manufacturer, v.status as vehicle_status, v.driver_name
    FROM transport_routes r
    JOIN vehicles v ON r.vehicle_id = v.id
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [routes, total] = await Promise.all([
    db.raw(query, [...params, limit, skip]),
    db.raw(`SELECT COUNT(*)::text as count FROM transport_routes r ${where}`, params),
  ]);

  const routeObjects = routes.map((r) => ({
    ...mapRoute(r),
    vehicle: mapVehicle({ ...r, id: r.vehicle_id, status: r.vehicle_status }),
  }));

  const counts = await getActiveAllocationCounts(routeObjects.map((r) => r.id), req);
  const enriched = routeObjects.map((r) => ({
    ...r,
    activeAllocationCount: counts[r.id] || 0,
  }));

  const meta = getPaginationMeta(page, limit, parseInt(total[0].count, 10));
  return ApiResponse.paginated(res, enriched, meta, 'Routes retrieved successfully');
});

exports.getRoute = catchAsync(async (req, res) => {
  const route = await assertRouteExists(req.params.id, req);
  const activeCount = await db.count('student_transports', { route_id: route.id, status: 'active', ...getSchoolFilter(req) });
  return ApiResponse.success(
    res,
    { route: { ...route, activeAllocationCount: activeCount } },
    'Route retrieved successfully'
  );
});

exports.createRoute = catchAsync(async (req, res) => {
  const { routeCode, vehicle } = req.body;

  await assertVehicleExists(vehicle, req);

  const existing = await db.findOne('transport_routes', { route_code: routeCode, ...getSchoolFilter(req) });
  if (existing) {
    throw new ApiError('Route with this code already exists', 400);
  }

  const routeData = mapBody(req.body, routeFieldMap);
  routeData.vehicle_id = vehicle;
  routeData.school_id = req.user.school_id;

  const route = await db.insert('transport_routes', routeData);

  const stops = normalizeStops(req.body.stops);
  for (const stop of stops) {
    await db.insert('transport_route_stops', {
      route_id: route.id,
      ...mapBody(stop, stopFieldMap),
      school_id: req.user.school_id,
    });
  }

  const populated = await getRouteWithVehicleAndStops(route.id, req);
  return ApiResponse.success(res, { route: populated }, 'Route created successfully', 201);
});

exports.updateRoute = catchAsync(async (req, res) => {
  const route = await db.findOne('transport_routes', { id: req.params.id, ...getSchoolFilter(req) });
  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  const { routeCode, vehicle, stops } = req.body;
  if (vehicle) {
    await assertVehicleExists(vehicle, req);
  }
  if (routeCode && routeCode !== route.route_code) {
    const existing = await db.findOne('transport_routes', { route_code: routeCode, ...getSchoolFilter(req) });
    if (existing) {
      throw new ApiError('Route with this code already exists', 400);
    }
  }

  const payload = mapBody(req.body, routeFieldMap);
  let newStops;
  if (stops) {
    newStops = normalizeStops(stops);
  }

  await db.update('transport_routes', payload, { id: req.params.id });

  if (newStops) {
    await db.delete('transport_route_stops', { route_id: req.params.id });
    for (const stop of newStops) {
      await db.insert('transport_route_stops', {
        route_id: req.params.id,
        ...mapBody(stop, stopFieldMap),
        school_id: route.school_id,
      });
    }
  }

  const populated = await getRouteWithVehicleAndStops(req.params.id, req);
  return ApiResponse.success(res, { route: populated }, 'Route updated successfully');
});

exports.deleteRoute = catchAsync(async (req, res) => {
  const route = await db.findOne('transport_routes', { id: req.params.id, ...getSchoolFilter(req) });
  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  const activeAllocations = await db.count('student_transports', { route_id: req.params.id, status: 'active', ...getSchoolFilter(req) });
  if (activeAllocations > 0) {
    throw new ApiError(`Cannot delete route. ${activeAllocations} active student allocation(s) exist.`, 400);
  }

  await db.delete('transport_routes', { id: req.params.id });
  return ApiResponse.success(res, null, 'Route deleted successfully');
});

// ── Student Allocations ──────────────────────────────────────

exports.getAllocations = catchAsync(async (req, res) => {
  const { student, route, status, search, sort = '-createdAt' } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'st.school_id'));
  params.push(...schoolParams);

  if (student) {
    conditions.push(`st.student_id = $${params.length + 1}`);
    params.push(student);
  }
  if (route) {
    conditions.push(`st.route_id = $${params.length + 1}`);
    params.push(route);
  }
  if (status) {
    conditions.push(`st.status = $${params.length + 1}`);
    params.push(status);
  }
  if (search) {
    const studentIds = await resolveStudentIdsBySearch(search, req);
    if (studentIds.length === 0) {
      return ApiResponse.paginated(
        res,
        [],
        getPaginationMeta(page, limit, 0),
        'Student transport allocations retrieved successfully'
      );
    }
    conditions.push(`st.student_id = ANY($${params.length + 1}::uuid[])`);
    params.push(studentIds);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, ALLOCATION_SORT_ALLOWLIST, 'st.created_at DESC');

  const query = `
    SELECT
      st.id, st.student_id, st.route_id, st.pickup_stop, st.drop_stop, st.monthly_fee,
      st.effective_from, st.effective_to, st.status, st.created_at, st.updated_at,
      s.first_name, s.last_name, s.admission_no, s.roll_no, s.status as student_status,
      c.name as class_name, cs.name as section_name,
      r.name as route_name, r.route_code, r.monthly_fee as route_monthly_fee,
      v.id as vehicle_id, v.vehicle_no, v.type, v.capacity, v.model, v.manufacturer, v.status as vehicle_status, v.driver_name
    FROM student_transports st
    JOIN students s ON st.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN class_sections cs ON s.section_id = cs.id
    JOIN transport_routes r ON st.route_id = r.id
    JOIN vehicles v ON r.vehicle_id = v.id
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [allocations, total] = await Promise.all([
    db.raw(query, [...params, limit, skip]),
    db.raw(`SELECT COUNT(*)::text as count FROM student_transports st ${where}`, params),
  ]);

  const allocationObjects = allocations.map(mapAllocation);
  const meta = getPaginationMeta(page, limit, parseInt(total[0].count, 10));
  return ApiResponse.paginated(
    res,
    allocationObjects,
    meta,
    'Student transport allocations retrieved successfully'
  );
});

exports.getAllocation = catchAsync(async (req, res) => {
  const allocation = await getAllocationById(req.params.id, req);
  if (!allocation) {
    throw new ApiError('Allocation not found', 404);
  }
  return ApiResponse.success(
    res,
    { allocation },
    'Student transport allocation retrieved successfully'
  );
});

exports.createAllocation = catchAsync(async (req, res) => {
  const populated = await createAndPopulateAllocation(req.body, req);
  return ApiResponse.success(
    res,
    { allocation: populated },
    'Student transport allocation created successfully',
    201
  );
});

exports.updateAllocation = catchAsync(async (req, res) => {
  const allocation = await db.findOne('student_transports', { id: req.params.id, ...getSchoolFilter(req) });
  if (!allocation) {
    throw new ApiError('Allocation not found', 404);
  }

  const { route: routeId, pickupStop, dropStop, status, monthlyFee } = req.body;
  let route = await assertRouteExists(allocation.route_id, req);

  if (routeId) {
    route = await assertRouteExists(routeId, req);
    if (route.status !== 'active') {
      throw new ApiError('Route is not active', 400);
    }
    if (!route.vehicle || route.vehicle.status !== 'active') {
      throw new ApiError('Route does not have an active vehicle assigned', 400);
    }
  }

  if (pickupStop || dropStop) {
    const stops = route.stops || [];
    const stopNames = stops.map((s) => s.name);
    if (pickupStop && !stopNames.includes(pickupStop)) {
      throw new ApiError('Pickup stop does not exist on the route', 400);
    }
    if (dropStop && !stopNames.includes(dropStop)) {
      throw new ApiError('Drop stop does not exist on the route', 400);
    }
  }

  const willBeActive = status === 'active' || (!status && allocation.status === 'active');
  if (willBeActive && allocation.status !== 'active') {
    const existing = await db.findOne('student_transports', { student_id: allocation.student_id, status: 'active', ...getSchoolFilter(req) });
    if (existing) {
      throw new ApiError('Student already has an active transport allocation', 409);
    }
  }

  if (willBeActive && routeId && routeId !== allocation.route_id) {
    const allocated = await db.count('student_transports', { route_id: route.id, status: 'active', ...getSchoolFilter(req) });
    if (allocated >= route.vehicle.capacity) {
      throw new ApiError('Route vehicle capacity exceeded', 409);
    }
  }

  const payload = mapBody(req.body, allocationFieldMap);
  if (status === 'inactive' && !payload.effective_to) {
    payload.effective_to = new Date();
  }

  await db.update('student_transports', payload, { id: req.params.id });

  const updated = await getAllocationById(req.params.id, req);
  return ApiResponse.success(
    res,
    { allocation: updated },
    'Student transport allocation updated successfully'
  );
});

exports.deleteAllocation = catchAsync(async (req, res) => {
  const allocation = await db.findOne('student_transports', { id: req.params.id, ...getSchoolFilter(req) });
  if (!allocation) {
    throw new ApiError('Allocation not found', 404);
  }

  await db.update('student_transports', { status: 'inactive', effective_to: new Date() }, { id: req.params.id });
  return ApiResponse.success(res, null, 'Student transport allocation removed successfully');
});

// ── Route-level convenience actions ──────────────────────────

exports.assignStudent = catchAsync(async (req, res) => {
  const route = await assertRouteExists(req.params.id, req);
  const { studentId, pickupStop, dropStop, stopName, monthlyFee } = req.body;

  const finalPickup = pickupStop || stopName;
  const finalDrop = dropStop || stopName;

  if (!finalPickup || !finalDrop) {
    throw new ApiError('Pickup and drop stops are required', 400);
  }

  const populated = await createAndPopulateAllocation({
    student: studentId,
    route: route.id,
    pickupStop: finalPickup,
    dropStop: finalDrop,
    monthlyFee,
    effectiveFrom: new Date(),
    status: 'active',
  }, req);

  return ApiResponse.success(
    res,
    { allocation: populated },
    'Student assigned to route successfully',
    201
  );
});

exports.removeStudent = catchAsync(async (req, res) => {
  const route = await assertRouteExists(req.params.id, req);
  const { studentId } = req.body;

  const allocation = await db.findOne('student_transports', {
    student_id: studentId,
    route_id: route.id,
    status: 'active',
    ...getSchoolFilter(req),
  });

  if (!allocation) {
    throw new ApiError('Student is not actively assigned to this route', 404);
  }

  await db.update('student_transports', { status: 'inactive', effective_to: new Date() }, { id: allocation.id });
  return ApiResponse.success(res, null, 'Student removed from route successfully');
});
