import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  DownloadSimple,
  Users,
  CheckCircle,
  XCircle,
  Trophy,
  TrendUp,
  ChartBar,
  Exam,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const getFullName = (student) =>
  student?.fullName ||
  [student?.firstName, student?.lastName].filter(Boolean).join(' ') ||
  'Unnamed';

const statusBadgeVariant = (result) => (result === 'pass' ? 'success' : 'danger');

const gradeBadgeVariant = (grade) => {
  if (grade?.startsWith('A')) return 'success';
  if (grade?.startsWith('B')) return 'info';
  if (grade?.startsWith('C')) return 'warning';
  return 'danger';
};

const Results = () => {
  const { data: exams, loading: examsLoading } = useFetch('/exams');
  const { data: classes, loading: classesLoading } = useFetch('/classes');

  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState(null);

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
    return [
      { value: '', label: 'All sections' },
      ...selectedClassDoc.sections
        .filter((s) => s.status === 'active')
        .map((s) => ({ value: s._id, label: s.name })),
    ];
  }, [selectedClassDoc]);

  useEffect(() => {
    setResultData(null);
    setResultError(null);

    if (!selectedExam || !selectedClass) return;

    const fetchResults = async () => {
      setResultLoading(true);
      try {
        const params = {};
        if (selectedSection) params.sectionId = selectedSection;
        const res = await api.get(`/exams/${selectedExam}/class/${selectedClass}/results`, {
          params,
        });
        const payload = res.data.data || res.data;
        setResultData(payload);
      } catch (err) {
        setResultError(err.response?.data?.message || 'Failed to load results');
        toast.error(err.response?.data?.message || 'Failed to load results');
      } finally {
        setResultLoading(false);
      }
    };

    fetchResults();
  }, [selectedExam, selectedClass, selectedSection]);

  const summary = resultData?.summary;
  const studentResults = resultData?.studentResults || [];
  const subjectAverages = resultData?.subjectWiseAverages || [];

  const rankedResults = useMemo(() => {
    return [...studentResults]
      .sort((a, b) => b.percentage - a.percentage)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [studentResults]);

  const handleExport = () => {
    if (!resultData || rankedResults.length === 0) {
      toast.error('No results to export');
      return;
    }

    const escapeCsv = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

    const examLabel = examOptions.find((o) => o.value === selectedExam)?.label || selectedExam;
    const classLabel = classOptions.find((o) => o.value === selectedClass)?.label || selectedClass;
    const sectionLabel =
      sectionOptions.find((o) => o.value === selectedSection)?.label ||
      (selectedSection ? selectedSection : 'All sections');

    const rows = [
      ['Exam', examLabel],
      ['Class', classLabel],
      ['Section', sectionLabel],
      [],
      ['Summary'],
      ['Total Students', summary?.totalStudents ?? 0],
      ['Passed', summary?.passCount ?? 0],
      ['Failed', summary?.failCount ?? 0],
      ['Pass Rate %', summary?.passPercentage ?? 0],
      ['Class Average %', summary?.classAverage ?? 0],
      [],
      ['Student Results'],
      ['Rank', 'Roll No', 'Name', 'Total', 'Max', 'Percentage', 'Grade', 'Result'],
      ...rankedResults.map((r) => [
        r.rank,
        r.student?.rollNo ?? '',
        getFullName(r.student),
        r.totalObtained,
        r.totalMax,
        `${r.percentage}%`,
        r.grade,
        r.result === 'pass' ? 'Pass' : 'Fail',
      ]),
    ];

    if (subjectAverages.length > 0) {
      rows.push([]);
      rows.push(['Subject-wise Performance']);
      rows.push(['Subject', 'Code', 'Average', 'Highest', 'Lowest', 'Students']);
      subjectAverages.forEach((s) =>
        rows.push([
          s.subject?.name ?? '',
          s.subject?.code ?? '',
          s.average,
          s.highest,
          s.lowest,
          s.totalStudents,
        ])
      );
    }

    const csv = rows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const safeName = (str) => String(str).replace(/[^a-zA-Z0-9_\-]/g, '_');
    link.download = `results-${safeName(examLabel)}-${safeName(classLabel)}${
      selectedSection ? `-${safeName(sectionLabel)}` : ''
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Results exported as CSV');
  };

  const selectorsReady = selectedExam && selectedClass;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Results</h1>
          <p className="mt-1 text-sm text-zinc-500">View exam results and class performance</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!selectorsReady || resultLoading || !resultData || rankedResults.length === 0}
          className="self-start"
        >
          <DownloadSimple size={18} weight="bold" />
          Export CSV
        </Button>
      </motion.div>

      {/* Selectors */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Exam"
                value={selectedExam}
                onChange={(e) => {
                  setSelectedExam(e.target.value);
                  setSelectedClass('');
                  setSelectedSection('');
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
                }}
                placeholder={classesLoading ? 'Loading...' : 'Select class'}
                options={classOptions}
                disabled={classesLoading}
              />
              <Select
                label="Section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                placeholder={!selectedClass ? 'Select class first' : 'All sections'}
                options={sectionOptions}
                disabled={!selectedClass}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading state */}
      {selectorsReady && resultLoading && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4">
                  <Skeleton className="h-11 w-11 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-zinc-100 px-5 py-3 last:border-0">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {/* Error state */}
      {selectorsReady && !resultLoading && resultError && (
        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
        >
          <p className="font-medium">Failed to load results</p>
          <p className="mt-1 text-danger-600">{resultError}</p>
        </motion.div>
      )}

      {/* Results content */}
      {selectorsReady && !resultLoading && !resultError && resultData && (
        <>
          {/* Summary Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                  <Users size={20} weight="bold" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Total Students</p>
                  <p className="text-xl font-bold tracking-tight text-zinc-900">
                    {summary?.totalStudents ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle size={20} weight="bold" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Passed</p>
                  <p className="text-xl font-bold tracking-tight text-emerald-600">
                    {summary?.passCount ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
                  <XCircle size={20} weight="bold" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Failed</p>
                  <p className="text-xl font-bold tracking-tight text-danger-600">
                    {summary?.failCount ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <Trophy size={20} weight="bold" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Pass Rate</p>
                  <p className="text-xl font-bold tracking-tight text-accent-600">
                    {summary?.passPercentage ?? 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Student Results Table */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Exam size={18} />
                  Student Results
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/60">
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Rank
                      </th>
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Name
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Total
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Percentage
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Grade
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rankedResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12">
                          <EmptyState
                            title="No results found"
                            description="Marks have not been entered for this exam and class yet."
                            icon={Exam}
                          />
                        </td>
                      </tr>
                    ) : (
                      rankedResults.map((r) => (
                        <tr
                          key={r.student._id}
                          className={`transition-colors hover:bg-zinc-50/60 ${
                            r.result === 'fail' ? 'bg-danger-50/30' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5 font-mono font-semibold text-zinc-700">
                            #{r.rank}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-zinc-900">
                              {[r.student.firstName, r.student.lastName]
                                .filter(Boolean)
                                .join(' ')}
                            </div>
                            <div className="text-xs text-zinc-500">
                              Roll No: {r.student.rollNo}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-zinc-700">
                            {r.totalObtained} / {r.totalMax}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 font-medium text-zinc-700">
                              <TrendUp size={14} />
                              {r.percentage}%
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant={gradeBadgeVariant(r.grade)}>{r.grade}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant={statusBadgeVariant(r.result)}>
                              {r.result === 'pass' ? 'Pass' : 'Fail'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>

          {/* Subject-wise Averages */}
          {subjectAverages.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartBar size={18} />
                    Subject-wise Performance
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/60">
                        <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Subject
                        </th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Average
                        </th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Highest
                        </th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Lowest
                        </th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Students
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {subjectAverages.map((s) => (
                        <tr key={s.subject._id} className="hover:bg-zinc-50/60">
                          <td className="px-5 py-3.5 font-medium text-zinc-900">
                            {s.subject.name}
                            <span className="ml-2 text-xs text-zinc-500">({s.subject.code})</span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-zinc-700">
                            {s.average}
                          </td>
                          <td className="px-5 py-3.5 text-center text-zinc-700">{s.highest}</td>
                          <td className="px-5 py-3.5 text-center text-zinc-700">{s.lowest}</td>
                          <td className="px-5 py-3.5 text-center text-zinc-700">
                            {s.totalStudents}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* Empty prompt before selection */}
      {!selectorsReady && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent>
              <EmptyState
                title="Select an exam and class"
                description="Choose an exam and class above to view results."
                icon={Exam}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Results;
