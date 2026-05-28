import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  Books,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const CATEGORY_OPTIONS = [
  { value: 'Fiction', label: 'Fiction' },
  { value: 'Science', label: 'Science' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'History', label: 'History' },
  { value: 'Reference', label: 'Reference' },
  { value: 'Textbook', label: 'Textbook' },
  { value: 'Biography', label: 'Biography' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lost', label: 'Lost' },
];

const getBookStatusBadge = (book) => {
  if (book.status === 'lost') return <Badge variant="danger">Lost</Badge>;
  if (book.status === 'inactive') return <Badge variant="neutral">Inactive</Badge>;
  if ((book.availableCopies ?? 0) === 0) return <Badge variant="warning">Issued</Badge>;
  return <Badge variant="success">Available</Badge>;
};

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

const BookList = () => {
  const { data: books, loading, error, refetch } = useFetch('/library/books');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [deleteBook, setDeleteBook] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const filteredBooks = useMemo(() => {
    if (!books) return [];
    return books.filter((b) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        b.title?.toLowerCase().includes(term) ||
        b.author?.toLowerCase().includes(term) ||
        b.isbn?.toLowerCase().includes(term);
      const matchesCategory = !filterCategory || b.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, searchTerm, filterCategory]);

  const initialFormState = {
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    category: '',
    publishYear: '',
    shelfLocation: '',
    totalCopies: '',
    status: 'active',
  };

  const [form, setForm] = useState(initialFormState);

  const openAddForm = () => {
    setEditingBook(null);
    setForm(initialFormState);
    setShowForm(true);
  };

  const openEditForm = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      category: book.category || '',
      publishYear: book.publishYear || '',
      shelfLocation: book.shelfLocation || '',
      totalCopies: book.totalCopies ?? '',
      status: book.status || 'active',
    });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...form,
        publishYear: form.publishYear ? Number(form.publishYear) : undefined,
        totalCopies: form.totalCopies ? Number(form.totalCopies) : 1,
      };
      if (editingBook) {
        await api.put(`/library/books/${editingBook._id}`, payload);
        toast.success('Book updated successfully');
      } else {
        await api.post('/library/books', payload);
        toast.success('Book added successfully');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save book');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBook) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/library/books/${deleteBook._id}`);
      toast.success('Book deactivated successfully');
      setDeleteBook(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate book');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={getContainerVariants(shouldReduceMotion)}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={getItemVariants(shouldReduceMotion)}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Library</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage book catalog and inventory</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus size={18} weight="bold" />
          Add book
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={getItemVariants(shouldReduceMotion)} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-300 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            />
          </div>
          <Select
            name="category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS]}
            className="w-full sm:w-56"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={getItemVariants(shouldReduceMotion)} className="rounded-xl border border-zinc-200 bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Book</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">ISBN</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Category</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Copies</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="mt-2 h-3 w-32" />
                    </td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-5 py-4"><Skeleton className="ml-auto h-4 w-16" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12">
                    <EmptyState
                      title="Failed to load books"
                      description={error}
                      icon={Books}
                      action={
                        <Button variant="outline" onClick={refetch}>
                          Try again
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12">
                    <EmptyState
                      title="No books found"
                      description={
                        searchTerm || filterCategory
                          ? 'Try adjusting your search or filters'
                          : 'Add books to start building the library catalog'
                      }
                      icon={Books}
                      action={
                        !searchTerm && !filterCategory && (
                          <Button onClick={openAddForm}>
                            <Plus size={18} weight="bold" />
                            Add book
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => (
                  <motion.tr
                    key={book._id}
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={shouldReduceMotion ? { duration: 0 } : undefined}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-900">{book.title}</p>
                      <p className="text-xs text-zinc-500">{book.author}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-700">{book.isbn || '—'}</td>
                    <td className="px-5 py-4 text-zinc-700">{book.category || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono tabular-nums text-zinc-700">
                        {book.availableCopies ?? 0}
                      </span>
                      <span className="text-zinc-400"> / </span>
                      <span className="font-mono tabular-nums text-zinc-700">
                        {book.totalCopies ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">{getBookStatusBadge(book)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditForm(book)}
                          className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                          aria-label="Edit book"
                          title="Edit"
                        >
                          <PencilSimple size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteBook(book)}
                          className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Deactivate book"
                          title="Deactivate"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingBook ? 'Edit book' : 'Add book'}
        description={editingBook ? 'Update book details in the catalog' : 'Add a new book to the library catalog'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Title"
              name="title"
              value={form.title}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Author"
              name="author"
              value={form.author}
              onChange={handleFormChange}
              required
            />
            <Input
              label="ISBN"
              name="isbn"
              value={form.isbn}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Publisher"
              name="publisher"
              value={form.publisher}
              onChange={handleFormChange}
            />
            <Select
              label="Category"
              name="category"
              value={form.category}
              onChange={handleFormChange}
              options={[{ value: '', label: 'Select category' }, ...CATEGORY_OPTIONS]}
            />
            <Input
              label="Publish year"
              name="publishYear"
              type="number"
              value={form.publishYear}
              onChange={handleFormChange}
              min={1000}
              max={new Date().getFullYear()}
            />
            <Input
              label="Shelf location"
              name="shelfLocation"
              value={form.shelfLocation}
              onChange={handleFormChange}
            />
            <Input
              label="Total copies"
              name="totalCopies"
              type="number"
              value={form.totalCopies}
              onChange={handleFormChange}
              min={1}
              required={!editingBook}
              disabled={!!editingBook}
              helper={editingBook ? 'Copy count is managed through book copies' : ''}
            />
            <Select
              label="Status"
              name="status"
              value={form.status}
              onChange={handleFormChange}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              {editingBook ? 'Save changes' : 'Add book'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteBook}
        onClose={() => setDeleteBook(null)}
        title="Deactivate book"
        description="This will mark the book as inactive. Active issues must be cleared first."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setDeleteBook(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default BookList;
