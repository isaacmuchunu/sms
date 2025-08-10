const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool, getSchoolFilter } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

// ── Helpers ────────────────────────────────────────────────

const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]';

const camelize = (obj) => {
  if (Array.isArray(obj)) return obj.map(camelize);
  if (!isPlainObject(obj)) return obj;
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    const newKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    res[newKey] = camelize(v);
  }
  return res;
};

const snakifyKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(snakifyKeys);
  if (!isPlainObject(obj)) return obj;
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    const newKey = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    res[newKey] = snakifyKeys(v);
  }
  return res;
};

const HOSTEL_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  name: '"name"',
  type: '"hostel_type"',
  status: '"status"',
};

const ROOM_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  roomNo: '"room_no"',
  floor: '"floor"',
  roomType: '"room_type"',
  capacity: '"capacity"',
  status: '"status"',
};

const ALLOCATION_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  allocationDate: '"allocation_date"',
  status: '"status"',
};

const VISITOR_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  entryTime: '"entry_time"',
  exitTime: '"exit_time"',
  status: '"status"',
};

const checkGenderCompatibility = (hostel, student) => {
  if (hostel.hostel_type === 'boys' && student.gender !== 'male') {
    return 'Boys hostel can only accommodate male students';
  }
  if (hostel.hostel_type === 'girls' && student.gender !== 'female') {
    return 'Girls hostel can only accommodate female students';
  }
  return null;
};

const generateBeds = (capacity) =>
  Array.from({ length: capacity }, (_, i) => ({ bedNo: String(i + 1) }));

const assignBed = (bedRows, bedNo, roomNo) => {
  if (bedNo) {
    const bed = bedRows.find((b) => b.bed_no === bedNo);
    if (!bed) throw new ApiError(`Bed ${bedNo} not found in room ${roomNo}`, 400);
    if (bed.occupied_by_id) throw new ApiError(`Bed ${bedNo} is already occupied`, 409);
    return bed;
  }
  const freeBed = bedRows.find((b) => !b.occupied_by_id);
  if (!freeBed) throw new ApiError(`No free bed available in room ${roomNo}`, 409);
  return freeBed;
};

const formatHostel = (row) => {
  const c = camelize(row);
  const {
    wardenId,
    wardenFirstName,
    wardenLastName,
    wardenEmployeeId,
    wardenPhone,
    ...rest
  } = c;
  return {
    ...rest,
    warden: wardenId
      ? {
          id: wardenId,
          firstName: wardenFirstName,
          lastName: wardenLastName,
          employeeId: wardenEmployeeId,
          phone: wardenPhone,
        }
      : null,
  };
};

const formatRoom = (row) => {
  const c = camelize(row);
  const { hostelId, hostelName, hostelType, ...rest } = c;
  return {
    ...rest,
    hostel: hostelId ? { id: hostelId, name: hostelName, type: hostelType } : null,
    vacancy: rest.capacity - (rest.occupied || 0),
  };
};

const formatAllocation = (row) => {
  const c = camelize(row);
  const {
    studentId,
    studentFirstName,
    studentLastName,
    studentAdmissionNo,
    studentGender,
    hostelId,
    hostelName,
    hostelType,
    roomId,
    roomRoomNo,
    roomFloor,
    roomRoomType,
    roomCapacity,
    roomOccupied,
    roomMonthlyFee,
    roomFacilities,
    roomStatus,
    roomHostelId,
    roomHostelName,
    roomHostelType,
    ...rest
  } = c;
  return {
    ...rest,
    student: studentId
      ? {
          id: studentId,
          firstName: studentFirstName,
          lastName: studentLastName,
          admissionNo: studentAdmissionNo,
          gender: studentGender,
        }
      : null,
    hostel: hostelId ? { id: hostelId, name: hostelName, type: hostelType } : null,
    room: roomId
      ? {
          id: roomId,
          roomNo: roomRoomNo,
          floor: roomFloor,
          roomType: roomRoomType,
          capacity: roomCapacity,
          occupied: roomOccupied,
          monthlyFee: roomMonthlyFee,
          facilities: roomFacilities,
          status: roomStatus,
          hostel: roomHostelId
            ? { id: roomHostelId, name: roomHostelName, type: roomHostelType }
            : null,
        }
      : null,
  };
};

const formatVisitorLog = (row) => {
  const c = camelize(row);
  const {
    studentId,
    studentFirstName,
    studentLastName,
    studentAdmissionNo,
    roomId,
    roomRoomNo,
    roomFloor,
    roomHostelId,
    roomHostelName,
    roomHostelType,
    ...rest
  } = c;
  return {
    ...rest,
    student: studentId
      ? {
          id: studentId,
          firstName: studentFirstName,
          lastName: studentLastName,
          admissionNo: studentAdmissionNo,
        }
      : null,
    room: roomId
      ? {
          id: roomId,
          roomNo: roomRoomNo,
          floor: roomFloor,
          hostel: roomHostelId
            ? { id: roomHostelId, name: roomHostelName, type: roomHostelType }
            : null,
        }
      : null,
  };
};

