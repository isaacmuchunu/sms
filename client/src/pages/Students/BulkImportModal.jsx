import React, { useState, useCallback } from 'react';
import { UploadSimple, DownloadSimple, X, CheckCircle, Warning, FileCsv } from '@phosphor-icons/react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

const TEMPLATE_HEADERS = [
  'admissionNo',
  'firstName',
  'lastName',
  'gender',
  'dob',
  'class',
  'section',
  'academicYear',
  'guardians',
  'status',
];

const TEMPLATE_ROW = [
  'S001',
  'John',
  'Doe',
  'male',
  '2010-05-12',
  'class-uuid',
  'section-uuid',
  'academic-year-uuid',
  'guardian-uuid-1,guardian-uuid-2',
  'active',
];

const parseCsv = (text) => {
  const rows = text.trim().split(/\r?\n/);
  if (rows.length < 2) return [];

  const headers = rows[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  return rows.slice(1).map((line, index) => {
    const values = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));

    const obj = { _rowIndex: index + 2 };
    headers.forEach((header, i) => {
      const value = values[i];
      if (header === 'guardians') {
        obj[header] = value
          ? value
              .split(/[,;]/)
              .map((v) => v.trim())
              .filter(Boolean)
          : [];
      } else {
        obj[header] = value === '' ? undefined : value;
      }
    });
    return obj;
  });
};

const downloadTemplate = () => {
  const csv = [TEMPLATE_HEADERS.join(','), TEMPLATE_ROW.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'students-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const BulkImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(selectedFile);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCsv(e.target.result);
        setPreview(parsed.slice(0, 10));
        if (parsed.length === 0) {
          toast.error('CSV appears to be empty or missing data rows');
        }
      } catch (err) {
        toast.error('Failed to parse CSV');
      }
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const students = parseCsv(e.target.result);
        if (students.length === 0) {
          toast.error('No student rows found in the uploaded file');
          setLoading(false);
          return;
        }

        const payload = students.map(({ _rowIndex, ...rest }) => rest);
        const response = await api.post('/students/bulk-import', { students: payload });
        const data = response.data?.data?.results || response.data?.data || {};
        setResult(data);
        toast.success(
          `Import completed: ${data.created?.length || 0} created, ${data.errors?.length || 0} errors`
        );
        if (data.created?.length > 0) {
          onSuccess?.();
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Bulk import failed');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk import students" size="2xl">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Upload a CSV file with one row per student. Required columns: admissionNo, firstName,
            lastName, gender, dob, class, section, academicYear.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <DownloadSimple size={16} weight="bold" className="mr-1.5" />
            Template
          </Button>
        </div>

        {!result && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
              }`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm">
                <UploadSimple size={24} weight="bold" />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {file ? file.name : 'Drag and drop your CSV here, or click to browse'}
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="mt-4 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
              />
            </div>

            {preview.length > 0 && (
              <Card className="overflow-hidden">
                <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
                  <h3 className="text-sm font-semibold text-zinc-900">Preview ({preview.length} rows shown)</h3>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-50">
                      <tr className="border-b border-zinc-100">
                        <th className="px-4 py-2 font-medium text-zinc-500">#</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Admission</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Name</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Gender</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">DOB</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Class/Section/Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {preview.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-zinc-500">{row._rowIndex}</td>
                          <td className="px-4 py-2 font-mono text-zinc-700">{row.admissionNo || '-'}</td>
                          <td className="px-4 py-2 text-zinc-700">
                            {[row.firstName, row.lastName].filter(Boolean).join(' ') || '-'}
                          </td>
                          <td className="px-4 py-2 capitalize text-zinc-700">{row.gender || '-'}</td>
                          <td className="px-4 py-2 text-zinc-700">{row.dob || '-'}</td>
                          <td className="px-4 py-2 text-zinc-700">
                            {[row.class, row.section, row.academicYear].filter(Boolean).join(' / ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {result && (
          <Card className="overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Import results</h3>
            </div>
            <div className="p-4">
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-success-200 bg-success-50 p-3 text-center">
                  <div className="text-2xl font-bold text-success-700">{result.created?.length || 0}</div>
                  <div className="text-xs font-medium text-success-700">Created</div>
                </div>
                <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-center">
                  <div className="text-2xl font-bold text-warning-700">{result.errors?.length || 0}</div>
                  <div className="text-xs font-medium text-warning-700">Errors</div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center">
                  <div className="text-2xl font-bold text-zinc-700">{result.total || 0}</div>
                  <div className="text-xs font-medium text-zinc-600">Total</div>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-lg border border-danger-200 bg-danger-50">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-danger-100/50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-danger-800">Row</th>
                        <th className="px-3 py-2 font-medium text-danger-800">Admission</th>
                        <th className="px-3 py-2 font-medium text-danger-800">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-danger-100">
                      {result.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-danger-800">{err.index + 1}</td>
                          <td className="px-3 py-2 font-mono text-danger-800">{err.admissionNo || '-'}</td>
                          <td className="px-3 py-2 text-danger-700">{err.errors?.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleSubmit} isLoading={loading} disabled={!file || preview.length === 0}>
              <FileCsv size={18} weight="bold" className="mr-1.5" />
              Import students
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BulkImportModal;
