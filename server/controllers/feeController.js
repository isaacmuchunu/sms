const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { createDocument, drawHeader, drawFooter, drawTable, drawInfoRow } = require('../utils/pdfHelpers');
const { sendTemplatedEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const notificationService = require('../services/notificationService');
const { scopeBySchool, getSchoolFilter } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const INVOICE_STATUSES = ['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled'];

const FEE_HEAD_SORT_ALLOWLIST = {
  name: '"name"',
  code: '"code"',
  type: '"type"',
  frequency: '"frequency"',
  status: '"status"',
  createdAt: '"created_at"',
  updatedAt: '"updated_at"',
};

const FEE_STRUCTURE_SORT_ALLOWLIST = {
  name: '"name"',
  category: '"category"',
  status: '"status"',
  createdAt: '"created_at"',
  updatedAt: '"updated_at"',
};

const INVOICE_SORT_ALLOWLIST = {
  invoiceNo: '"invoice_no"',
  status: '"status"',
  dueDate: '"due_date"',
  createdAt: '"created_at"',
  updatedAt: '"updated_at"',
};

const PAYMENT_SORT_ALLOWLIST = {
  paidDate: '"paid_date"',
  amount: '"amount"',
  paymentMode: '"payment_mode"',
  status: '"status"',
  createdAt: '"created_at"',
  updatedAt: '"updated_at"',
};

const CONCESSION_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  updatedAt: '"updated_at"',
};

function parseSort(sort, allowlist, defaultSort) {
  return buildOrderBy(sort, undefined, allowlist, defaultSort);
}

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanUndefined(obj) {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined) delete result[key];
  });
  return result;
}

const verifySchoolAccess = (req, resource) => {
  if (req.user.role === 'super_admin') return;
  if (!resource || resource.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }
};

/**
 * Check whether the authenticated user may access a payment record.
 * Admins/accountants/principals may access any record.
 * Parents may access payments for children they are guardians of.
 * Students may access their own payments.
 */
const canAccessPayment = async (reqUser, payment) => {
  if (['admin', 'super_admin', 'principal', 'accountant'].includes(reqUser.role)) return true;

  const studentId = payment.student_id || payment.s_id;
  if (!studentId) return false;

  if (reqUser.role === 'student') {
    const student = await db.findOne('students', { id: studentId, ...getSchoolFilter({ user: reqUser }) });
    return student && String(student.user_id) === String(reqUser.id);
  }

  if (reqUser.role === 'parent') {
    const guardian = await db.findOne('guardians', { user_id: reqUser.id, ...getSchoolFilter({ user: reqUser }) });
    if (!guardian) return false;
    const links = await db.raw(
      'SELECT 1 FROM student_guardians sg JOIN students s ON sg.student_id = s.id WHERE sg.student_id = $1 AND sg.guardian_id = $2 AND s.school_id = $3 LIMIT 1',
      [studentId, guardian.id, reqUser.school_id]
    );
    return links.length > 0;
  }

  return false;
};

// ── Helpers ─────────────────────────────────────────────────

const generateInvoiceNo = async (schoolId, tdb = db) => {
  const [{ seq }] = await tdb.raw("SELECT nextval('invoice_no_seq') AS seq");
  return `INV-${String(seq).padStart(6, '0')}`;
};

const generateReceiptNo = async (schoolId, tdb = db) => {
  const [{ seq }] = await tdb.raw("SELECT nextval('receipt_no_seq') AS seq");
  return `REC-${String(seq).padStart(6, '0')}`;
};

const applyOverdueStatus = (invoice) => {
  if (!invoice || !invoice.dueDate) return invoice;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.dueDate);
  if (due < today && ['pending', 'partial'].includes(invoice.status)) {
    invoice.status = 'overdue';
  }
  return invoice;
};

const computeConcessionAmount = (baseAmount, concessions) => {
  let total = 0;
  for (const c of concessions) {
    if (c.status !== 'active') continue;
    total += c.type === 'percentage' ? (baseAmount * Number(c.value)) / 100 : Number(c.value);
  }
  return Math.min(total, baseAmount);
};

// ── Fee structure mapping helpers ───────────────────────────

function mapFeeHead(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    type: row.type,
    frequency: row.frequency,
    refundable: row.refundable,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFeeStructure(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    academicYear: row.ay_id
      ? { id: row.ay_id, name: row.ay_name, isCurrent: row.ay_is_current }
      : null,
    class: row.class_id
      ? { id: row.class_id, name: row.class_name, numericName: row.class_numeric_name }
      : null,
    category: row.category,
    totalAmount: toNum(row.total_amount),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.items || []).map((item) => ({
      id: item.id,
      amount: item.amount,
      dueMonths: item.due_months,
      feeHead: item.fee_head,
    })),
  };
}

async function fetchFeeStructureById(id, req) {
  const rows = await db.raw(
    `SELECT fs.*,
            ay.id AS ay_id, ay.name AS ay_name, ay.is_current AS ay_is_current,
            c.id AS class_id, c.name AS class_name, c.numeric_name AS class_numeric_name,
            COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', fsi.id,
                'amount', fsi.amount,
                'due_months', fsi.due_months,
                'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code, 'type', fh.type, 'frequency', fh.frequency)
              ) ORDER BY fsi.created_at
            ) FILTER (WHERE fsi.id IS NOT NULL), '[]'::jsonb) AS items
     FROM fee_structures fs
     LEFT JOIN academic_years ay ON fs.academic_year_id = ay.id
     LEFT JOIN classes c ON fs.class_id = c.id
     LEFT JOIN fee_structure_items fsi ON fsi.fee_structure_id = fs.id
     LEFT JOIN fee_heads fh ON fh.id = fsi.fee_head_id
     WHERE fs.id = $1
     GROUP BY fs.id, ay.id, c.id`,
    [id]
  );
  const resource = rows[0] || null;
  if (resource) verifySchoolAccess(req, resource);
  return resource;
}

async function fetchPopulatedFeeStructures(whereConditions = [], params = [], orderBy = 'fs.created_at DESC', limit = null, offset = null) {
  const where = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const pagination = [];
  if (limit !== null) pagination.push(`LIMIT $${params.length + 1}`);
  if (offset !== null) pagination.push(`OFFSET $${params.length + (limit !== null ? 2 : 1)}`);

  const listParams = limit !== null ? [...params, limit, offset] : params;
  const query = `
    SELECT fs.*,
           ay.id AS ay_id, ay.name AS ay_name, ay.is_current AS ay_is_current,
           c.id AS class_id, c.name AS class_name, c.numeric_name AS class_numeric_name,
           COALESCE(jsonb_agg(
             jsonb_build_object(
               'id', fsi.id,
               'amount', fsi.amount,
               'due_months', fsi.due_months,
               'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code, 'type', fh.type, 'frequency', fh.frequency)
             ) ORDER BY fsi.created_at
           ) FILTER (WHERE fsi.id IS NOT NULL), '[]'::jsonb) AS items
    FROM fee_structures fs
    LEFT JOIN academic_years ay ON fs.academic_year_id = ay.id
    LEFT JOIN classes c ON fs.class_id = c.id
    LEFT JOIN fee_structure_items fsi ON fsi.fee_structure_id = fs.id
    LEFT JOIN fee_heads fh ON fh.id = fsi.fee_head_id
    ${where}
    GROUP BY fs.id, ay.id, c.id
    ORDER BY ${orderBy}
    ${pagination.join(' ')}
  `;
  const rows = await db.raw(query, listParams);
  return rows.map(mapFeeStructure);
}

// ── Invoice mapping helpers ─────────────────────────────────

