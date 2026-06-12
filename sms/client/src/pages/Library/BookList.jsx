import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const statusBadge = (status, available, total) => {
  if (status === 'Lost') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Lost</span>;
  if (available === 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Issued</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Available</span>;
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Fiction', label: 'Fiction' },
  { value: 'Science', label: 'Science' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'History', label: 'History' },
  { value: 'Reference', label: 'Reference' },
  { value: 'Textbook', label: 'Textbook' },
  { value: 'Biography', label: 'Biography' },
];

const mockBooks = [
  { _id: '1', title: 'NCERT Mathematics - Class 10', author: 'R.D. Sharma', isbn: '978-81-7708-550-1', category: 'Mathematics', totalCopies: 50, availableCopies: 35 },
  { _id: '2', title: 'Concepts of Physics Vol 1', author: 'H.C. Verma', isbn: '978-81-7708-187-8', category: 'Science', totalCopies: 40, availableCopies: 22 },
  { _id: '3', title: 'The Story of Civilization', author: 'Arjun Dev', isbn: '978-93-5115-232-0', category: 'History', totalCopies: 25, availableCopies: 0 },
  { _id: '4', title: 'Oxford English Dictionary', author: 'Oxford', isbn: '978-0-19-8804', category: 'Reference', totalCopies: 10, availableCopies: 8 },
  { _id: '5', title: 'Introduction to Algorithms', author: 'Cormen', isbn: '978-0-262-0338', category: 'Reference', totalCopies: 15, availableCopies: 12 },
  { _id: '6', title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', isbn: '978-81-7276-0', category: 'Biography', totalCopies: 30, availableCopies: 5 },
  { _id: '7', title: 'NCERT Science - Class 9', author: 'NCERT', isbn: '978-93-5007-', category: 'Textbook', totalCopies: 60, availableCopies: 45 },
  { _id: '8', title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0-06-1120', category: 'Fiction', totalCopies: 20, availableCopies: 18 },
];

const BookList = () => {
  const { data: booksFromApi, loading, error, refetch } = useFetch('/library/books');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category: '', totalCopies: '', availableCopies: '' });
  const [formLoading, setFormLoading] = useState(false);

  const books = booksFromApi || mockBooks;

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        !searchTerm ||
        b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.isbn?.includes(searchTerm);
      const matchesCategory = !filterCategory || b.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, searchTerm, filterCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/library/books', form);
      setShowForm(false);
      refetch();
    } catch {
      alert('Failed to add book');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'author', label: 'Author', sortable: true },
    { key: 'isbn', label: 'ISBN', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'totalCopies', label: 'Total', sortable: true },
    { key: 'availableCopies', label: 'Available', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => statusBadge(row.status, row.availableCopies, row.totalCopies),
    },
  ];

  const actions = (row) => (
    <>
      <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil size={16} /></button>
      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library</h1>
          <p className="text-sm text-gray-500 mt-1">Manage book catalog and inventory</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Add Book
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <SelectField
            name="category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={CATEGORY_OPTIONS}
            className="w-48"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filteredBooks} loading={loading} error={error} actions={actions} pageSize={10} />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Book" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Title" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <InputField label="Author" name="author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
            <InputField label="ISBN" name="isbn" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} required />
            <SelectField
              label="Category"
              name="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORY_OPTIONS.filter((o) => o.value)}
              required
            />
            <InputField label="Total Copies" name="totalCopies" type="number" value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} required />
            <InputField label="Available Copies" name="availableCopies" type="number" value={form.availableCopies} onChange={(e) => setForm({ ...form, availableCopies: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={formLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
              {formLoading ? 'Adding...' : 'Add Book'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BookList;
