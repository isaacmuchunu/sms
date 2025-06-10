const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { sendTemplatedEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const notificationService = require('../services/notificationService');
const { scopeBySchool } = require('../middleware/auth');

const userId = (user) => user?.id || user?._id?.toString();

const MEETING_SELECT = `
  m.id, m.school_id, m.title, m.description, m.type, m.scheduled_at, m.duration, m.location, m.meet_link,
  m.status, m.notes, m.reminder_sent, m.created_at, m.updated_at,
  m.student_id,
  s.first_name AS student_first_name, s.last_name AS student_last_name, s.admission_no AS student_admission_no,
  s.class_id AS student_class_id, s.section_id AS student_section_id,
  m.guardian_id,
  g.first_name AS guardian_first_name, g.last_name AS guardian_last_name, g.phone AS guardian_phone,
  g.email AS guardian_email, g.user_id AS guardian_user_id, g.relationship AS guardian_relationship,
  m.organizer_id,
  u.name AS organizer_name, u.email AS organizer_email, u.role AS organizer_role
`;

const MEETING_FROM = `
  meetings m
  LEFT JOIN students s ON m.student_id = s.id
  LEFT JOIN guardians g ON m.guardian_id = g.id
  LEFT JOIN users u ON m.organizer_id = u.id
`;

const formatMeeting = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  type: row.type,
  scheduledAt: row.scheduled_at,
  duration: row.duration,
  location: row.location,
  meetLink: row.meet_link,
  status: row.status,
  notes: row.notes,
  reminderSent: row.reminder_sent,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  student: row.student_id
    ? {
        id: row.student_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        admissionNo: row.student_admission_no,
        class: row.student_class_id,
        section: row.student_section_id,
      }
    : null,
  guardian: row.guardian_id
    ? {
        id: row.guardian_id,
        firstName: row.guardian_first_name,
        lastName: row.guardian_last_name,
        phone: row.guardian_phone,
        email: row.guardian_email,
        user: row.guardian_user_id,
        relationship: row.guardian_relationship,
      }
    : null,
  organizer: row.organizer_id
    ? {
        id: row.organizer_id,
        name: row.organizer_name,
        email: row.organizer_email,
        role: row.organizer_role,
      }
    : null,
});

const fetchMeetingById = async (id) => {
  const rows = await db.raw(
    `SELECT ${MEETING_SELECT} FROM ${MEETING_FROM} WHERE m.id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? formatMeeting(rows[0]) : null;
};

const canAccessMeeting = async (reqUser, meeting) => {
  const uid = userId(reqUser);
  if (['admin', 'super_admin', 'principal'].includes(reqUser.role)) return true;
  if (meeting.organizer?.id === uid || meeting.organizer_id === uid) return true;
  if (reqUser.role === 'teacher') {
    const studentId = meeting.student?.id || meeting.student_id;
    const student = await db.findOne('students', { id: studentId });
    if (student) {
      const teacher = await db.findOne('teachers', { user_id: uid });
      if (
        teacher &&
        teacher.class_teacher_class_id &&
        teacher.class_teacher_class_id === student.class_id &&
        teacher.class_teacher_section_id === student.section_id
      ) {
        return true;
      }
    }
  }
  if (reqUser.role === 'parent') {
    const guardian = await db.findOne('guardians', { user_id: uid });
    const guardianId = meeting.guardian?.id || meeting.guardian_id;
    if (guardian && guardianId === guardian.id) return true;
  }
  return false;
};

exports.getMeetings = catchAsync(async (req, res) => {
  const { status, upcoming } = req.query;
  const uid = userId(req.user);

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  const schoolScope = scopeBySchool(req, 0);
  if (schoolScope.clause !== '1=1') {
    conditions.push(`m.${schoolScope.clause}`);
  }
  params.push(...schoolScope.params);
  paramIdx = schoolScope.nextIndex;

  if (upcoming === 'true') {
    conditions.push(`m.scheduled_at >= NOW()`);
    conditions.push(`m.status = 'scheduled'`);
  } else if (status) {
    conditions.push(`m.status = $${paramIdx++}`);
    params.push(status);
  }

  // Scope by role
  if (req.user.role === 'parent') {
    const guardian = await db.findOne('guardians', { user_id: uid });
    if (!guardian) {
      return ApiResponse.success(res, { meetings: [] }, 'Meetings retrieved');
    }
    conditions.push(`m.guardian_id = $${paramIdx++}`);
    params.push(guardian.id);
  } else if (req.user.role === 'teacher') {
    const teacher = await db.findOne('teachers', { user_id: uid });
    if (teacher?.class_teacher_class_id && teacher?.class_teacher_section_id) {
      const studentScope = scopeBySchool(req, 2);
      const studentParams = [
        teacher.class_teacher_class_id,
        teacher.class_teacher_section_id,
      ];
      let studentWhere = `class_id = $1 AND section_id = $2`;
      if (studentScope.clause !== '1=1') {
        studentWhere += ` AND ${studentScope.clause}`;
        studentParams.push(...studentScope.params);
      }
      const students = await db.raw(
        `SELECT id FROM students WHERE ${studentWhere}`,
        studentParams
      );
      conditions.push(`m.student_id = ANY($${paramIdx++}::uuid[])`);
      params.push(students.map((s) => s.id));
    } else {
      conditions.push(`m.organizer_id = $${paramIdx++}`);
      params.push(uid);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT ${MEETING_SELECT} FROM ${MEETING_FROM} ${where} ORDER BY m.scheduled_at ASC`;
  const rows = await db.raw(query, params);
  const meetings = rows.map(formatMeeting);

  return ApiResponse.success(res, { meetings }, 'Meetings retrieved');
});