const hostelSelect = `
  SELECT h.*,
    t."id" AS warden_id,
    t."first_name" AS warden_first_name,
    t."last_name" AS warden_last_name,
    t."employee_id" AS warden_employee_id,
    t."phone" AS warden_phone
  FROM "hostels" h
  LEFT JOIN "teachers" t ON h."warden_id" = t."id"
`;

const roomSelect = `
  SELECT r.*,
    h."id" AS hostel_id,
    h."name" AS hostel_name,
    h."hostel_type" AS hostel_type
  FROM "hostel_rooms" r
  LEFT JOIN "hostels" h ON r."hostel_id" = h."id"
`;

const allocationSelect = `
  SELECT a.*,
    s."id" AS student_id,
    s."first_name" AS student_first_name,
    s."last_name" AS student_last_name,
    s."admission_no" AS student_admission_no,
    s."gender" AS student_gender,
    h."id" AS hostel_id,
    h."name" AS hostel_name,
    h."hostel_type" AS hostel_type,
    r."id" AS room_id,
    r."room_no" AS room_room_no,
    r."floor" AS room_floor,
    r."room_type" AS room_room_type,
    r."capacity" AS room_capacity,
    r."occupied" AS room_occupied,
    r."monthly_fee" AS room_monthly_fee,
    r."facilities" AS room_facilities,
    r."status" AS room_status,
    rh."id" AS room_hostel_id,
    rh."name" AS room_hostel_name,
    rh."hostel_type" AS room_hostel_type
  FROM "hostel_allocations" a
  LEFT JOIN "students" s ON a."student_id" = s."id"
  LEFT JOIN "hostels" h ON a."hostel_id" = h."id"
  LEFT JOIN "hostel_rooms" r ON a."room_id" = r."id"
  LEFT JOIN "hostels" rh ON r."hostel_id" = rh."id"
`;

const visitorSelect = `
  SELECT v.*,
    s."id" AS student_id,
    s."first_name" AS student_first_name,
    s."last_name" AS student_last_name,
    s."admission_no" AS student_admission_no,
    r."id" AS room_id,
    r."room_no" AS room_room_no,
    r."floor" AS room_floor,
    rh."id" AS room_hostel_id,
    rh."name" AS room_hostel_name,
    rh."hostel_type" AS room_hostel_type
  FROM "hostel_visitors" v
  LEFT JOIN "students" s ON v."student_id" = s."id"
  LEFT JOIN "hostel_rooms" r ON v."room_id" = r."id"
  LEFT JOIN "hostels" rh ON r."hostel_id" = rh."id"
`;

const fetchBedsForRoom = async (roomId, schoolId) => {
  const rows = await db.raw(
    `SELECT b.*,
      s."id" AS student_id,
      s."first_name" AS student_first_name,
      s."last_name" AS student_last_name,
      s."admission_no" AS student_admission_no,
      s."gender" AS student_gender
     FROM "hostel_room_beds" b
     LEFT JOIN "students" s ON b."occupied_by_id" = s."id"
     WHERE b."hostel_room_id" = $1 AND b."school_id" = $2
     ORDER BY b."bed_no"`,
    [roomId, schoolId]
  );
  return rows.map((b) => {
    const c = camelize(b);
    return {
      bedNo: c.bedNo,
      occupiedBy: c.studentId
        ? {
            id: c.studentId,
            firstName: c.studentFirstName,
            lastName: c.studentLastName,
            admissionNo: c.studentAdmissionNo,
            gender: c.studentGender,
          }
        : null,
    };
  });
};

// ── Hostels ─────────────────────────────────────────────────