function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    student: row.s_id
      ? {
          id: row.s_id,
          firstName: row.s_first_name,
          lastName: row.s_last_name,
          admissionNo: row.s_admission_no,
          class: row.s_class_id
            ? { id: row.s_class_id, name: row.s_class_name }
            : null,
          section: row.s_section_id
            ? { id: row.s_section_id, name: row.s_section_name }
            : null,
        }
      : null,
    academicYear: row.ay_id ? { id: row.ay_id, name: row.ay_name } : null,
    feeStructure: row.fs_id
      ? { id: row.fs_id, name: row.fs_name, class: row.fs_class_id, category: row.fs_category }
      : null,
    items: (row.items || []).map((item) => ({
      id: item.id,
      amount: toNum(item.amount),
      dueDate: item.due_date,
      feeHead: item.fee_head,
    })),
    totalAmount: toNum(row.total_amount),
    concessionAmount: toNum(row.concession_amount),
    fineAmount: toNum(row.fine_amount),
    netAmount: toNum(row.net_amount),
    paidAmount: toNum(row.paid_amount),
    balanceAmount: toNum(row.balance_amount),
    status: row.status,
    dueDate: row.due_date,
    generatedBy: row.u_id ? { id: row.u_id, name: row.u_name, email: row.u_email } : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchInvoiceById(id, req) {
  const rows = await db.raw(
    `SELECT fi.*,
            s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
            s.class_id AS s_class_id, sc.name AS s_class_name,
            s.section_id AS s_section_id, ss.name AS s_section_name,
            ay.id AS ay_id, ay.name AS ay_name,
            fs.id AS fs_id, fs.name AS fs_name, fs.class_id AS fs_class_id, fs.category AS fs_category,
            u.id AS u_id, u.name AS u_name, u.email AS u_email,
            COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', fii.id,
                'amount', fii.amount,
                'due_date', fii.due_date,
                'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code)
              ) ORDER BY fii.created_at
            ) FILTER (WHERE fii.id IS NOT NULL), '[]'::jsonb) AS items
     FROM fee_invoices fi
     LEFT JOIN students s ON fi.student_id = s.id
     LEFT JOIN classes sc ON s.class_id = sc.id
     LEFT JOIN class_sections ss ON s.section_id = ss.id
     LEFT JOIN academic_years ay ON fi.academic_year_id = ay.id
     LEFT JOIN fee_structures fs ON fi.fee_structure_id = fs.id
     LEFT JOIN users u ON fi.generated_by = u.id
     LEFT JOIN fee_invoice_items fii ON fii.invoice_id = fi.id
     LEFT JOIN fee_heads fh ON fh.id = fii.fee_head_id
     WHERE fi.id = $1
     GROUP BY fi.id, s.id, sc.id, ss.id, ay.id, fs.id, u.id`,
    [id]
  );
  const resource = rows[0] || null;
  if (resource) verifySchoolAccess(req, resource);
  return resource;
}

async function fetchPopulatedInvoices(whereConditions = [], params = [], orderBy = 'fi.created_at DESC', limit = null, offset = null) {
  const where = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const pagination = [];
  if (limit !== null) pagination.push(`LIMIT $${params.length + 1}`);
  if (offset !== null) pagination.push(`OFFSET $${params.length + (limit !== null ? 2 : 1)}`);

  const listParams = limit !== null ? [...params, limit, offset] : params;
  const query = `
    SELECT fi.*,
           s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
           ay.id AS ay_id, ay.name AS ay_name,
           fs.id AS fs_id, fs.name AS fs_name, fs.class_id AS fs_class_id, fs.category AS fs_category,
           u.id AS u_id, u.name AS u_name, u.email AS u_email,
           COALESCE(jsonb_agg(
             jsonb_build_object(
               'id', fii.id,
               'amount', fii.amount,
               'due_date', fii.due_date,
               'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code)
             ) ORDER BY fii.created_at
           ) FILTER (WHERE fii.id IS NOT NULL), '[]'::jsonb) AS items
    FROM fee_invoices fi
    LEFT JOIN students s ON fi.student_id = s.id
    LEFT JOIN academic_years ay ON fi.academic_year_id = ay.id
    LEFT JOIN fee_structures fs ON fi.fee_structure_id = fs.id
    LEFT JOIN users u ON fi.generated_by = u.id
    LEFT JOIN fee_invoice_items fii ON fii.invoice_id = fi.id
    LEFT JOIN fee_heads fh ON fh.id = fii.fee_head_id
    ${where}
    GROUP BY fi.id, s.id, ay.id, fs.id, u.id
    ORDER BY ${orderBy}
    ${pagination.join(' ')}
  `;
  const rows = await db.raw(query, listParams);
  return rows.map(mapInvoice);
}

// ── Payment mapping helpers ─────────────────────────────────

function mapPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    receiptNo: row.receipt_no,
    student: row.s_id
      ? { id: row.s_id, firstName: row.s_first_name, lastName: row.s_last_name, admissionNo: row.s_admission_no }
      : null,
    invoice: row.fi_id
      ? {
          id: row.fi_id,
          invoiceNo: row.fi_invoice_no,
          totalAmount: toNum(row.fi_total_amount),
          netAmount: toNum(row.fi_net_amount),
          balanceAmount: toNum(row.fi_balance_amount),
          paidAmount: toNum(row.fi_paid_amount),
          status: row.fi_status,
          items: (row.invoice_items || []).map((item) => ({
            id: item.id,
            amount: toNum(item.amount),
            dueDate: item.due_date,
            feeHead: item.fee_head,
          })),
        }
      : null,
    amount: toNum(row.amount),
    paymentMode: row.payment_mode,
    transactionId: row.transaction_id,
    chequeNo: row.cheque_no,
    bankName: row.bank_name,
    paidDate: row.paid_date,
    status: row.status,
    collectedBy: row.u_id ? { id: row.u_id, name: row.u_name, email: row.u_email } : null,
    remarks: row.remarks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchPaymentById(id, req) {
  const rows = await db.raw(
    `SELECT fp.*,
            s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
            fi.id AS fi_id, fi.invoice_no AS fi_invoice_no, fi.total_amount AS fi_total_amount,
            (fi.total_amount - fi.concession_amount + fi.fine_amount) AS fi_net_amount,
            fi.balance_amount AS fi_balance_amount, fi.paid_amount AS fi_paid_amount,
            fi.status AS fi_status,
            u.id AS u_id, u.name AS u_name, u.email AS u_email,
            COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', fii.id,
                'amount', fii.amount,
                'due_date', fii.due_date,
                'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code)
              ) ORDER BY fii.created_at
            ) FILTER (WHERE fii.id IS NOT NULL), '[]'::jsonb) AS invoice_items
     FROM fee_payments fp
     LEFT JOIN students s ON fp.student_id = s.id
     LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
     LEFT JOIN users u ON fp.collected_by = u.id
     LEFT JOIN fee_invoice_items fii ON fii.invoice_id = fi.id
     LEFT JOIN fee_heads fh ON fh.id = fii.fee_head_id
     WHERE fp.id = $1
     GROUP BY fp.id, s.id, fi.id, u.id`,
    [id]
  );
  const resource = rows[0] || null;
  if (resource) verifySchoolAccess(req, resource);
  return resource;
}

async function fetchPaymentByReceiptNo(receiptNo, req) {
  const rows = await db.raw(
    `SELECT fp.*,
            s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
            s.class_id AS s_class_id, sc.name AS s_class_name,
            s.section_id AS s_section_id, ss.name AS s_section_name,
            fi.id AS fi_id, fi.invoice_no AS fi_invoice_no, fi.total_amount AS fi_total_amount,
            (fi.total_amount - fi.concession_amount + fi.fine_amount) AS fi_net_amount,
            fi.balance_amount AS fi_balance_amount, fi.paid_amount AS fi_paid_amount,
            fi.status AS fi_status,
            u.id AS u_id, u.name AS u_name, u.email AS u_email,
            COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', fii.id,
                'amount', fii.amount,
                'due_date', fii.due_date,
                'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code)
              ) ORDER BY fii.created_at
            ) FILTER (WHERE fii.id IS NOT NULL), '[]'::jsonb) AS invoice_items
     FROM fee_payments fp
     LEFT JOIN students s ON fp.student_id = s.id
     LEFT JOIN classes sc ON s.class_id = sc.id
     LEFT JOIN class_sections ss ON s.section_id = ss.id
     LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
     LEFT JOIN users u ON fp.collected_by = u.id
     LEFT JOIN fee_invoice_items fii ON fii.invoice_id = fi.id
     LEFT JOIN fee_heads fh ON fh.id = fii.fee_head_id
     WHERE fp.receipt_no = $1
     GROUP BY fp.id, s.id, sc.id, ss.id, fi.id, u.id`,
    [receiptNo]
  );
  const resource = rows[0] || null;
  if (resource) verifySchoolAccess(req, resource);
  return resource;
}

