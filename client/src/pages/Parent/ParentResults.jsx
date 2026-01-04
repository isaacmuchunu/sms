import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Student as StudentIcon,
  ChartLineUp,
  DownloadSimple,
  Scroll,
} from '@phosphor-icons/react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import useSelectedStudent from '../../hooks/useSelectedStudent';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const gradeVariant = (grade) => {
  if (!grade) return 'neutral';
  const g = String(grade).toUpperCase();
  if (['A', 'A+'].includes(g)) return 'success';
  if (['B', 'B+'].includes(g)) return 'info';
  if (['C', 'D'].includes(g)) return 'warning';
  return 'danger';
};

const ParentResults = () => {
  const { data, loading: loadingChildren, error: childrenError } = useFetch('/students/my-children');
  const students = useMemo(() => data || [], [data]);
  const { selectedId, selectedStudent, setSelectedId } = useSelectedStudent(students);

  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/students/${selectedId}/results`);
        const payload = response.data.data || {};
        if (!cancelled) {
          setMarks(payload.marks || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load results');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  const childOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
    [students]
  );

  const latestExam = useMemo(() => {
    if (!marks.length) return null;
    const first = marks.find((m) => m.exam) || marks[0];
    const examMarks = marks.filter((m) => m.exam && m.exam.id === first.exam.id);
    const totalObtained = examMarks.reduce((sum, m) => sum + (Number(m.marksObtained) || 0), 0);
    const totalMax = examMarks.reduce((sum, m) => sum + (Number(m.maxMarks) || 0), 0);
    const percentage = totalMax ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
    return {
      exam: first.exam,
      percentage,
      count: examMarks.length,
    };
  }, [marks]);

  const handleDownloadReportCard = async () => {
    if (!selectedId) return;
    setDownloading(true);
    try {
      const response = await api.get(`/students/${selectedId}/report-card.pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-card-${selectedStudent?.admissionNo || selectedId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download report card');
    } finally {
      setDownloading(false);
    }
  };

  if (loadingChildren) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (childrenError) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
        Failed to load children: {childrenError}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={StudentIcon}
            title="No children linked"
            description="Your guardian profile is not linked to any student yet. Please contact the school administration."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div {...itemProps}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Results</h1>
            <p className="mt-1 text-sm text-zinc-500">View your children's exam results</p>
          </div>
          {students.length > 1 && (
            <div className="w-full sm:w-72">
              <Select
                label="Select child"
                options={childOptions}
                value={selectedId || ''}
                onChange={(e) => setSelectedId(e.target.value)}
                startIcon={<StudentIcon size={18} />}
              />
            </div>
          )}
        </div>
      </motion.div>

      {selectedStudent && (
        <motion.div {...itemProps}>
          <Card className="bg-accent-50/40">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent-700">
                {selectedStudent.firstName?.[0]}
                {selectedStudent.lastName?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </p>
                <p className="text-xs text-zinc-500">
                  {selectedStudent.admissionNo} · {selectedStudent.class?.name || '-'}{' '}
                  {selectedStudent.section?.name || ''}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : error ? (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
          {error}
        </div>
      ) : (
        <>
          {latestExam && (
            <motion.div {...itemProps}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm text-zinc-500">Latest exam</p>
                      <p className="text-xl font-bold text-zinc-900">
                        {latestExam.exam?.name || 'Latest exam'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {latestExam.count} subject(s) · {latestExam.exam?.type || '-'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm text-zinc-500">Percentage</p>
                      <p className="text-4xl font-bold text-accent-700">{latestExam.percentage}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div {...itemProps}>
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Exam marks</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={downloading}
                  onClick={handleDownloadReportCard}
                >
                  <DownloadSimple size={16} />
                  Download report card
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {marks.length === 0 ? (
                  <EmptyState
                    icon={Scroll}
                    title="No exam results"
                    description="There are no published exam results for the selected child yet."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Exam</th>
                          <th className="px-5 py-3 font-medium">Subject</th>
                          <th className="px-5 py-3 font-medium">Date</th>
                          <th className="px-5 py-3 font-medium">Marks</th>
                          <th className="px-5 py-3 font-medium">Percentage</th>
                          <th className="px-5 py-3 font-medium">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {marks.map((mark) => (
                          <tr key={mark.id} className="hover:bg-zinc-50/60">
                            <td className="px-5 py-3 font-medium text-zinc-900">
                              {mark.exam?.name || '-'}
                            </td>
                            <td className="px-5 py-3 text-zinc-600">
                              {mark.subject?.name || '-'}
                            </td>
                            <td className="px-5 py-3 text-zinc-600">
                              {mark.examSchedule?.examDate
                                ? format(new Date(mark.examSchedule.examDate), 'dd MMM yyyy')
                                : mark.createdAt
                                ? format(new Date(mark.createdAt), 'dd MMM yyyy')
                                : '-'}
                            </td>
                            <td className="px-5 py-3 text-zinc-900">
                              {mark.marksObtained ?? '-'}/{mark.maxMarks ?? '-'}
                            </td>
                            <td className="px-5 py-3 text-zinc-900">
                              {mark.percentage != null ? `${Number(mark.percentage).toFixed(1)}%` : '-'}
                            </td>
                            <td className="px-5 py-3">
                              {mark.grade ? (
                                <Badge variant={gradeVariant(mark.grade)}>{mark.grade}</Badge>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default ParentResults;