exports.getMeeting = catchAsync(async (req, res) => {
  const rows = await db.raw(
    `SELECT ${MEETING_SELECT} FROM ${MEETING_FROM} WHERE m.id = $1 LIMIT 1`,
    [req.params.id]
  );
  const row = rows[0];
  if (!row) throw new ApiError('Meeting not found', 404);

  if (req.user.role !== 'super_admin' && row.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const meeting = formatMeeting(row);
  const allowed = await canAccessMeeting(req.user, meeting);
  if (!allowed) throw new ApiError('Not authorized to view this meeting', 403);

  return ApiResponse.success(res, { meeting }, 'Meeting retrieved');
});

exports.createMeeting = catchAsync(async (req, res) => {
  const uid = userId(req.user);
  const {
    title,
    description,
    type,
    scheduledAt,
    duration,
    location,
    meetLink,
    student,
    guardian,
    notes,
  } = req.body;

  if (!title || !scheduledAt || !student || !guardian) {
    throw new ApiError('Title, scheduledAt, student and guardian are required', 400);
  }

  const [studentDoc, guardianDoc] = await Promise.all([
    db.findOne('students', { id: student }),
    db.findOne('guardians', { id: guardian }),
  ]);

  if (!studentDoc) throw new ApiError('Student not found', 404);
  if (!guardianDoc) throw new ApiError('Guardian not found', 404);

  if (
    req.user.role !== 'super_admin' &&
    (studentDoc.school_id !== req.user.school_id || guardianDoc.school_id !== req.user.school_id)
  ) {
    throw new ApiError('Access denied', 403);
  }

  const insertData = {
    title,
    scheduled_at: scheduledAt,
    student_id: student,
    guardian_id: guardian,
    organizer_id: uid,
    school_id: req.user.school_id,
  };

  if (description !== undefined) insertData.description = description;
  if (type !== undefined) insertData.type = type;
  if (duration !== undefined) insertData.duration = duration;
  if (location !== undefined) insertData.location = location;
  if (meetLink !== undefined) insertData.meet_link = meetLink;
  if (notes !== undefined) insertData.notes = notes;

  const meeting = await db.insert('meetings', insertData);
  const populated = await fetchMeetingById(meeting.id);

  // Notify guardian
  try {
    if (guardianDoc.email) {
      await sendTemplatedEmail(
        'meetingInvitation',
        guardianDoc.email,
        {
          guardianName: `${guardianDoc.first_name} ${guardianDoc.last_name}`,
          studentName: `${studentDoc.first_name} ${studentDoc.last_name}`,
          title,
          scheduledAt: new Date(scheduledAt).toLocaleString(),
          duration,
          location,
          meetLink,
        }
      );
    }
    if (guardianDoc.phone) {
      await sendSMS({
        to: guardianDoc.phone,
        message: `Meeting scheduled: ${title} on ${new Date(scheduledAt).toLocaleString()}. Location: ${location || meetLink || 'school office'}.`,
      });
    }
  } catch (err) {
    console.error('Failed to notify guardian about meeting:', err.message);
  }

  // Fire-and-forget in-app notification to student and guardian
  const meetingRecipientIds = [];
  if (studentDoc.user_id) meetingRecipientIds.push(studentDoc.user_id);
  if (guardianDoc.user_id) meetingRecipientIds.push(guardianDoc.user_id);
  if (meetingRecipientIds.length > 0) {
    notificationService.createBulkNotifications({
      recipientIds: meetingRecipientIds,
      senderId: uid,
      title: `Meeting scheduled: ${title}`,
      message: `A meeting "${title}" has been scheduled on ${new Date(scheduledAt).toLocaleString()}. Location: ${location || meetLink || 'school office'}.`,
      type: 'general',
      referenceModel: 'meetings',
      referenceId: meeting.id,
    }).catch((err) => console.error('Failed to create meeting notifications:', err.message));
  }

  return ApiResponse.success(res, { meeting: populated }, 'Meeting scheduled and guardian notified', 201);
});

exports.updateMeeting = catchAsync(async (req, res) => {
  const meeting = await db.findOne('meetings', { id: req.params.id });
  if (!meeting) throw new ApiError('Meeting not found', 404);

  if (req.user.role !== 'super_admin' && meeting.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const uid = userId(req.user);
  if (meeting.organizer_id !== uid && !['admin', 'super_admin'].includes(req.user.role)) {
    throw new ApiError('Not authorized to update this meeting', 403);
  }

  const allowedFields = ['title', 'description', 'type', 'scheduledAt', 'duration', 'location', 'meetLink', 'status', 'notes'];
  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      const dbField = field === 'scheduledAt' ? 'scheduled_at' : field === 'meetLink' ? 'meet_link' : field;
      updateData[dbField] = req.body[field];
    }
  });

  if (Object.keys(updateData).length > 0) {
    await db.update('meetings', updateData, { id: req.params.id });
  }

  const populated = await fetchMeetingById(req.params.id);
  return ApiResponse.success(res, { meeting: populated }, 'Meeting updated');
});

exports.deleteMeeting = catchAsync(async (req, res) => {
  const meeting = await db.findOne('meetings', { id: req.params.id });
  if (!meeting) throw new ApiError('Meeting not found', 404);

  if (req.user.role !== 'super_admin' && meeting.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const uid = userId(req.user);
  if (meeting.organizer_id !== uid && !['admin', 'super_admin'].includes(req.user.role)) {
    throw new ApiError('Not authorized to delete this meeting', 403);
  }

  await db.delete('meetings', { id: req.params.id });
  return ApiResponse.success(res, null, 'Meeting deleted');
});