// ── Concession mapping helpers ──────────────────────────────

function mapConcession(row) {
  if (!row) return null;
  return {
    id: row.id,
    student: row.s_id
      ? { id: row.s_id, firstName: row.s_first_name, lastName: row.s_last_name, admissionNo: row.s_admission_no }
      : null,
    academicYear: row.ay_id ? { id: row.ay_id, name: row.ay_name } : null,
    feeHead: row.fh_id ? { id: row.fh_id, name: row.fh_name, code: row.fh_code } : null,
    type: row.type,
    value: toNum(row.value),
    reason: row.reason,
    approvedBy: row.u_id ? { id: row.u_id, name: row.u_name, email: row.u_email } : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchConcessionById(id, req) {
  const rows = await db.raw(
    `SELECT fc.*,
            s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
            ay.id AS ay_id, ay.name AS ay_name,
            fh.id AS fh_id, fh.name AS fh_name, fh.code AS fh_code,
            u.id AS u_id, u.name AS u_name, u.email AS u_email
     FROM fee_concessions fc
     LEFT JOIN students s ON fc.student_id = s.id
     LEFT JOIN academic_years ay ON fc.academic_year_id = ay.id
     LEFT JOIN fee_heads fh ON fc.fee_head_id = fh.id
     LEFT JOIN users u ON fc.approved_by = u.id
     WHERE fc.id = $1`,
    [id]
  );
  const resource = rows[0] || null;
  if (resource) verifySchoolAccess(req, resource);
  return resource;
}

// ── Fee Heads ───────────────────────────────────────────────

exports.getFeeHeads = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search, sort = 'name' } = req.query;

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'fh.school_id'));
  params.push(...schoolParams);

  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`(name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 2})`);
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = parseSort(sort, FEE_HEAD_SORT_ALLOWLIST, '"name" ASC');

  const [countResult, feeHeads] = await Promise.all([
    db.raw(`SELECT COUNT(*) AS count FROM fee_heads ${where}`, params),
    db.raw(
      `SELECT * FROM fee_heads ${where} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, skip]
    ),
  ]);

  const total = parseInt(countResult[0].count, 10);
  return ApiResponse.paginated(res, feeHeads.map(mapFeeHead), getPaginationMeta(page, limit, total), 'Fee heads retrieved');
});

exports.getFeeHead = catchAsync(async (req, res) => {
  const feeHead = await db.findOne('fee_heads', { id: req.params.id, ...getSchoolFilter(req) });
  if (!feeHead) throw new ApiError('Fee head not found', 404);
  return ApiResponse.success(res, { feeHead: mapFeeHead(feeHead) }, 'Fee head retrieved');
});

exports.createFeeHead = catchAsync(async (req, res) => {
  const existing = await db.findOne('fee_heads', { code: req.body.code, ...getSchoolFilter(req) });
  if (existing) throw new ApiError('Fee head code already exists', 409);

  const insertData = cleanUndefined({
    name: req.body.name,
    code: req.body.code,
    description: req.body.description,
    type: req.body.type,
    frequency: req.body.frequency,
    refundable: req.body.refundable,
    status: req.body.status,
    school_id: req.user.school_id,
  });

  const feeHead = await db.insert('fee_heads', insertData);
  return ApiResponse.success(res, { feeHead: mapFeeHead(feeHead) }, 'Fee head created', 201);
});

exports.updateFeeHead = catchAsync(async (req, res) => {
  const feeHead = await db.findOne('fee_heads', { id: req.params.id, ...getSchoolFilter(req) });
  if (!feeHead) throw new ApiError('Fee head not found', 404);

  if (req.body.code && req.body.code !== feeHead.code) {
    const existing = await db.findOne('fee_heads', { code: req.body.code, ...getSchoolFilter(req) });
    if (existing) throw new ApiError('Fee head code already exists', 409);
  }

  const updateData = cleanUndefined({
    name: req.body.name,
    code: req.body.code,
    description: req.body.description,
    type: req.body.type,
    frequency: req.body.frequency,
    refundable: req.body.refundable,
    status: req.body.status,
  });

  const [updated] = await db.update('fee_heads', updateData, { id: req.params.id });
  return ApiResponse.success(res, { feeHead: mapFeeHead(updated) }, 'Fee head updated');
});

exports.deleteFeeHead = catchAsync(async (req, res) => {
  const feeHead = await db.findOne('fee_heads', { id: req.params.id, ...getSchoolFilter(req) });
  if (!feeHead) throw new ApiError('Fee head not found', 404);

  const inUse = await db.findOne('fee_structure_items', { fee_head_id: feeHead.id, ...getSchoolFilter(req) });
  if (inUse) {
    const [updated] = await db.update('fee_heads', { status: 'inactive' }, { id: req.params.id });
    return ApiResponse.success(res, { feeHead: mapFeeHead(updated) }, 'Fee head deactivated because it is in use');
  }

  await db.delete('fee_heads', { id: req.params.id });
  return ApiResponse.success(res, null, 'Fee head deleted');
});

// ── Fee Structures ──────────────────────────────────────────

exports.getFeeStructures = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { academicYear, class: classId, category, status, search, sort = '-createdAt' } = req.query;

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'fs.school_id'));
  params.push(...schoolParams);

  if (academicYear) {
    conditions.push(`fs.academic_year_id = $${params.length + 1}`);
    params.push(academicYear);
  }
  if (classId) {
    conditions.push(`fs.class_id = $${params.length + 1}`);
    params.push(classId);
  }
  if (category) {
    conditions.push(`fs.category = $${params.length + 1}`);
    params.push(category);
  }
  if (status) {
    conditions.push(`fs.status = $${params.length + 1}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`fs.name ILIKE $${params.length + 1}`);
    params.push(`%${search}%`);
  }

  const orderBy = parseSort(sort, FEE_STRUCTURE_SORT_ALLOWLIST, 'fs.created_at DESC');
  const countWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, feeStructures] = await Promise.all([
    db.raw(`SELECT COUNT(*) AS count FROM fee_structures fs ${countWhere}`, params),
    fetchPopulatedFeeStructures(conditions, params, orderBy, limit, skip),
  ]);

  const total = parseInt(countResult[0].count, 10);
  return ApiResponse.paginated(res, feeStructures, getPaginationMeta(page, limit, total), 'Fee structures retrieved');
});

exports.getFeeStructure = catchAsync(async (req, res) => {
  const feeStructure = await fetchFeeStructureById(req.params.id, req);
  if (!feeStructure) throw new ApiError('Fee structure not found', 404);
  return ApiResponse.success(res, { feeStructure }, 'Fee structure retrieved');
});

