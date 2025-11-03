import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  ArrowCounterClockwise,
  MagnifyingGlass,
  Warning,
  CheckCircle,
  Books,
  Student,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const TABS = [
  { id: 'issue', label: 'Issue book', icon: BookOpen },
  { id: 'return', label: 'Return book', icon: ArrowCounterClockwise },
];

const FINE_PER_DAY = 5;
const GRACE_DAYS = 2;
const ISSUE_DAYS = 14;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + ISSUE_DAYS);
  return date.toISOString().split('T')[0];
};

const calculateFine = (dueDate, returnDate = new Date()) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const overdueDays = Math.max(
    0,
    Math.ceil((new Date(returnDate) - new Date(dueDate)) / msPerDay)
  );
  return Math.max(0, overdueDays - GRACE_DAYS) * FINE_PER_DAY;
};

const isOverdue = (dueDate) => new Date(dueDate) < new Date();
const daysOverdue = (dueDate) =>
  Math.max(0, Math.floor((new Date() - new Date(dueDate)) / (24 * 60 * 60 * 1000)));

const getContainerVariants = (reduce) =>
  reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05 },
        },
      };

const getItemVariants = (reduce) =>
  reduce
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] },
        },
      };

const useSearch = (fetcher) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await fetcher(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, fetcher]);

  return { query, setQuery, results, loading };
};

const SearchDropdown = ({
  label,
  placeholder,
  value,
  onChange,
  results,
  loading,
  onSelect,
  renderItem,
  icon: Icon,
  selected,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>
      <div className="relative">
        <Icon
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-300 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white py-1 shadow-dropdown">
          {loading ? (
            <div className="space-y-2 px-3 py-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">No results found</p>
          ) : (
            results.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left transition-colors hover:bg-zinc-50"
              >
                {renderItem(item)}
              </button>
            ))
          )}
        </div>
      )}
      {selected && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle size={16} weight="bold" />
          {selected}
        </div>
      )}
    </div>
  );
};

