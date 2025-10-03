import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Student as StudentIcon,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import useSelectedStudent from '../../hooks/useSelectedStudent';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const issueStatusConfig = {
  issued: { label: 'Issued', variant: 'info' },
  overdue: { label: 'Overdue', variant: 'danger' },
  returned: { label: 'Returned', variant: 'success' },
};

const IssueStatusBadge = ({ status }) => {
  const config = issueStatusConfig[status] || issueStatusConfig.issued;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const ParentLibrary = () => {
  const { data, loading: loadingChildren, error: childrenError } = useFetch('/students/my-children');
  const students = useMemo(() => data || [], [data]);
  const { selectedId, selectedStudent, setSelectedId } = useSelectedStudent(students);

  const { data: issuesData, loading, error } = useFetch(
    selectedId ? `/library/student/${selectedId}/issues` : null
  );
  const issues = useMemo(() => issuesData || [], [issuesData]);
  const shouldReduceMotion = useReducedMotion();

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  const childOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
    [students]
  );

  const isOverdue = (dueDate, status) => {
    if (status === 'returned') return false;
    return new Date(dueDate) < new Date();
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
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Library</h1>
            <p className="mt-1 text-sm text-zinc-500">View borrowed books and library activity</p>
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
        <motion.div {...itemProps}>
          <Card>
            <CardHeader>
              <CardTitle>Borrowed books</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No borrowed books"
                  description="The selected child has no active library book issues."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Book</th>
                        <th className="px-5 py-3 font-medium">Issue date</th>
                        <th className="px-5 py-3 font-medium">Due date</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {issues.map((issue) => {
                        const overdue = isOverdue(issue.dueDate, issue.status);
                        return (
                          <tr key={issue.id} className="hover:bg-zinc-50/60">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <BookOpen size={18} className="text-accent-600" />
                                <div>
                                  <p className="font-medium text-zinc-900">
                                    {issue.book?.title || '-'}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {issue.book?.author || ''}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-zinc-600">
                              {issue.issueDate
                                ? format(new Date(issue.issueDate), 'dd MMM yyyy')
                                : '-'}
                            </td>
                            <td className="px-5 py-3 text-zinc-600">
                              {issue.dueDate
                                ? format(new Date(issue.dueDate), 'dd MMM yyyy')
                                : '-'}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <IssueStatusBadge status={issue.status} />
                                {overdue && <Badge variant="danger">Overdue</Badge>}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-zinc-600">
                              {issue.remarks || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ParentLibrary;