exports.createFeeStructure = catchAsync(async (req, res) => {
  const totalAmount = (req.body.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const insertData = cleanUndefined({
    name: req.body.name,
    academic_year_id: req.body.academicYear,
    class_id: req.body.class,
    category: req.body.category,
    total_amount: totalAmount,
    effective_from: req.body.effectiveFrom,
    effective_to: req.body.effectiveTo,
    status: req.body.status,
    school_id: req.user.school_id,
  });

  const feeStructure = await db.insert('fee_structures', insertData);

  const items = (req.body.items || []).map((item) => ({
    fee_structure_id: feeStructure.id,
    fee_head_id: item.feeHead,
    amount: Number(item.amount),
    due_months: item.dueMonths || [],
    school_id: req.user.school_id,
  }));

  for (const item of items) {
    await db.insert('fee_structure_items', item);
  }

  const populated = await fetchFeeStructureById(feeStructure.id, req);
  return ApiResponse.success(res, { feeStructure: populated }, 'Fee structure created', 201);
});

exports.updateFeeStructure = catchAsync(async (req, res) => {
  const feeStructure = await db.findOne('fee_structures', { id: req.params.id, ...getSchoolFilter(req) });
  if (!feeStructure) throw new ApiError('Fee structure not found', 404);

  const updates = cleanUndefined({
    name: req.body.name,
    academic_year_id: req.body.academicYear,
    class_id: req.body.class,
    category: req.body.category,
    effective_from: req.body.effectiveFrom,
    effective_to: req.body.effectiveTo,
    status: req.body.status,
  });

  if (req.body.items) {
    updates.total_amount = req.body.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  await db.update('fee_structures', updates, { id: req.params.id });

  if (req.body.items) {
    await db.delete('fee_structure_items', { fee_structure_id: req.params.id });
    const items = req.body.items.map((item) => ({
      fee_structure_id: req.params.id,
      fee_head_id: item.feeHead,
      amount: Number(item.amount),
      due_months: item.dueMonths || [],
      school_id: feeStructure.school_id,
    }));
    for (const item of items) {
      await db.insert('fee_structure_items', item);
    }
  }

  const populated = await fetchFeeStructureById(req.params.id, req);
  return ApiResponse.success(res, { feeStructure: populated }, 'Fee structure updated');
});

exports.deleteFeeStructure = catchAsync(async (req, res) => {
  const feeStructure = await db.findOne('fee_structures', { id: req.params.id, ...getSchoolFilter(req) });
  if (!feeStructure) throw new ApiError('Fee structure not found', 404);

  const inUse = await db.findOne('fee_invoices', { fee_structure_id: feeStructure.id, ...getSchoolFilter(req) });
  if (inUse) {
    const [updated] = await db.update('fee_structures', { status: 'inactive' }, { id: req.params.id });
    return ApiResponse.success(res, { feeStructure: mapFeeStructure(updated) }, 'Fee structure deactivated because it has invoices');
  }

  await db.delete('fee_structure_items', { fee_structure_id: req.params.id });
  await db.delete('fee_structures', { id: req.params.id });
  return ApiResponse.success(res, null, 'Fee structure deleted');
});

// ── Invoices ────────────────────────────────────────────────

exports.getInvoices = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { student, academicYear, status, from, to, search, sort = '-createdAt' } = req.query;

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'fi.school_id'));
  params.push(...schoolParams);

  if (student) {
    conditions.push(`fi.student_id = $${params.length + 1}`);
    params.push(student);
  }
  if (academicYear) {
    conditions.push(`fi.academic_year_id = $${params.length + 1}`);
    params.push(academicYear);
  }
  if (status) {
    conditions.push(`fi.status = $${params.length + 1}`);
    params.push(status);
  }
  if (from) {
    conditions.push(`fi.due_date >= $${params.length + 1}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`fi.due_date <= $${params.length + 1}`);
    params.push(to);
  }
  if (search) {
    conditions.push(`fi.invoice_no ILIKE $${params.length + 1}`);
    params.push(`%${search}%`);
  }

  const orderBy = parseSort(sort, INVOICE_SORT_ALLOWLIST, 'fi.created_at DESC');
  const countWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, invoiceRows] = await Promise.all([
    db.raw(`SELECT COUNT(*) AS count FROM fee_invoices fi ${countWhere}`, params),
    fetchPopulatedInvoices(conditions, params, orderBy, limit, skip),
  ]);

  const total = parseInt(countResult[0].count, 10);
  const invoices = invoiceRows.map(applyOverdueStatus);
  return ApiResponse.paginated(res, invoices, getPaginationMeta(page, limit, total), 'Invoices retrieved');
});

exports.getInvoice = catchAsync(async (req, res) => {
  const invoiceRow = await fetchInvoiceById(req.params.id, req);
  if (!invoiceRow) throw new ApiError('Invoice not found', 404);
  const invoice = applyOverdueStatus(mapInvoice(invoiceRow));
  return ApiResponse.success(res, { invoice }, 'Invoice retrieved');
});

exports.generateInvoice = catchAsync(async (req, res) => {
  const { student: studentId, academicYear, dueDate, billingMonth, notes } = req.body;

  const student = await db.findOne('students', { id: studentId, ...getSchoolFilter(req) });
  if (!student) throw new ApiError('Student not found', 404);

  const feeStructureRows = await db.raw(
    `SELECT fs.*,
            COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', fsi.id,
                'amount', fsi.amount,
                'due_months', fsi.due_months,
                'fee_head_id', fsi.fee_head_id,
                'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code, 'type', fh.type, 'frequency', fh.frequency)
              ) ORDER BY fsi.created_at
            ) FILTER (WHERE fsi.id IS NOT NULL), '[]'::jsonb) AS items
     FROM fee_structures fs
     LEFT JOIN fee_structure_items fsi ON fsi.fee_structure_id = fs.id
     LEFT JOIN fee_heads fh ON fh.id = fsi.fee_head_id
     WHERE fs.school_id = $1
       AND fs.academic_year_id = $2
       AND fs.class_id = $3
       AND fs.category = $4
       AND fs.status = 'active'
     GROUP BY fs.id
     LIMIT 1`,
    [req.user.school_id, academicYear, student.class_id, student.category || 'general']
  );

  const feeStructure = feeStructureRows[0];
  if (!feeStructure) {
    throw new ApiError('Active fee structure not found for this student', 404);
  }

  const concessions = await db.findMany('fee_concessions', {
    where: { student_id: studentId, academic_year_id: academicYear, status: 'active', ...getSchoolFilter(req) },
  });

  const items = [];
  let totalAmount = 0;
  let concessionAmount = 0;

  for (const item of feeStructure.items) {
    if (billingMonth && item.due_months?.length && !item.due_months.includes(Number(billingMonth))) {
      continue;
    }

    const applicableConcessions = concessions.filter(
      (c) => !c.fee_head_id || c.fee_head_id.toString() === item.fee_head_id.toString()
    );

    const itemAmount = Number(item.amount);
    const itemConcession = computeConcessionAmount(itemAmount, applicableConcessions);

    items.push({
      fee_head_id: item.fee_head_id,
      amount: itemAmount,
      due_date: new Date(dueDate),
    });

    totalAmount += itemAmount;
    concessionAmount += itemConcession;
  }

  if (items.length === 0) throw new ApiError('No fee items applicable for the selected billing month', 400);

  const netAmount = Math.max(0, totalAmount - concessionAmount);

  const invoice = await db.transaction(async (tdb) => {
    const invoiceNo = await generateInvoiceNo(req.user.school_id, tdb);

    const inv = await tdb.insert('fee_invoices', cleanUndefined({
      invoice_no: invoiceNo,
      student_id: studentId,
      academic_year_id: academicYear,
      fee_structure_id: feeStructure.id,
      total_amount: Math.round(totalAmount * 100) / 100,
      concession_amount: Math.round(concessionAmount * 100) / 100,
      fine_amount: 0,
      net_amount: Math.round(netAmount * 100) / 100,
      paid_amount: 0,
      balance_amount: Math.round(netAmount * 100) / 100,
      status: 'pending',
      due_date: new Date(dueDate),
      generated_by: req.user.id,
      notes,
      school_id: req.user.school_id,
    }));

    for (const item of items) {
      await tdb.insert('fee_invoice_items', { ...item, invoice_id: inv.id });
    }

    return inv;
  });

  // Fire-and-forget in-app notification to student/guardians
  notificationService.getStudentAndGuardianUserIds(studentId)
    .then((recipientIds) => {
      if (recipientIds.length === 0) return;
      return notificationService.createBulkNotifications({
        recipientIds,
        senderId: req.user.id,
        title: 'New fee invoice generated',
        message: `Fee invoice ${invoice.invoice_no} has been generated. Amount: ${netAmount.toFixed(2)}. Due date: ${new Date(dueDate).toLocaleDateString()}.`,
        type: 'fee',
        referenceModel: 'fee_invoices',
        referenceId: invoice.id,
      });
    })
    .catch((err) => console.error('Failed to create fee invoice notifications:', err.message));

  const populated = await fetchInvoiceById(invoice.id, req);
  return ApiResponse.success(res, { invoice: applyOverdueStatus(mapInvoice(populated)) }, 'Invoice generated', 201);
});

exports.cancelInvoice = catchAsync(async (req, res) => {
  const invoice = await db.findOne('fee_invoices', { id: req.params.id, ...getSchoolFilter(req) });
  if (!invoice) throw new ApiError('Invoice not found', 404);
  if (invoice.status === 'paid') throw new ApiError('Cannot cancel a fully paid invoice', 409);
  if (Number(invoice.paid_amount || 0) > 0) {
    throw new ApiError('Cannot cancel an invoice with recorded payments', 409);
  }

  const [updated] = await db.update('fee_invoices', { status: 'cancelled' }, { id: req.params.id });
  return ApiResponse.success(res, { invoice: mapInvoice(updated) }, 'Invoice cancelled');
});

exports.applyFine = catchAsync(async (req, res) => {
  const invoice = await db.findOne('fee_invoices', { id: req.params.id, ...getSchoolFilter(req) });
  if (!invoice) throw new ApiError('Invoice not found', 404);
  if (invoice.status === 'cancelled') throw new ApiError('Cannot apply fine to a cancelled invoice', 409);

  const fineAmount = Number(req.body.amount);
  if (!Number.isFinite(fineAmount) || fineAmount <= 0) {
    throw new ApiError('Fine amount must be greater than 0', 400);
  }

  const totalAmount = Number(invoice.total_amount || 0);
  const concessionAmount = Number(invoice.concession_amount || 0);
  const currentFine = Number(invoice.fine_amount || 0);
  const paidAmount = Number(invoice.paid_amount || 0);

  const newFineAmount = currentFine + fineAmount;
  const newNetAmount = totalAmount - concessionAmount + newFineAmount;
  const newBalance = Math.max(0, newNetAmount - paidAmount);
  const newStatus = newBalance <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

  const [updated] = await db.update('fee_invoices', {
    fine_amount: Math.round(newFineAmount * 100) / 100,
    net_amount: Math.round(newNetAmount * 100) / 100,
    balance_amount: Math.round(newBalance * 100) / 100,
    status: newStatus,
  }, { id: req.params.id });

  const populated = await fetchInvoiceById(updated.id, req);
  return ApiResponse.success(res, { invoice: applyOverdueStatus(mapInvoice(populated)) }, 'Fine applied');
});

// ── Payments ────────────────────────────────────────────────

exports.getPayments = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { student, invoice, status, paymentMode, from, to, sort = '-paidDate' } = req.query;

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'fp.school_id'));
  params.push(...schoolParams);

  if (student) {
    conditions.push(`fp.student_id = $${params.length + 1}`);
    params.push(student);
  }
  if (invoice) {
    conditions.push(`fp.invoice_id = $${params.length + 1}`);
    params.push(invoice);
  }
  if (status) {
    conditions.push(`fp.status = $${params.length + 1}`);
    params.push(status);
  }
  if (paymentMode) {
    conditions.push(`fp.payment_mode = $${params.length + 1}`);
    params.push(paymentMode);
  }
  if (from) {
    conditions.push(`fp.paid_date >= $${params.length + 1}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`fp.paid_date <= $${params.length + 1}`);
    params.push(to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = parseSort(sort, PAYMENT_SORT_ALLOWLIST, 'fp.paid_date DESC');

  const [countResult, paymentRows] = await Promise.all([
    db.raw(`SELECT COUNT(*) AS count FROM fee_payments fp ${where}`, params),
    db.raw(
      `SELECT fp.*,
              s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
              fi.id AS fi_id, fi.invoice_no AS fi_invoice_no, fi.balance_amount AS fi_balance_amount,
              u.id AS u_id, u.name AS u_name, u.email AS u_email
       FROM fee_payments fp
       LEFT JOIN students s ON fp.student_id = s.id
       LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
       LEFT JOIN users u ON fp.collected_by = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, skip]
    ),
  ]);

  const total = parseInt(countResult[0].count, 10);
  const payments = paymentRows.map(mapPayment);
  return ApiResponse.paginated(res, payments, getPaginationMeta(page, limit, total), 'Payments retrieved');
});

exports.getPayment = catchAsync(async (req, res) => {
  const payment = await fetchPaymentById(req.params.id, req);
  if (!payment) throw new ApiError('Payment not found', 404);
  if (!(await canAccessPayment(req.user, payment))) {
    throw new ApiError('You are not authorized to view this payment', 403);
  }
  return ApiResponse.success(res, { payment }, 'Payment retrieved');
});

exports.getReceipt = catchAsync(async (req, res) => {
  const payment = await fetchPaymentByReceiptNo(req.params.receiptNo, req);
  if (!payment) throw new ApiError('Receipt not found', 404);
  if (!(await canAccessPayment(req.user, payment))) {
    throw new ApiError('You are not authorized to view this receipt', 403);
  }
  return ApiResponse.success(res, { payment }, 'Receipt retrieved');
});

// @desc    Download fee receipt as PDF
// @route   GET /api/v1/fees/payments/:id/receipt.pdf
// @access  Admin, Accountant, Parent
exports.downloadReceipt = catchAsync(async (req, res) => {
  const payment = await fetchPaymentById(req.params.id, req);
  if (!payment) throw new ApiError('Payment not found', 404);
  if (!(await canAccessPayment(req.user, payment))) {
    throw new ApiError('You are not authorized to download this receipt', 403);
  }

  const doc = createDocument();
  const filename = `receipt-${payment.receiptNo}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);

  drawHeader(doc, 'FEE PAYMENT RECEIPT', `Receipt No: ${payment.receiptNo}`);

  const student = payment.student;
  drawInfoRow(doc, 'Student Name', student ? `${student.firstName} ${student.lastName}` : '-');
  drawInfoRow(doc, 'Admission No', student?.admissionNo);
  drawInfoRow(doc, 'Class / Section', student?.class?.name && student?.section?.name
    ? `${student.class.name} - ${student.section.name}`
    : '-');
  drawInfoRow(doc, 'Receipt Date', new Date(payment.paidDate).toLocaleDateString());
  drawInfoRow(doc, 'Payment Mode', payment.paymentMode);
  if (payment.transactionId) drawInfoRow(doc, 'Transaction ID', payment.transactionId);
  drawInfoRow(doc, 'Collected By', payment.collectedBy?.name || '-');

  doc.moveDown(1);

  const amountNum = toNum(payment.amount);
  if (payment.invoice?.items?.length) {
    const headers = ['Fee Head', 'Amount'];
    const rows = payment.invoice.items.map((item) => [item.feeHead?.name || item.feeHead, toNum(item.amount).toFixed(2)]);
    rows.push(['Total Amount', toNum(payment.invoice.totalAmount).toFixed(2)]);
    rows.push(['Concession / Fine', `${toNum(payment.invoice.concessionAmount).toFixed(2)} / ${toNum(payment.invoice.fineAmount).toFixed(2)}`]);
    rows.push(['Net Amount', toNum(payment.invoice.netAmount).toFixed(2)]);
    rows.push(['Amount Paid', amountNum.toFixed(2)]);
    rows.push(['Balance', toNum(payment.invoice.balanceAmount).toFixed(2)]);
    drawTable(doc, headers, rows, { colWidths: [350, 145], align: 'left' });
  } else {
    doc.fontSize(10).text(`Amount Paid: ${amountNum.toFixed(2)}`);
  }

  doc.moveDown(2);
  doc.fontSize(10).fillColor('#555555');
  doc.text('Thank you for your payment.', { align: 'center' });
  doc.text('This is a computer-generated receipt and does not require a signature.', { align: 'center' });

  drawFooter(doc);
  doc.end();
});

exports.recordPayment = catchAsync(async (req, res) => {
  const { invoice: invoiceId, waiverApproved } = req.body;
  const amount = Number(req.body.amount);

  const invoice = await db.findOne('fee_invoices', { id: invoiceId, ...getSchoolFilter(req) });
  if (!invoice) throw new ApiError('Invoice not found', 404);
  if (invoice.status === 'cancelled') throw new ApiError('Cannot pay against a cancelled invoice', 409);
  if (invoice.status === 'paid') throw new ApiError('Invoice already fully paid', 409);

  const netAmount = invoice.net_amount != null
    ? Number(invoice.net_amount)
    : (Number(invoice.total_amount) || 0) - (Number(invoice.concession_amount) || 0) + (Number(invoice.fine_amount) || 0);
  const balance = Math.max(0, netAmount - Number(invoice.paid_amount || 0));

  if (amount <= balance && amount < balance * 0.5 && !waiverApproved) {
    throw new ApiError(`Minimum payment is 50% of balance (${balance * 0.5}) unless waived`, 400);
  }

  const payment = await db.transaction(async (tdb) => {
    const receiptNo = await generateReceiptNo(invoice.school_id || req.user.school_id, tdb);

    const pay = await tdb.insert('fee_payments', cleanUndefined({
      receipt_no: receiptNo,
      student_id: invoice.student_id,
      invoice_id: invoiceId,
      amount,
      payment_mode: req.body.paymentMode,
      transaction_id: req.body.transactionId,
      cheque_no: req.body.chequeNo,
      bank_name: req.body.bankName,
      paid_date: req.body.paidDate || new Date(),
      status: 'completed',
      collected_by: req.user.id,
      remarks: req.body.remarks,
      school_id: invoice.school_id || req.user.school_id,
    }));

    const currentPaid = Number(invoice.paid_amount || 0);
    const newPaidAmount = Math.min(netAmount, currentPaid + amount);
    const excess = Math.max(0, amount - (netAmount - currentPaid));
    const newBalance = Math.max(0, netAmount - newPaidAmount);
    const newStatus = newBalance <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

    await tdb.update('fee_invoices', {
      paid_amount: Math.round(newPaidAmount * 100) / 100,
      balance_amount: Math.round(newBalance * 100) / 100,
      advance_amount: Math.round((Number(invoice.advance_amount || 0) + excess) * 100) / 100,
      status: newStatus,
    }, { id: invoiceId });

    return pay;
  });

  const populated = await fetchPaymentById(payment.id, req);

  // Notify guardians
  try {
    const studentDoc = await db.findOne('students', { id: invoice.student_id, ...getSchoolFilter(req) });
    const guardianRows = await db.raw(
      `SELECT g.* FROM guardians g
       JOIN student_guardians sg ON sg.guardian_id = g.id
       JOIN students s ON sg.student_id = s.id
       WHERE sg.student_id = $1 AND s.school_id = $2`,
      [invoice.student_id, req.user.school_id]
    );

    for (const guardian of guardianRows) {
      if (guardian.email) {
        await sendTemplatedEmail(
          'feeReceipt',
          guardian.email,
          {
            parentName: `${guardian.first_name} ${guardian.last_name}`,
            studentName: `${studentDoc.first_name} ${studentDoc.last_name}`,
            amount: amount.toFixed(2),
            receiptNo: payment.receipt_no,
            paidDate: new Date(payment.paid_date).toLocaleDateString(),
            paymentMode: payment.payment_mode,
          }
        );
      }
      if (guardian.phone) {
        await sendSMS({
          to: guardian.phone,
          message: `Fee payment of ${amount.toFixed(2)} received for ${studentDoc.first_name} ${studentDoc.last_name}. Receipt: ${payment.receipt_no}.`,
        });
      }
    }
  } catch (err) {
    console.error('Failed to notify guardians about fee payment:', err.message);
  }

  return ApiResponse.success(
    res,
    { payment: populated },
    `Payment recorded. Receipt: ${payment.receipt_no}`,
    201
  );
});

// ── Concessions ─────────────────────────────────────────────

exports.getConcessions = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { student, academicYear, feeHead, status, sort = '-createdAt' } = req.query;

  const conditions = [];
  const params = [];

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  conditions.push(clause.replace('school_id', 'fc.school_id'));
  params.push(...schoolParams);

  if (student) {
    conditions.push(`fc.student_id = $${params.length + 1}`);
    params.push(student);
  }
  if (academicYear) {
    conditions.push(`fc.academic_year_id = $${params.length + 1}`);
    params.push(academicYear);
  }
  if (feeHead) {
    conditions.push(`fc.fee_head_id = $${params.length + 1}`);
    params.push(feeHead);
  }
  if (status) {
    conditions.push(`fc.status = $${params.length + 1}`);
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = parseSort(sort, CONCESSION_SORT_ALLOWLIST, 'fc.created_at DESC');

  const [countResult, concessionRows] = await Promise.all([
    db.raw(`SELECT COUNT(*) AS count FROM fee_concessions fc ${where}`, params),
    db.raw(
      `SELECT fc.*,
              s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
              ay.id AS ay_id, ay.name AS ay_name,
              fh.id AS fh_id, fh.name AS fh_name, fh.code AS fh_code,
              u.id AS u_id, u.name AS u_name, u.email AS u_email
       FROM fee_concessions fc
       LEFT JOIN students s ON fc.student_id = s.id
       LEFT JOIN academic_years ay ON fc.academic_year_id = ay.id
       LEFT JOIN fee_heads fh ON fc.fee_head_id = fh.id
       LEFT JOIN users u ON fc.approved_by = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, skip]
    ),
  ]);

  const total = parseInt(countResult[0].count, 10);
  const concessions = concessionRows.map(mapConcession);
  return ApiResponse.paginated(res, concessions, getPaginationMeta(page, limit, total), 'Concessions retrieved');
});

exports.getConcession = catchAsync(async (req, res) => {
  const concession = await fetchConcessionById(req.params.id, req);
  if (!concession) throw new ApiError('Concession not found', 404);
  return ApiResponse.success(res, { concession }, 'Concession retrieved');
});

exports.createConcession = catchAsync(async (req, res) => {
  const insertData = cleanUndefined({
    student_id: req.body.student,
    academic_year_id: req.body.academicYear,
    fee_head_id: req.body.feeHead,
    type: req.body.type,
    value: req.body.value,
    reason: req.body.reason,
    approved_by: req.user.id,
    status: req.body.status,
    school_id: req.user.school_id,
  });

  const concession = await db.insert('fee_concessions', insertData);
  const populated = await fetchConcessionById(concession.id, req);
  return ApiResponse.success(res, { concession: populated }, 'Concession created', 201);
});

exports.updateConcession = catchAsync(async (req, res) => {
  const concession = await db.findOne('fee_concessions', { id: req.params.id, ...getSchoolFilter(req) });
  if (!concession) throw new ApiError('Concession not found', 404);

  const updateData = cleanUndefined({
    student_id: req.body.student,
    academic_year_id: req.body.academicYear,
    fee_head_id: req.body.feeHead,
    type: req.body.type,
    value: req.body.value,
    reason: req.body.reason,
    status: req.body.status,
  });

  await db.update('fee_concessions', updateData, { id: req.params.id });
  const populated = await fetchConcessionById(req.params.id, req);
  return ApiResponse.success(res, { concession: populated }, 'Concession updated');
});

exports.deleteConcession = catchAsync(async (req, res) => {
  const concession = await db.findOne('fee_concessions', { id: req.params.id, ...getSchoolFilter(req) });
  if (!concession) throw new ApiError('Concession not found', 404);
  const [updated] = await db.update('fee_concessions', { status: 'inactive' }, { id: req.params.id });
  return ApiResponse.success(res, { concession: mapConcession(updated) }, 'Concession deactivated');
});

// ── Student Ledger ──────────────────────────────────────────

exports.getStudentLedger = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { academicYear } = req.query;

  const { clause: studentClause, params: studentParams } = scopeBySchool(req, 0);
  const studentRows = await db.raw(
    `SELECT s.*, c.name AS class_name, ss.name AS section_name
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN class_sections ss ON s.section_id = ss.id
     WHERE ${studentClause.replace('school_id', 's.school_id')} AND s.id = $${studentParams.length + 1}`,
    [...studentParams, studentId]
  );
  const studentRow = studentRows[0];
  if (!studentRow) throw new ApiError('Student not found', 404);

  const student = {
    id: studentRow.id,
    firstName: studentRow.first_name,
    lastName: studentRow.last_name,
    admissionNo: studentRow.admission_no,
    class: studentRow.class_id ? { id: studentRow.class_id, name: studentRow.class_name } : null,
    section: studentRow.section_id ? { id: studentRow.section_id, name: studentRow.section_name } : null,
    category: studentRow.category,
  };

  const invoiceConditions = ['fi.student_id = $1'];
  const invoiceParams = [studentId];

  const { clause: invClause, params: invSchoolParams } = scopeBySchool(req, invoiceParams.length);
  invoiceConditions.push(invClause.replace('school_id', 'fi.school_id'));
  invoiceParams.push(...invSchoolParams);

  if (academicYear) {
    invoiceConditions.push(`fi.academic_year_id = $${invoiceParams.length + 1}`);
    invoiceParams.push(academicYear);
  }

  const paymentConditions = ['fp.student_id = $1'];
  const paymentParams = [studentId];

  const { clause: payClause, params: paySchoolParams } = scopeBySchool(req, paymentParams.length);
  paymentConditions.push(payClause.replace('school_id', 'fp.school_id'));
  paymentParams.push(...paySchoolParams);

  if (academicYear) {
    paymentConditions.push(`fi.academic_year_id = $${paymentParams.length + 1}`);
    paymentParams.push(academicYear);
  }

  const [invoiceRows, paymentRows] = await Promise.all([
    db.raw(
      `SELECT fi.*,
              COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', fii.id,
                  'amount', fii.amount,
                  'due_date', fii.due_date,
                  'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code)
                ) ORDER BY fii.created_at
              ) FILTER (WHERE fii.id IS NOT NULL), '[]'::jsonb) AS items
       FROM fee_invoices fi
       LEFT JOIN fee_invoice_items fii ON fii.invoice_id = fi.id
       LEFT JOIN fee_heads fh ON fh.id = fii.fee_head_id
       WHERE ${invoiceConditions.join(' AND ')}
       GROUP BY fi.id
       ORDER BY fi.created_at DESC`,
      invoiceParams
    ),
    db.raw(
      `SELECT fp.*, fi.invoice_no AS invoice_no
       FROM fee_payments fp
       LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
       WHERE ${paymentConditions.join(' AND ')}
       ORDER BY fp.paid_date DESC`,
      paymentParams
    ),
  ]);

  const invoices = invoiceRows.map(mapInvoice);
  const payments = paymentRows.map((row) => ({
    id: row.id,
    receiptNo: row.receipt_no,
    invoice: row.invoice_no ? { invoiceNo: row.invoice_no } : null,
    amount: toNum(row.amount),
    paymentMode: row.payment_mode,
    paidDate: row.paid_date,
    status: row.status,
    createdAt: row.created_at,
  }));

  const summary = {
    totalAmount: 0,
    concessionAmount: 0,
    fineAmount: 0,
    netAmount: 0,
    paidAmount: 0,
    balanceAmount: 0,
  };

  for (const inv of invoices) {
    summary.totalAmount += inv.totalAmount || 0;
    summary.concessionAmount += inv.concessionAmount || 0;
    summary.fineAmount += inv.fineAmount || 0;
    summary.netAmount += inv.netAmount || 0;
    summary.paidAmount += inv.paidAmount || 0;
    summary.balanceAmount += inv.balanceAmount || 0;
  }

  return ApiResponse.success(
    res,
    {
      student,
      invoices,
      payments,
      summary: {
        totalAmount: Math.round(summary.totalAmount * 100) / 100,
        concessionAmount: Math.round(summary.concessionAmount * 100) / 100,
        fineAmount: Math.round(summary.fineAmount * 100) / 100,
        netAmount: Math.round(summary.netAmount * 100) / 100,
        paidAmount: Math.round(summary.paidAmount * 100) / 100,
        balanceAmount: Math.round(summary.balanceAmount * 100) / 100,
      },
    },
    'Student fee ledger retrieved'
  );
});

// ── Reports ─────────────────────────────────────────────────

exports.getOutstanding = catchAsync(async (req, res) => {
  const { academicYear, from, to, status, class: classId, page, limit } = req.query;
  const { page: p, limit: l, skip } = getPagination({ page, limit });

  const params = [];
  params.push(req.user.school_id);
  params.push(academicYear || null);
  const statusFilter = status && INVOICE_STATUSES.includes(status) ? status : null;
  params.push(statusFilter);
  params.push(from || null);
  params.push(to || null);
  params.push(classId || null);
  params.push(skip);
  params.push(l);

  const result = await db.raw(
    `WITH base AS (
       SELECT
         fi.*,
         s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no, s.class_id AS s_class_id,
         c.id AS c_id, c.name AS c_name,
         ay.id AS ay_id, ay.name AS ay_name,
         COALESCE(jsonb_agg(
           jsonb_build_object(
             'id', fii.id,
             'amount', fii.amount,
             'due_date', fii.due_date,
             'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code)
           ) ORDER BY fii.created_at
         ) FILTER (WHERE fii.id IS NOT NULL), '[]'::jsonb) AS items
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN academic_years ay ON fi.academic_year_id = ay.id
       LEFT JOIN fee_invoice_items fii ON fii.invoice_id = fi.id
       LEFT JOIN fee_heads fh ON fh.id = fii.fee_head_id
       WHERE fi.school_id = $1
         AND fi.status NOT IN ('paid', 'cancelled')
         AND fi.balance_amount > 0
         AND ($2::uuid IS NULL OR fi.academic_year_id = $2)
         AND ($3::varchar IS NULL OR fi.status = $3)
         AND ($4::date IS NULL OR fi.due_date >= $4)
         AND ($5::date IS NULL OR fi.due_date <= $5)
         AND ($6::uuid IS NULL OR s.class_id = $6)
       GROUP BY fi.id, s.id, c.id, ay.id
     ),
     totals AS (
       SELECT COALESCE(SUM(balance_amount), 0) AS total_outstanding, COUNT(*) AS count
       FROM base
     )
     SELECT
       (SELECT total_outstanding FROM totals) AS total_outstanding,
       (SELECT count FROM totals) AS total_count,
       COALESCE(jsonb_agg(
         jsonb_build_object(
           'id', b.id,
           'invoice_no', b.invoice_no,
           'due_date', b.due_date,
           'status', b.status,
           'total_amount', b.total_amount,
           'concession_amount', b.concession_amount,
           'fine_amount', b.fine_amount,
           'net_amount', b.net_amount,
           'paid_amount', b.paid_amount,
           'balance_amount', b.balance_amount,
           'items', b.items,
           'created_at', b.created_at,
           'student', jsonb_build_object(
             'id', b.s_id,
             'first_name', b.s_first_name,
             'last_name', b.s_last_name,
             'admission_no', b.s_admission_no,
             'class', jsonb_build_object('id', b.c_id, 'name', b.c_name)
           ),
           'academic_year', jsonb_build_object('id', b.ay_id, 'name', b.ay_name)
         ) ORDER BY b.balance_amount DESC
       ), '[]'::jsonb) AS invoices
     FROM (
       SELECT * FROM base ORDER BY balance_amount DESC OFFSET $7 LIMIT $8
     ) b`,
    params
  );

  const row = result[0] || {};
  const totalOutstanding = Number(row.total_outstanding || 0);
  const totalCount = parseInt(row.total_count || 0, 10);
  const invoices = (row.invoices || []).map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoice_no,
    dueDate: inv.due_date,
    status: inv.status,
    totalAmount: toNum(inv.total_amount),
    concessionAmount: toNum(inv.concession_amount),
    fineAmount: toNum(inv.fine_amount),
    netAmount: toNum(inv.net_amount),
    paidAmount: toNum(inv.paid_amount),
    balanceAmount: toNum(inv.balance_amount),
    items: (inv.items || []).map((item) => ({
      id: item.id,
      amount: toNum(item.amount),
      dueDate: item.due_date,
      feeHead: item.fee_head,
    })),
    createdAt: inv.created_at,
    student: inv.student
      ? {
          id: inv.student.id,
          firstName: inv.student.first_name,
          lastName: inv.student.last_name,
          admissionNo: inv.student.admission_no,
          class: inv.student.class,
        }
      : null,
    academicYear: inv.academic_year
      ? { id: inv.academic_year.id, name: inv.academic_year.name }
      : null,
  }));

  const now = new Date();
  const aging = {
    '0-30': { amount: 0, count: 0 },
    '31-60': { amount: 0, count: 0 },
    '61-90': { amount: 0, count: 0 },
    '90+': { amount: 0, count: 0 },
  };

  for (const inv of invoices) {
    const due = new Date(inv.dueDate);
    const days = Math.max(0, Math.floor((now - due) / (1000 * 60 * 60 * 24)));
    const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
    aging[bucket].amount += inv.balanceAmount;
    aging[bucket].count += 1;
  }

  return ApiResponse.success(
    res,
    {
      totalOutstanding,
      aging,
      invoices,
      meta: getPaginationMeta(p, l, totalCount),
    },
    'Outstanding dues retrieved'
  );
});

exports.getDailyCollection = catchAsync(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const start = new Date(date.setHours(0, 0, 0, 0));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [totals, payments] = await Promise.all([
    db.raw(
      `SELECT payment_mode, SUM(amount) AS total, COUNT(*) AS count
       FROM fee_payments
       WHERE school_id = $1 AND paid_date >= $2 AND paid_date < $3 AND status = 'completed'
       GROUP BY payment_mode
       ORDER BY payment_mode`,
      [req.user.school_id, start, end]
    ),
    db.raw(
      `SELECT fp.*,
              s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no,
              fi.id AS fi_id, fi.invoice_no AS fi_invoice_no,
              u.id AS u_id, u.name AS u_name, u.email AS u_email
       FROM fee_payments fp
       LEFT JOIN students s ON fp.student_id = s.id
       LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
       LEFT JOIN users u ON fp.collected_by = u.id
       WHERE fp.school_id = $1 AND fp.paid_date >= $2 AND fp.paid_date < $3 AND fp.status = 'completed'
       ORDER BY fp.paid_date DESC`,
      [req.user.school_id, start, end]
    ),
  ]);

  const scopedCountResult = await db.raw(
    `SELECT COUNT(*) AS count FROM fee_payments WHERE school_id = $1 AND paid_date >= $2 AND paid_date < $3 AND status = 'completed'`,
    [req.user.school_id, start, end]
  );
  const scopedCount = parseInt(scopedCountResult[0].count, 10);

  const modeWise = totals.map((t) => ({ _id: t.payment_mode, total: Number(t.total), count: parseInt(t.count, 10) }));
  const grandTotal = modeWise.reduce((sum, t) => sum + t.total, 0);

  return ApiResponse.success(
    res,
    {
      date: start,
      grandTotal,
      totalCount: scopedCount,
      modeWise,
      payments: payments.map(mapPayment),
    },
    'Daily collection retrieved'
  );
});

exports.getMonthlyCollection = catchAsync(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  const monthlyData = await db.raw(
    `SELECT EXTRACT(MONTH FROM paid_date)::int AS month,
            payment_mode AS mode,
            SUM(amount) AS total,
            COUNT(*) AS count
     FROM fee_payments
     WHERE school_id = $1 AND paid_date >= $2 AND paid_date <= $3 AND status = 'completed'
     GROUP BY month, payment_mode
     ORDER BY month, payment_mode`,
    [req.user.school_id, start, end]
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthlyCollection = months.map((month, index) => {
    const monthData = monthlyData.filter((d) => d.month === index + 1);
    const total = monthData.reduce((sum, d) => sum + Number(d.total), 0);
    const count = monthData.reduce((sum, d) => sum + parseInt(d.count, 10), 0);
    return {
      month,
      monthNumber: index + 1,
      total,
      count,
      modes: monthData.map((d) => ({ mode: d.mode, total: Number(d.total), count: parseInt(d.count, 10) })),
    };
  });

  const yearlyTotal = monthlyCollection.reduce((sum, m) => sum + m.total, 0);

  return ApiResponse.success(
    res,
    { year, monthlyCollection, yearlyTotal },
    'Monthly collection retrieved'
  );
});

exports.getDefaulters = catchAsync(async (req, res) => {
  const { academicYear, class: classId, minBalance, page, limit } = req.query;
  const { page: p, limit: l, skip } = getPagination({ page, limit });

  const params = [];
  params.push(req.user.school_id);
  params.push(academicYear || null);
  params.push(classId || null);
  params.push(minBalance ? Number(minBalance) : null);
  params.push(skip);
  params.push(l);

  const result = await db.raw(
    `WITH base AS (
       SELECT
         fi.*,
         s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name, s.admission_no AS s_admission_no, s.class_id AS s_class_id,
         c.id AS c_id, c.name AS c_name,
         COALESCE(jsonb_agg(
           jsonb_build_object(
             'id', fii.id,
             'amount', fii.amount,
             'due_date', fii.due_date,
             'fee_head', jsonb_build_object('id', fh.id, 'name', fh.name, 'code', fh.code)
           ) ORDER BY fii.created_at
         ) FILTER (WHERE fii.id IS NOT NULL), '[]'::jsonb) AS items
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN fee_invoice_items fii ON fii.invoice_id = fi.id
       LEFT JOIN fee_heads fh ON fh.id = fii.fee_head_id
       WHERE fi.school_id = $1
         AND fi.status = 'overdue'
         AND fi.balance_amount > 0
         AND ($2::uuid IS NULL OR fi.academic_year_id = $2)
         AND ($3::uuid IS NULL OR s.class_id = $3)
         AND ($4::numeric IS NULL OR fi.balance_amount >= $4)
       GROUP BY fi.id, s.id, c.id
     ),
     totals AS (
       SELECT COUNT(*) AS count FROM base
     )
     SELECT
       (SELECT count FROM totals) AS total_count,
       COALESCE(jsonb_agg(
         jsonb_build_object(
           'id', b.id,
           'invoice_no', b.invoice_no,
           'due_date', b.due_date,
           'status', b.status,
           'total_amount', b.total_amount,
           'concession_amount', b.concession_amount,
           'fine_amount', b.fine_amount,
           'net_amount', b.net_amount,
           'paid_amount', b.paid_amount,
           'balance_amount', b.balance_amount,
           'items', b.items,
           'created_at', b.created_at,
           'student', jsonb_build_object(
             'id', b.s_id,
             'first_name', b.s_first_name,
             'last_name', b.s_last_name,
             'admission_no', b.s_admission_no,
             'class', jsonb_build_object('id', b.c_id, 'name', b.c_name)
           )
         ) ORDER BY b.balance_amount DESC
       ), '[]'::jsonb) AS invoices
     FROM (
       SELECT * FROM base ORDER BY balance_amount DESC OFFSET $5 LIMIT $6
     ) b`,
    params
  );

  const row = result[0] || {};
  const totalCount = parseInt(row.total_count || 0, 10);
  const invoices = (row.invoices || []).map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoice_no,
    dueDate: inv.due_date,
    status: inv.status,
    totalAmount: toNum(inv.total_amount),
    concessionAmount: toNum(inv.concession_amount),
    fineAmount: toNum(inv.fine_amount),
    netAmount: toNum(inv.net_amount),
    paidAmount: toNum(inv.paid_amount),
    balanceAmount: toNum(inv.balance_amount),
    items: (inv.items || []).map((item) => ({
      id: item.id,
      amount: toNum(item.amount),
      dueDate: item.due_date,
      feeHead: item.fee_head,
    })),
    createdAt: inv.created_at,
    student: inv.student
      ? {
          id: inv.student.id,
          firstName: inv.student.first_name,
          lastName: inv.student.last_name,
          admissionNo: inv.student.admission_no,
          class: inv.student.class,
        }
      : null,
  }));

  return ApiResponse.paginated(res, invoices, getPaginationMeta(p, l, totalCount), 'Defaulters retrieved');
});