const BookIssue = () => {
  const [activeTab, setActiveTab] = useState('issue');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dueDate, setDueDate] = useState(getDefaultDueDate);
  const [issueLoading, setIssueLoading] = useState(false);

  const [returnSearch, setReturnSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [manualFine, setManualFine] = useState(0);
  const [returnLoading, setReturnLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const {
    data: activeIssues,
    loading: issuesLoading,
    error: issuesError,
    refetch: refetchIssues,
  } = useFetch('/library/issues', { params: { status: 'issued,overdue' } });

  const searchBooks = useCallback(async (q) => {
    const res = await api.get('/library/books', {
      params: { search: q, status: 'active', limit: 10 },
    });
    const payload = res.data.data || res.data;
    return payload.books || payload || [];
  }, []);

  const searchStudents = useCallback(async (q) => {
    const res = await api.get('/students/search', { params: { q, limit: 10 } });
    const payload = res.data.data || res.data;
    return payload.students || payload.items || payload || [];
  }, []);

  const bookSearch = useSearch(searchBooks);
  const studentSearch = useSearch(searchStudents);

  useEffect(() => {
    if (selectedBook) {
      bookSearch.setQuery(selectedBook.title);
    }
  }, [selectedBook]);

  useEffect(() => {
    if (selectedStudent) {
      const name = [selectedStudent.firstName, selectedStudent.lastName]
        .filter(Boolean)
        .join(' ');
      studentSearch.setQuery(name);
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (selectedIssue) {
      const estimatedFine = calculateFine(selectedIssue.dueDate);
      setManualFine(estimatedFine);
    }
  }, [selectedIssue]);

  const filteredIssues = useMemo(() => {
    if (!activeIssues) return [];
    if (!returnSearch.trim()) return activeIssues;
    const term = returnSearch.toLowerCase();
    return activeIssues.filter((issue) => {
      const bookTitle = typeof issue.book === 'object' ? issue.book?.title : '';
      const isbn = typeof issue.book === 'object' ? issue.book?.isbn : '';
      const studentName =
        typeof issue.student === 'object'
          ? [issue.student?.firstName, issue.student?.lastName].filter(Boolean).join(' ')
          : '';
      const admissionNo =
        typeof issue.student === 'object' ? issue.student?.admissionNo : '';
      return (
        bookTitle?.toLowerCase().includes(term) ||
        isbn?.toLowerCase().includes(term) ||
        studentName?.toLowerCase().includes(term) ||
        admissionNo?.toLowerCase().includes(term)
      );
    });
  }, [activeIssues, returnSearch]);

  const handleIssue = async () => {
    if (!selectedBook || !selectedStudent) return;
    setIssueLoading(true);
    try {
      await api.post('/library/issues', {
        bookId: selectedBook._id,
        studentId: selectedStudent._id,
        dueDate,
      });
      toast.success('Book issued successfully');
      setSelectedBook(null);
      setSelectedStudent(null);
      setDueDate(getDefaultDueDate());
      bookSearch.setQuery('');
      studentSearch.setQuery('');
      refetchIssues();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue book');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedIssue) return;
    setReturnLoading(true);
    try {
      await api.post(`/library/issues/${selectedIssue._id}/return`, {
        fineAmount: manualFine,
      });
      toast.success('Book returned successfully');
      setSelectedIssue(null);
      setManualFine(0);
      setShowConfirm(false);
      setReturnSearch('');
      refetchIssues();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return book');
    } finally {
      setReturnLoading(false);
    }
  };

  const issueStatusBadge = (issue) => {
    const overdue = isOverdue(issue.dueDate);
    if (issue.status === 'overdue' || overdue) {
      return (
        <Badge variant="danger">
          <Warning size={12} weight="bold" className="mr-1" />
          Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="success">
        <CheckCircle size={12} weight="bold" className="mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <motion.div
      className="space-y-6"
      variants={getContainerVariants(shouldReduceMotion)}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={getItemVariants(shouldReduceMotion)}>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Book issue / return</h1>
        <p className="mt-1 text-sm text-zinc-500">Issue books to students and process returns</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={getItemVariants(shouldReduceMotion)}
        className="border-b border-zinc-200"
      >
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-accent-600 text-accent-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Icon size={18} weight={active ? 'bold' : 'regular'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Issue Tab */}
      {activeTab === 'issue' && (
        <motion.div variants={getItemVariants(shouldReduceMotion)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-zinc-900">1. Select book</h3>
              <SearchDropdown
                label="Search book"
                placeholder="ISBN or title"
                value={bookSearch.query}
                onChange={(val) => {
                  bookSearch.setQuery(val);
                  if (selectedBook) setSelectedBook(null);
                }}
                results={bookSearch.results}
                loading={bookSearch.loading}
                onSelect={(book) => setSelectedBook(book)}
                icon={Books}
                selected={
                  selectedBook
                    ? `${selectedBook.title} (${selectedBook.availableCopies ?? 0} available)`
                    : null
                }
                renderItem={(book) => (
                  <div>
                    <p className="font-medium text-zinc-900">{book.title}</p>
                    <p className="text-xs text-zinc-500">
                      {book.author} • {book.isbn} • {book.availableCopies ?? 0} available
                    </p>
                  </div>
                )}
              />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-zinc-900">2. Select student</h3>
              <SearchDropdown
                label="Search student"
                placeholder="Admission number or name"
                value={studentSearch.query}
                onChange={(val) => {
                  studentSearch.setQuery(val);
                  if (selectedStudent) setSelectedStudent(null);
                }}
                results={studentSearch.results}
                loading={studentSearch.loading}
                onSelect={(student) => setSelectedStudent(student)}
                icon={Student}
                selected={
                  selectedStudent
                    ? [
                        selectedStudent.firstName,
                        selectedStudent.lastName,
                        selectedStudent.admissionNo ? `(${selectedStudent.admissionNo})` : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    : null
                }
                renderItem={(student) => {
                  const name = [student.firstName, student.lastName]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <div>
                      <p className="font-medium text-zinc-900">{name}</p>
                      <p className="text-xs text-zinc-500">
                        {student.admissionNo || '—'}
                        {student.currentClass ? ` • ${student.currentClass.name}` : ''}
                      </p>
                    </div>
                  );
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-card">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Due date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={handleIssue}
                disabled={!selectedBook || !selectedStudent}
                isLoading={issueLoading}
              >
                <BookOpen size={18} weight="bold" />
                Issue book
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Return Tab */}
      {activeTab === 'return' && (
        <motion.div variants={getItemVariants(shouldReduceMotion)} className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900">Search issued book</h3>
            <div className="relative max-w-lg">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Book title, ISBN, student name or admission number"
                value={returnSearch}
                onChange={(e) => {
                  setReturnSearch(e.target.value);
                  if (selectedIssue) setSelectedIssue(null);
                }}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-300 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
              />
            </div>

            {issuesLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No matching issues"
                  description="Try a different search term"
                  icon={BookOpen}
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {filteredIssues.map((issue) => {
                  const book = typeof issue.book === 'object' ? issue.book : {};
                  const student = typeof issue.student === 'object' ? issue.student : {};
                  const studentName = [student.firstName, student.lastName]
                    .filter(Boolean)
                    .join(' ');
                  const overdue = isOverdue(issue.dueDate);
                  const selected = selectedIssue?._id === issue._id;
                  return (
                    <button
                      key={issue._id}
                      type="button"
                      onClick={() => setSelectedIssue(issue)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        selected
                          ? 'border-accent-600 bg-accent-50/50'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{book.title || '—'}</p>
                          <p className="text-sm text-zinc-500">
                            {studentName}
                            {student.admissionNo && ` • ${student.admissionNo}`}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Due {formatDate(issue.dueDate)}
                          </p>
                        </div>
                        {overdue && (
                          <Badge variant="danger">
                            <Warning size={12} weight="bold" className="mr-1" />
                            {daysOverdue(issue.dueDate)}d
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedIssue && (
              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-5">
                {isOverdue(selectedIssue.dueDate) && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <Warning size={18} weight="bold" />
                      <span className="text-sm font-medium">
                        Overdue by {daysOverdue(selectedIssue.dueDate)} days
                      </span>
                    </div>
                    <Input
                      label="Fine amount (KSh)"
                      type="number"
                      min={0}
                      value={manualFine}
                      onChange={(e) => setManualFine(Number(e.target.value))}
                      className="mt-3"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setShowConfirm(true)}>Process return</Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Currently Issued Table */}
      <motion.div variants={getItemVariants(shouldReduceMotion)} className="rounded-xl border border-zinc-200 bg-white shadow-card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h3 className="text-base font-semibold text-zinc-900">Currently issued books</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Book</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Student</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Issue date</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Due date</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {issuesLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-2 h-3 w-28" />
                    </td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="mx-auto h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="mx-auto h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="mx-auto h-5 w-20 rounded-full" /></td>
                  </tr>
                ))
              ) : issuesError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12">
                    <EmptyState
                      title="Failed to load issued books"
                      description={issuesError}
                      icon={Books}
                      action={
                        <Button variant="outline" onClick={refetchIssues}>
                          Try again
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : activeIssues?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12">
                    <EmptyState
                      title="No issued books"
                      description="Books that are currently issued will appear here"
                      icon={BookOpen}
                    />
                  </td>
                </tr>
              ) : (
                activeIssues.map((issue) => {
                    const overdue = isOverdue(issue.dueDate);
                    const book = typeof issue.book === 'object' ? issue.book : {};
                    const student = typeof issue.student === 'object' ? issue.student : {};
                    const studentName = [student.firstName, student.lastName]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <tr
                        key={issue._id}
                        className={`transition-colors hover:bg-zinc-50/60 ${
                          overdue ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-zinc-900">{book.title || '—'}</p>
                          <p className="text-xs text-zinc-500">{book.isbn || '—'}</p>
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          {studentName || '—'}
                          {student.admissionNo && (
                            <p className="text-xs text-zinc-500">{student.admissionNo}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center text-zinc-600">
                          {formatDate(issue.issueDate)}
                        </td>
                        <td
                          className={`px-5 py-4 text-center ${
                            overdue ? 'font-medium text-red-600' : 'text-zinc-600'
                          }`}
                        >
                          {formatDate(issue.dueDate)}
                        </td>
                        <td className="px-5 py-4 text-center">{issueStatusBadge(issue)}</td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Confirm Return Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm return"
        size="sm"
      >
        <p className="text-sm text-zinc-600">
          Confirm return of{' '}
          <span className="font-medium text-zinc-900">
            {typeof selectedIssue?.book === 'object' ? selectedIssue.book?.title : 'this book'}
          </span>{' '}
          from the student?
        </p>
        {manualFine > 0 && (
          <p className="mt-3 text-sm font-medium text-red-600">Fine: KSh{manualFine.toFixed(2)}</p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button onClick={handleReturn} isLoading={returnLoading}>
            Confirm return
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default BookIssue;