exports.getHostels = catchAsync(async (req, res) => {
  const { search, type, status, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const values = [];

  const { clause, params: schoolParams } = scopeBySchool(req, values.length);
  conditions.push(clause.replace('school_id', 'h."school_id"'));
  values.push(...schoolParams);

  if (type) {
    values.push(type);
    conditions.push(`h."hostel_type" = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`h."status" = $${values.length}`);
  }
  if (search && search.trim()) {
    const term = search.trim();
    conditions.push(
      `(h."name" ILIKE $${values.length + 1} OR h."address" ILIKE $${values.length + 2})`
    );
    values.push(`%${term}%`, `%${term}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, HOSTEL_SORT_ALLOWLIST, '"created_at" DESC');

  const hostels = await db.raw(
    `${hostelSelect}
     ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${skip}`,
    values
  );

  const countResult = await db.raw(
    `SELECT COUNT(*) AS count FROM "hostels" h ${where}`,
    values
  );
  const total = parseInt(countResult[0].count, 10);

  return ApiResponse.paginated(
    res,
    hostels.map(formatHostel),
    getPaginationMeta(page, limit, total),
    'Hostels retrieved successfully'
  );
});

exports.getHostel = catchAsync(async (req, res) => {
  const { clause, params } = scopeBySchool(req, 0);
  const rows = await db.raw(
    `${hostelSelect} WHERE ${clause.replace('school_id', 'h."school_id"')} AND h."id" = $${params.length + 1}`,
    [...params, req.params.id]
  );
  if (!rows.length) throw new ApiError('Hostel not found', 404);

  const hostel = formatHostel(rows[0]);

  const summary = await db.raw(
    `SELECT COUNT(*) AS total_rooms,
      COALESCE(SUM("capacity"), 0) AS total_beds,
      COALESCE(SUM("occupied"), 0) AS occupied_beds
     FROM "hostel_rooms"
     WHERE "school_id" = $1 AND "hostel_id" = $2`,
    [hostel.schoolId, req.params.id]
  );

  const occupancy = {
    totalRooms: parseInt(summary[0].total_rooms, 10),
    totalBeds: parseInt(summary[0].total_beds, 10),
    occupiedBeds: parseInt(summary[0].occupied_beds, 10),
  };

  return ApiResponse.success(res, { hostel, occupancy }, 'Hostel retrieved successfully');
});

exports.createHostel = catchAsync(async (req, res) => {
  const { name, type, address, warden, phone, status } = req.body;

  const existing = await db.findOne('hostels', { name: name.trim(), ...getSchoolFilter(req) });
  if (existing) throw new ApiError('Hostel with this name already exists', 409);

  const data = { name: name.trim(), hostel_type: type, school_id: req.user.school_id };
  if (address !== undefined) data.address = address;
  if (warden !== undefined) data.warden_id = warden;
  if (phone !== undefined) data.phone = phone;
  if (status !== undefined) data.status = status;

  const inserted = await db.insert('hostels', data);

  const rows = await db.raw(`${hostelSelect} WHERE h."school_id" = $1 AND h."id" = $2`, [req.user.school_id, inserted.id]);

  return ApiResponse.success(
    res,
    { hostel: formatHostel(rows[0]) },
    'Hostel created successfully',
    201
  );
});

exports.updateHostel = catchAsync(async (req, res) => {
  const existing = await db.findOne('hostels', { id: req.params.id, ...getSchoolFilter(req) });
  if (!existing) throw new ApiError('Hostel not found', 404);

  const data = {};
  if (req.body.name !== undefined) data.name = req.body.name.trim();
  if (req.body.type !== undefined) data.hostel_type = req.body.type;
  if (req.body.address !== undefined) data.address = req.body.address;
  if (req.body.warden !== undefined) data.warden_id = req.body.warden;
  if (req.body.phone !== undefined) data.phone = req.body.phone;
  if (req.body.status !== undefined) data.status = req.body.status;

  await db.update('hostels', data, { id: req.params.id });

  const rows = await db.raw(`${hostelSelect} WHERE h."school_id" = $1 AND h."id" = $2`, [req.user.school_id, req.params.id]);

  return ApiResponse.success(res, { hostel: formatHostel(rows[0]) }, 'Hostel updated successfully');
});

exports.deleteHostel = catchAsync(async (req, res) => {
  const hostel = await db.findOne('hostels', { id: req.params.id, ...getSchoolFilter(req) });
  if (!hostel) throw new ApiError('Hostel not found', 404);

  const roomsCount = await db.count('hostel_rooms', { hostel_id: req.params.id, ...getSchoolFilter(req) });
  if (roomsCount > 0) {
    throw new ApiError(
      `Cannot delete hostel. ${roomsCount} room(s) exist. Remove them first.`,
      400
    );
  }

  await db.delete('hostels', { id: req.params.id });
  return ApiResponse.success(res, null, 'Hostel deleted successfully');
});

// ── Rooms ───────────────────────────────────────────────────

exports.getRooms = catchAsync(async (req, res) => {
  const { hostel, roomType, status, floor, search, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const values = [];

  const { clause, params: schoolParams } = scopeBySchool(req, values.length);
  conditions.push(clause.replace('school_id', 'r."school_id"'));
  values.push(...schoolParams);

  if (hostel) {
    values.push(hostel);
    conditions.push(`r."hostel_id" = $${values.length}`);
  }
  if (roomType) {
    values.push(roomType);
    conditions.push(`r."room_type" = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`r."status" = $${values.length}`);
  }
  if (floor) {
    values.push(floor);
    conditions.push(`r."floor" = $${values.length}`);
  }
  if (search && search.trim()) {
    const term = search.trim();
    conditions.push(
      `(r."room_no" ILIKE $${values.length + 1} OR r."floor" ILIKE $${values.length + 2})`
    );
    values.push(`%${term}%`, `%${term}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, ROOM_SORT_ALLOWLIST, '"created_at" DESC');

  const rooms = await db.raw(
    `${roomSelect}
     ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${skip}`,
    values
  );

  const countResult = await db.raw(
    `SELECT COUNT(*) AS count FROM "hostel_rooms" r ${where}`,
    values
  );
  const total = parseInt(countResult[0].count, 10);

  return ApiResponse.paginated(
    res,
    rooms.map(formatRoom),
    getPaginationMeta(page, limit, total),
    'Rooms retrieved successfully'
  );
});

exports.getRoom = catchAsync(async (req, res) => {
  const { clause, params } = scopeBySchool(req, 0);
  const rows = await db.raw(
    `${roomSelect} WHERE ${clause.replace('school_id', 'r."school_id"')} AND r."id" = $${params.length + 1}`,
    [...params, req.params.id]
  );
  if (!rows.length) throw new ApiError('Room not found', 404);

  const room = formatRoom(rows[0]);
  room.beds = await fetchBedsForRoom(req.params.id, req.user.school_id);

  return ApiResponse.success(res, { room }, 'Room retrieved successfully');
});

exports.createRoom = catchAsync(async (req, res) => {
  const {
    hostel,
    roomNo,
    floor,
    roomType,
    capacity,
    monthlyFee,
    facilities,
    beds,
    status,
  } = req.body;

  const hostelDoc = await db.findOne('hostels', { id: hostel, ...getSchoolFilter(req) });
  if (!hostelDoc) throw new ApiError('Hostel not found', 404);

  const existing = await db.findOne('hostel_rooms', {
    hostel_id: hostel,
    room_no: roomNo.trim(),
    ...getSchoolFilter(req),
  });
  if (existing) throw new ApiError('Room number already exists in this hostel', 409);

  const roomData = {
    hostel_id: hostel,
    room_no: roomNo.trim(),
    capacity,
    occupied: 0,
    school_id: req.user.school_id,
  };
  if (floor !== undefined) roomData.floor = floor;
  if (roomType !== undefined) roomData.room_type = roomType;
  if (monthlyFee !== undefined) roomData.monthly_fee = monthlyFee;
  if (facilities !== undefined) roomData.facilities = facilities;
  if (status !== undefined) roomData.status = status;

  const room = await db.insert('hostel_rooms', roomData);

  const bedList = beds && beds.length > 0 ? beds : generateBeds(capacity);
  await Promise.all(
    bedList.map((bed) =>
      db.insert('hostel_room_beds', {
        hostel_room_id: room.id,
        bed_no: bed.bedNo,
        occupied_by_id: null,
        school_id: req.user.school_id,
      })
    )
  );

  await db.raw(
    `UPDATE "hostels" SET "total_rooms" = "total_rooms" + 1, "total_beds" = "total_beds" + $1 WHERE "id" = $2`,
    [capacity, hostel]
  );

  const rows = await db.raw(`${roomSelect} WHERE r."school_id" = $1 AND r."id" = $2`, [req.user.school_id, room.id]);

  return ApiResponse.success(
    res,
    { room: formatRoom(rows[0]) },
    'Room created successfully',
    201
  );
});

exports.updateRoom = catchAsync(async (req, res) => {
  const room = await db.findOne('hostel_rooms', { id: req.params.id, ...getSchoolFilter(req) });
  if (!room) throw new ApiError('Room not found', 404);

  const {
    roomNo,
    floor,
    roomType,
    capacity,
    monthlyFee,
    facilities,
    beds,
    status,
  } = req.body;

  const updateData = {};
  if (roomNo !== undefined) updateData.room_no = roomNo.trim();
  if (floor !== undefined) updateData.floor = floor;
  if (roomType !== undefined) updateData.room_type = roomType;
  if (monthlyFee !== undefined) updateData.monthly_fee = monthlyFee;
  if (facilities !== undefined) updateData.facilities = facilities;

  let capacityDiff = 0;
  if (capacity !== undefined && capacity !== room.capacity) {
    if (capacity < room.occupied) {
      throw new ApiError('New capacity cannot be less than current occupancy', 400);
    }
    capacityDiff = capacity - room.capacity;
    updateData.capacity = capacity;

    if (beds && beds.length > 0) {
      await db.delete('hostel_room_beds', { hostel_room_id: req.params.id });
      await Promise.all(
        beds.map((bed) =>
          db.insert('hostel_room_beds', {
            hostel_room_id: req.params.id,
            bed_no: bed.bedNo,
            occupied_by_id: null,
            school_id: room.school_id,
          })
        )
      );
    } else if (capacity > room.capacity) {
      const countResult = await db.raw(
        `SELECT COUNT(*) AS count FROM "hostel_room_beds" WHERE "hostel_room_id" = $1`,
        [req.params.id]
      );
      const existingCount = parseInt(countResult[0].count, 10);
      if (capacity > existingCount) {
        const newBeds = [];
        for (let i = existingCount + 1; i <= capacity; i += 1) {
          newBeds.push({
            hostel_room_id: req.params.id,
            bed_no: String(i),
            occupied_by_id: null,
            school_id: room.school_id,
          });
        }
        await Promise.all(newBeds.map((b) => db.insert('hostel_room_beds', b)));
      }
    }

    await db.raw(
      `UPDATE "hostels" SET "total_beds" = "total_beds" + $1 WHERE "id" = $2`,
      [capacityDiff, room.hostel_id]
    );
  }

  if (status !== undefined) updateData.status = status;

  const newCapacity = updateData.capacity !== undefined ? updateData.capacity : room.capacity;
  if (updateData.status !== 'under_maintenance') {
    updateData.status = room.occupied >= newCapacity ? 'full' : 'available';
  }

  await db.update('hostel_rooms', updateData, { id: req.params.id });

  const rows = await db.raw(`${roomSelect} WHERE r."school_id" = $1 AND r."id" = $2`, [req.user.school_id, req.params.id]);
  const resultRoom = formatRoom(rows[0]);
  resultRoom.beds = await fetchBedsForRoom(req.params.id, req.user.school_id);

  return ApiResponse.success(
    res,
    { room: resultRoom },
    'Room updated successfully'
  );
});

exports.deleteRoom = catchAsync(async (req, res) => {
  const room = await db.findOne('hostel_rooms', { id: req.params.id, ...getSchoolFilter(req) });
  if (!room) throw new ApiError('Room not found', 404);

  const activeAllocations = await db.count('hostel_allocations', {
    room_id: req.params.id,
    status: 'active',
    ...getSchoolFilter(req),
  });
  if (activeAllocations > 0) {
    throw new ApiError('Cannot delete room with active allocations', 400);
  }

  await db.delete('hostel_rooms', { id: req.params.id });

  await db.raw(
    `UPDATE "hostels" SET "total_rooms" = "total_rooms" - 1, "total_beds" = "total_beds" - $1, "occupied_beds" = "occupied_beds" - $2 WHERE "id" = $3`,
    [room.capacity, room.occupied, room.hostel_id]
  );

  return ApiResponse.success(res, null, 'Room deleted successfully');
});

// ── Allocations ─────────────────────────────────────────────

exports.getAllocations = catchAsync(async (req, res) => {
  const { hostel, room, student, status, startDate, endDate, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const values = [];

  const { clause, params: schoolParams } = scopeBySchool(req, values.length);
  conditions.push(clause.replace('school_id', 'a."school_id"'));
  values.push(...schoolParams);

  if (hostel) {
    values.push(hostel);
    conditions.push(`a."hostel_id" = $${values.length}`);
  }
  if (room) {
    values.push(room);
    conditions.push(`a."room_id" = $${values.length}`);
  }
  if (student) {
    values.push(student);
    conditions.push(`a."student_id" = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`a."status" = $${values.length}`);
  }
  if (startDate && endDate) {
    values.push(new Date(startDate), new Date(endDate));
    conditions.push(
      `a."allocation_date" BETWEEN $${values.length - 1} AND $${values.length}`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, ALLOCATION_SORT_ALLOWLIST, '"created_at" DESC');

  const allocations = await db.raw(
    `${allocationSelect}
     ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${skip}`,
    values
  );

  const countResult = await db.raw(
    `SELECT COUNT(*) AS count FROM "hostel_allocations" a ${where}`,
    values
  );
  const total = parseInt(countResult[0].count, 10);

  return ApiResponse.paginated(
    res,
    allocations.map(formatAllocation),
    getPaginationMeta(page, limit, total),
    'Allocations retrieved successfully'
  );
});

exports.getAllocation = catchAsync(async (req, res) => {
  const { clause, params } = scopeBySchool(req, 0);
  const rows = await db.raw(
    `${allocationSelect} WHERE ${clause.replace('school_id', 'a."school_id"')} AND a."id" = $${params.length + 1}`,
    [...params, req.params.id]
  );
  if (!rows.length) throw new ApiError('Allocation not found', 404);

  return ApiResponse.success(
    res,
    { allocation: formatAllocation(rows[0]) },
    'Allocation retrieved successfully'
  );
});

exports.createAllocation = catchAsync(async (req, res) => {
  const { student, hostel, room, bedNo, allocationDate, monthlyFee } = req.body;

  const [studentDoc, hostelDoc, roomDoc] = await Promise.all([
    db.findOne('students', { id: student, ...getSchoolFilter(req) }),
    db.findOne('hostels', { id: hostel, ...getSchoolFilter(req) }),
    db.findOne('hostel_rooms', { id: room, ...getSchoolFilter(req) }),
  ]);

  if (!studentDoc) throw new ApiError('Student not found', 404);
  if (!hostelDoc) throw new ApiError('Hostel not found', 404);
  if (!roomDoc) throw new ApiError('Room not found', 404);
  if (roomDoc.hostel_id !== hostel) {
    throw new ApiError('Room does not belong to the selected hostel', 400);
  }

  const genderError = checkGenderCompatibility(hostelDoc, studentDoc);
  if (genderError) throw new ApiError(genderError, 409);

  const existingAllocation = await db.findOne('hostel_allocations', {
    student_id: student,
    status: 'active',
    ...getSchoolFilter(req),
  });
  if (existingAllocation) {
    throw new ApiError('Student already has an active hostel allocation', 409);
  }

  if (roomDoc.status === 'under_maintenance') {
    throw new ApiError('Room is under maintenance', 400);
  }
  if (roomDoc.occupied >= roomDoc.capacity) {
    throw new ApiError('Room is at full capacity', 409);
  }

  const bedRows = await db.raw(
    `SELECT * FROM "hostel_room_beds" WHERE "hostel_room_id" = $1 AND "school_id" = $2 ORDER BY "bed_no"`,
    [room, req.user.school_id]
  );
  const selectedBed = assignBed(bedRows, bedNo, roomDoc.room_no);

  const fee = monthlyFee !== undefined ? monthlyFee : roomDoc.monthly_fee;

  const allocation = await db.insert('hostel_allocations', {
    student_id: student,
    hostel_id: hostel,
    room_id: room,
    bed_no: selectedBed.bed_no,
    allocation_date: allocationDate || new Date(),
    monthly_fee: fee,
    status: 'active',
    school_id: req.user.school_id,
  });

  await db.update(
    'hostel_room_beds',
    { occupied_by_id: student },
    { id: selectedBed.id }
  );

  await db.raw(
    `UPDATE "hostel_rooms" SET "occupied" = "occupied" + 1,
      "status" = CASE WHEN "occupied" + 1 >= "capacity" THEN 'full' ELSE 'available' END
     WHERE "id" = $1`,
    [room]
  );

  await db.raw(
    `UPDATE "hostels" SET "occupied_beds" = "occupied_beds" + 1 WHERE "id" = $1`,
    [hostel]
  );

  // NOTE: schema.sql does not include denormalized hostel columns on students,
  // so the previous Student.hostel update is omitted.

  const rows = await db.raw(`${allocationSelect} WHERE a."school_id" = $1 AND a."id" = $2`, [req.user.school_id, allocation.id]);

  return ApiResponse.success(
    res,
    { allocation: formatAllocation(rows[0]) },
    'Student allocated to room successfully',
    201
  );
});

exports.updateAllocation = catchAsync(async (req, res) => {
  const allocation = await db.findOne('hostel_allocations', { id: req.params.id, ...getSchoolFilter(req) });
  if (!allocation) throw new ApiError('Allocation not found', 404);

  const { bedNo, allocationDate, deallocationDate, monthlyFee, status } = req.body;
  const oldStatus = allocation.status;

  const updateData = {};
  if (bedNo !== undefined) updateData.bed_no = bedNo;
  if (allocationDate !== undefined) updateData.allocation_date = allocationDate;
  if (deallocationDate !== undefined) updateData.deallocation_date = deallocationDate;
  if (monthlyFee !== undefined) updateData.monthly_fee = monthlyFee;
  if (status !== undefined) updateData.status = status;

  if (status && status !== oldStatus) {
    const room = await db.findOne('hostel_rooms', { id: allocation.room_id, ...getSchoolFilter(req) });

    if (oldStatus === 'active' && status === 'inactive') {
      if (room) {
        await db.raw(
          `UPDATE "hostel_room_beds" SET "occupied_by_id" = NULL WHERE "hostel_room_id" = $1 AND "bed_no" = $2`,
          [room.id, allocation.bed_no]
        );
        await db.raw(
          `UPDATE "hostel_rooms" SET "occupied" = GREATEST("occupied" - 1, 0),
            "status" = CASE WHEN GREATEST("occupied" - 1, 0) >= "capacity" THEN 'full' ELSE 'available' END
           WHERE "id" = $1`,
          [room.id]
        );
      }
      updateData.deallocation_date = deallocationDate || new Date();
      await db.raw(
        `UPDATE "hostels" SET "occupied_beds" = GREATEST("occupied_beds" - 1, 0) WHERE "id" = $1`,
        [allocation.hostel_id]
      );
      // NOTE: schema.sql does not include denormalized hostel columns on students.
    }

    if (oldStatus === 'inactive' && status === 'active') {
      const existingActive = await db.findOne('hostel_allocations', {
        student_id: allocation.student_id,
        status: 'active',
        ...getSchoolFilter(req),
      });
      if (existingActive && existingActive.id !== allocation.id) {
        throw new ApiError('Student already has another active allocation', 409);
      }

      if (!room) throw new ApiError('Room not found', 404);
      if (room.status === 'under_maintenance') throw new ApiError('Room is under maintenance', 400);
      if (room.occupied >= room.capacity) throw new ApiError('Room is at full capacity', 409);

      const bedRows = await db.raw(
        `SELECT * FROM "hostel_room_beds" WHERE "hostel_room_id" = $1 AND "school_id" = $2 ORDER BY "bed_no"`,
        [room.id, req.user.school_id]
      );
      const selectedBed = assignBed(bedRows, allocation.bed_no, room.room_no);

      await db.update(
        'hostel_room_beds',
        { occupied_by_id: allocation.student_id },
        { id: selectedBed.id }
      );

      await db.raw(
        `UPDATE "hostel_rooms" SET "occupied" = "occupied" + 1,
          "status" = CASE WHEN "occupied" + 1 >= "capacity" THEN 'full' ELSE 'available' END
         WHERE "id" = $1`,
        [room.id]
      );

      updateData.bed_no = selectedBed.bed_no;
      updateData.deallocation_date = null;

      await db.raw(
        `UPDATE "hostels" SET "occupied_beds" = "occupied_beds" + 1 WHERE "id" = $1`,
        [allocation.hostel_id]
      );
      // NOTE: schema.sql does not include denormalized hostel columns on students.
    }
  }

  await db.update('hostel_allocations', updateData, { id: req.params.id });

  const rows = await db.raw(`${allocationSelect} WHERE a."school_id" = $1 AND a."id" = $2`, [req.user.school_id, req.params.id]);

  return ApiResponse.success(
    res,
    { allocation: formatAllocation(rows[0]) },
    'Allocation updated successfully'
  );
});

exports.allocateRoom = catchAsync(async (req, res) => {
  const room = await db.findOne('hostel_rooms', { id: req.params.id, ...getSchoolFilter(req) });
  if (!room) throw new ApiError('Room not found', 404);

  const { studentId, bedNo, allocationDate, monthlyFee } = req.body;

  req.body = {
    student: studentId,
    hostel: room.hostel_id,
    room: req.params.id,
    bedNo,
    allocationDate,
    monthlyFee,
  };

  return exports.createAllocation(req, res);
});

const releaseAllocation = async (allocation) => {
  const room = await db.findOne('hostel_rooms', { id: allocation.room_id });
  if (room) {
    await db.raw(
      `UPDATE "hostel_room_beds" SET "occupied_by_id" = NULL WHERE "hostel_room_id" = $1 AND "bed_no" = $2`,
      [room.id, allocation.bed_no]
    );
    await db.raw(
      `UPDATE "hostel_rooms" SET "occupied" = GREATEST("occupied" - 1, 0),
        "status" = CASE WHEN GREATEST("occupied" - 1, 0) >= "capacity" THEN 'full' ELSE 'available' END
       WHERE "id" = $1`,
      [room.id]
    );
  }

  await db.raw(
    `UPDATE "hostels" SET "occupied_beds" = GREATEST("occupied_beds" - 1, 0) WHERE "id" = $1`,
    [allocation.hostel_id]
  );

  await db.update(
    'hostel_allocations',
    { status: 'inactive', deallocation_date: new Date() },
    { id: allocation.id }
  );
  // NOTE: schema.sql does not include denormalized hostel columns on students.
};

exports.vacateRoom = catchAsync(async (req, res) => {
  const { studentId } = req.body;

  const allocation = await db.findOne('hostel_allocations', {
    room_id: req.params.id,
    student_id: studentId,
    status: 'active',
    ...getSchoolFilter(req),
  });

  if (!allocation) {
    throw new ApiError('Active allocation not found for this student and room', 404);
  }

  await releaseAllocation(allocation);

  return ApiResponse.success(res, null, 'Student vacated from room successfully');
});

exports.vacateAllocation = catchAsync(async (req, res) => {
  const allocation = await db.findOne('hostel_allocations', { id: req.params.id, ...getSchoolFilter(req) });
  if (!allocation) throw new ApiError('Allocation not found', 404);
  if (allocation.status !== 'active') throw new ApiError('Allocation is already inactive', 400);

  await releaseAllocation(allocation);
  return ApiResponse.success(res, null, 'Allocation vacated successfully');
});

// ── Visitor Logs ────────────────────────────────────────────

exports.getVisitorLogs = catchAsync(async (req, res) => {
  const { student, room, status, approvalStatus, startDate, endDate, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const values = [];

  const { clause, params: schoolParams } = scopeBySchool(req, values.length);
  conditions.push(clause.replace('school_id', 'v."school_id"'));
  values.push(...schoolParams);

  if (student) {
    values.push(student);
    conditions.push(`v."student_id" = $${values.length}`);
  }
  if (room) {
    values.push(room);
    conditions.push(`v."room_id" = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`v."status" = $${values.length}`);
  }
  if (approvalStatus) {
    values.push(approvalStatus);
    conditions.push(`v."approval_status" = $${values.length}`);
  }
  if (startDate && endDate) {
    values.push(new Date(startDate), new Date(endDate));
    conditions.push(
      `v."entry_time" BETWEEN $${values.length - 1} AND $${values.length}`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, VISITOR_SORT_ALLOWLIST, '"created_at" DESC');

  const logs = await db.raw(
    `${visitorSelect}
     ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${skip}`,
    values
  );

  const countResult = await db.raw(
    `SELECT COUNT(*) AS count FROM "hostel_visitors" v ${where}`,
    values
  );
  const total = parseInt(countResult[0].count, 10);

  return ApiResponse.paginated(
    res,
    logs.map(formatVisitorLog),
    getPaginationMeta(page, limit, total),
    'Visitor logs retrieved successfully'
  );
});

exports.getVisitorLog = catchAsync(async (req, res) => {
  const { clause, params } = scopeBySchool(req, 0);
  const rows = await db.raw(
    `${visitorSelect} WHERE ${clause.replace('school_id', 'v."school_id"')} AND v."id" = $${params.length + 1}`,
    [...params, req.params.id]
  );
  if (!rows.length) throw new ApiError('Visitor log not found', 404);

  return ApiResponse.success(
    res,
    { log: formatVisitorLog(rows[0]) },
    'Visitor log retrieved successfully'
  );
});

exports.addVisitor = catchAsync(async (req, res) => {
  const visitorData = snakifyKeys({ ...req.body, checkedInBy: req.user.id });
  visitorData.school_id = req.user.school_id;
  const log = await db.insert('hostel_visitors', visitorData);

  const rows = await db.raw(`${visitorSelect} WHERE v."school_id" = $1 AND v."id" = $2`, [req.user.school_id, log.id]);

  return ApiResponse.success(
    res,
    { log: formatVisitorLog(rows[0]) },
    'Visitor log created successfully',
    201
  );
});

exports.updateVisitor = catchAsync(async (req, res) => {
  const log = await db.findOne('hostel_visitors', { id: req.params.id, ...getSchoolFilter(req) });
  if (!log) throw new ApiError('Visitor log not found', 404);

  const allowedFields = [
    'visitorName',
    'visitorPhone',
    'relation',
    'purpose',
    'idProofType',
    'idProofNumber',
    'entryTime',
    'exitTime',
    'approvalStatus',
    'remarks',
  ];

  const data = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  });

  if (Object.keys(data).length) {
    await db.update('hostel_visitors', snakifyKeys(data), { id: req.params.id });
  }

  const rows = await db.raw(`${visitorSelect} WHERE v."school_id" = $1 AND v."id" = $2`, [req.user.school_id, req.params.id]);

  return ApiResponse.success(
    res,
    { log: formatVisitorLog(rows[0]) },
    'Visitor log updated successfully'
  );
});

exports.approveVisitor = catchAsync(async (req, res) => {
  const { approvalStatus, remarks } = req.body;
  const log = await db.findOne('hostel_visitors', { id: req.params.id, ...getSchoolFilter(req) });
  if (!log) throw new ApiError('Visitor log not found', 404);

  const data = { approval_status: approvalStatus };
  if (remarks !== undefined) data.remarks = remarks;

  await db.update('hostel_visitors', data, { id: req.params.id });

  const rows = await db.raw(`${visitorSelect} WHERE v."school_id" = $1 AND v."id" = $2`, [req.user.school_id, req.params.id]);

  return ApiResponse.success(
    res,
    { log: formatVisitorLog(rows[0]) },
    `Visitor ${approvalStatus} successfully`
  );
});

exports.checkoutVisitor = catchAsync(async (req, res) => {
  const log = await db.findOne('hostel_visitors', { id: req.params.id, ...getSchoolFilter(req) });
  if (!log) throw new ApiError('Visitor log not found', 404);
  if (log.status === 'checked_out') throw new ApiError('Visitor is already checked out', 400);

  await db.update(
    'hostel_visitors',
    {
      exit_time: req.body.exitTime || new Date(),
      status: 'checked_out',
      checked_out_by: req.user.id,
    },
    { id: req.params.id }
  );

  const rows = await db.raw(`${visitorSelect} WHERE v."school_id" = $1 AND v."id" = $2`, [req.user.school_id, req.params.id]);

  return ApiResponse.success(
    res,
    { log: formatVisitorLog(rows[0]) },
    'Visitor checked out successfully'
  );
});
