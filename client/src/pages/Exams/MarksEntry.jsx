import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FloppyDisk,
  PaperPlaneTilt,
  CheckCircle,
  Warning,
  Plus,
  Student,
  CalendarBlank,
  Clock,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const emptyScheduleForm = {
  examDate: '',
  startTime: '09:00',
  endTime: '11:00',
  maxMarks: 100,
  passMarks: 40,
};

const MarksEntry = () => {
  const { data: exams, loading: examsLoading } = useFetch('/exams');
  const { data: classes, loading: classesLoading } = useFetch('/classes');

  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [scheduleFormLoading, setScheduleFormLoading] = useState(false);

  const [saveLoading, setSaveLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] },
    },
  };

  const examOptions = useMemo(() => {
    if (!Array.isArray(exams)) return [];
    return exams.map((e) => ({ value: e._id, label: e.name }));
  }, [exams]);

  const classOptions = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    return classes.map((c) => ({ value: c._id, label: c.name }));
  }, [classes]);

  const selectedClassDoc = useMemo(() => {
    if (!Array.isArray(classes) || !selectedClass) return null;
    return classes.find((c) => c._id === selectedClass);
  }, [classes, selectedClass]);

  const sectionOptions = useMemo(() => {
    if (!selectedClassDoc?.sections) return [];
    return selectedClassDoc.sections
      .filter((s) => s.status === 'active')
      .map((s) => ({ value: s._id, label: s.name }));
  }, [selectedClassDoc]);

  const subjectOptions = useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    return subjects.map((s) => ({ value: s._id, label: `${s.name} (${s.code})` }));
  }, [subjects]);

  // Load subjects when class changes
  useEffect(() => {
    if (!selectedClass) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const res = await api.get('/subjects', { params: { applicableClass: selectedClass } });
        const payload = res.data.data || res.data;
        const list = Array.isArray(payload) ? payload : payload?.subjects || [];
        setSubjects(list);
      } catch {
        setSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedClass]);

  // Load schedule, students and marks when all selections are made
  useEffect(() => {
    setSchedule(null);
    setRows([]);
    setScheduleError(null);
    setShowCreateSchedule(false);

    if (!selectedExam || !selectedClass || !selectedSection || !selectedSubject) {
      return;
    }

    const load = async () => {
      setScheduleLoading(true);
      try {
        const schedulesRes = await api.get(`/exams/${selectedExam}/schedules`, {
          params: { class: selectedClass, section: selectedSection, subject: selectedSubject },
        });
        const payload = schedulesRes.data.data || schedulesRes.data;
        const scheduleList = Array.isArray(payload) ? payload : payload?.schedules || [];

        if (scheduleList.length === 0) {
          setSchedule(null);
          setShowCreateSchedule(true);
          setScheduleLoading(false);
          return;
        }

        const activeSchedule = scheduleList[0];
        setSchedule(activeSchedule);
        setShowCreateSchedule(false);
        setScheduleLoading(false);

        setRowsLoading(true);
        const [studentsRes, marksRes] = await Promise.all([
          api.get('/students', {
            params: {
              class: selectedClass,
              section: selectedSection,
              status: 'active',
              limit: 200,
            },
          }),
          api.get(`/exams/${selectedExam}/schedules/${activeSchedule._id}/marks`, {
            params: { limit: 200 },
          }),
        ]);

        const studentsPayload = studentsRes.data.data || studentsRes.data;
        const studentList = Array.isArray(studentsPayload)
          ? studentsPayload
          : studentsPayload?.students || [];

        const marksPayload = marksRes.data.data || marksRes.data;
        const markList = Array.isArray(marksPayload) ? marksPayload : marksPayload?.marks || [];

        const mergedRows = studentList.map((student) => {
          const mark = markList.find(
            (m) => m.student?._id?.toString() === student._id?.toString()
          );
          return {
            student,
            mark,
            marksObtained: mark?.marksObtained ?? '',
            remarks: mark?.remarks ?? '',
          };
        });

        setRows(mergedRows);
      } catch (err) {
        setScheduleError(err.response?.data?.message || 'Failed to load marks data');
      } finally {
        setScheduleLoading(false);
        setRowsLoading(false);
      }
    };

    load();
  }, [selectedExam, selectedClass, selectedSection, selectedSubject]);

  const updateMark = (studentId, value) => {
    const max = schedule?.maxMarks ?? 100;
    let num = value === '' ? '' : Math.min(Number(value), max);
    if (num !== '' && num < 0) num = 0;
    setRows((prev) =>
      prev.map((row) =>
        row.student._id === studentId ? { ...row, marksObtained: num } : row
      )
    );
    setLastSaved(false);
  };

  const updateRemarks = (studentId, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.student._id === studentId ? { ...row, remarks: value } : row
      )
    );
    setLastSaved(false);
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!selectedExam || !selectedClass || !selectedSection || !selectedSubject) return;

    setScheduleFormLoading(true);
    try {
      const res = await api.post(`/exams/${selectedExam}/schedules`, {
        class: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        ...scheduleForm,
      });
      const payload = res.data.data || res.data;
      setSchedule(payload?.schedule);
      setShowCreateSchedule(false);
      toast.success('Exam schedule created');

      // Now load students and marks for the new schedule
      setRowsLoading(true);
      const studentsRes = await api.get('/students', {
        params: {
          class: selectedClass,
          section: selectedSection,
          status: 'active',
          limit: 200,
        },
      });
      const studentsPayload = studentsRes.data.data || studentsRes.data;
      const studentList = Array.isArray(studentsPayload)
        ? studentsPayload
        : studentsPayload?.students || [];

      setRows(
        studentList.map((student) => ({
          student,
          mark: null,
          marksObtained: '',
          remarks: '',
        }))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create schedule');
    } finally {
      setScheduleFormLoading(false);
      setRowsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!schedule) return;
    const entries = rows
      .filter((row) => row.marksObtained !== '' && row.marksObtained !== null)
      .map((row) => ({
        student: row.student._id,
        marksObtained: Number(row.marksObtained),
        remarks: row.remarks,
      }));

    if (entries.length === 0) {
      toast.error('Enter at least one mark to save');
      return;
    }

    setSaveLoading(true);
    try {
      const res = await api.post(`/exams/${selectedExam}/schedules/${schedule._id}/marks`, {
        marks: entries,
      });
      toast.success(res.data.message || 'Marks saved as draft');
      setLastSaved(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!schedule) return;
    setSubmitLoading(true);
    try {
      const res = await api.post(`/exams/${selectedExam}/schedules/${schedule._id}/submit`);
      toast.success(res.data.message || 'Marks submitted for approval');
      setLastSaved(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit marks');
    } finally {
      setSubmitLoading(false);
    }
  };

  const enteredCount = rows.filter((r) => r.marksObtained !== '').length;
  const allEntered = rows.length > 0 && enteredCount === rows.length;

  const selectorsReady = selectedExam && selectedClass && selectedSection && selectedSubject;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Marks Entry</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter and manage exam marks by class and subject</p>
      </motion.div>

      {/* Selectors */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Exam"
                value={selectedExam}
                onChange={(e) => {
                  setSelectedExam(e.target.value);
                  setSelectedClass('');
                  setSelectedSection('');
                  setSelectedSubject('');
                }}
                placeholder={examsLoading ? 'Loading...' : 'Select exam'}
                options={examOptions}
                disabled={examsLoading}
              />
              <Select
                label="Class"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                  setSelectedSubject('');
                }}
                placeholder={classesLoading ? 'Loading...' : 'Select class'}
                options={classOptions}
                disabled={classesLoading}
              />
              <Select
                label="Section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                placeholder={!selectedClass ? 'Select class first' : 'Select section'}
                options={sectionOptions}
                disabled={!selectedClass}
              />
              <Select
                label="Subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                placeholder={subjectsLoading ? 'Loading...' : 'Select subject'}
                options={subjectOptions}
                disabled={!selectedClass || subjectsLoading}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Schedule meta / create schedule */}
      {selectorsReady && (
        <motion.div variants={itemVariants}>
          {scheduleLoading ? (
            <Card>
              <CardContent className="flex items-center gap-3 text-sm text-zinc-500">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ) : scheduleError ? (
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              {scheduleError}
            </div>
          ) : showCreateSchedule ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarBlank size={18} />
                  Create Exam Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-zinc-500">
                  No schedule found for the selected exam, class, section and subject. Create one to start entering marks.
                </p>
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input
                      label="Exam Date"
                      type="date"
                      value={scheduleForm.examDate}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, examDate: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="Start Time"
                      type="time"
                      value={scheduleForm.startTime}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, startTime: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="End Time"
                      type="time"
                      value={scheduleForm.endTime}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, endTime: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Maximum Marks"
                      type="number"
                      min={0}
                      value={scheduleForm.maxMarks}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, maxMarks: Number(e.target.value) })
                      }
                      required
                    />
                    <Input
                      label="Passing Marks"
                      type="number"
                      min={0}
                      value={scheduleForm.passMarks}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, passMarks: Number(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={scheduleFormLoading}>
                      <Plus size={18} weight="bold" />
                      Create Schedule
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : schedule ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <CalendarBlank size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Exam Date</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {format(new Date(schedule.examDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Time</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {schedule.startTime} - {schedule.endTime}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <Student size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Students</p>
                    <p className="text-sm font-semibold text-zinc-900">{rows.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Marks Entered</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {enteredCount} / {rows.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* Marks Table */}
      {schedule && (
        <motion.div variants={itemVariants}>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Roll No
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Name
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Marks (0-{schedule.maxMarks})
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Grade
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rowsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-5 py-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-5 py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-5 py-3">
                          <Skeleton className="mx-auto h-8 w-24 rounded-lg" />
                        </td>
                        <td className="px-5 py-3">
                          <Skeleton className="mx-auto h-5 w-12 rounded-full" />
                        </td>
                        <td className="px-5 py-3">
                          <Skeleton className="h-8 w-full rounded-lg" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12">
                        <EmptyState
                          title="No students found"
                          description="There are no active students in the selected class and section."
                          icon={Student}
                        />
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const marks = row.marksObtained;
                      const max = schedule.maxMarks;
                      const pass = schedule.passMarks;
                      const grade = row.mark?.grade || '-';
                      const isFail = marks !== '' && Number(marks) < pass;
                      const isPass = marks !== '' && Number(marks) >= pass;

                      return (
                        <tr key={row.student._id} className="hover:bg-zinc-50/60">
                          <td className="px-5 py-3.5 font-medium text-zinc-700">
                            {row.student.rollNo}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-zinc-900">
                              {[row.student.firstName, row.student.lastName]
                                .filter(Boolean)
                                .join(' ')}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {row.student.admissionNo}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <input
                              type="number"
                              min={0}
                              max={max}
                              value={marks}
                              onChange={(e) => updateMark(row.student._id, e.target.value)}
                              className={`mx-auto block h-10 w-24 rounded-lg border px-3 text-center text-sm transition-colors focus:outline-none focus:ring-2 ${
                                isFail
                                  ? 'border-danger-300 bg-danger-50 text-danger-700 focus:border-danger-500 focus:ring-danger-500/20'
                                  : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 focus:border-accent-600 focus:ring-accent-600/20'
                              }`}
                            />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge
                              variant={
                                isFail ? 'danger' : isPass && grade.startsWith('A') ? 'success' : 'neutral'
                              }
                            >
                              {grade}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <input
                              type="text"
                              value={row.remarks}
                              onChange={(e) => updateRemarks(row.student._id, e.target.value)}
                              placeholder="Optional"
                              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 transition-colors hover:border-zinc-300 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            {!rowsLoading && rows.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-zinc-500">
                  {lastSaved ? (
                    <span className="inline-flex items-center gap-1.5 text-accent-600">
                      <CheckCircle size={16} weight="bold" />
                      Draft saved
                    </span>
                  ) : !allEntered ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600">
                      <Warning size={16} weight="bold" />
                      {enteredCount} of {rows.length} marks entered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-accent-600">
                      <CheckCircle size={16} weight="bold" />
                      All marks entered
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    isLoading={saveLoading}
                    disabled={enteredCount === 0}
                  >
                    <FloppyDisk size={18} weight="bold" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    isLoading={submitLoading}
                    disabled={enteredCount === 0}
                  >
                    <PaperPlaneTilt size={18} weight="bold" />
                    Submit for Approval
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MarksEntry;
