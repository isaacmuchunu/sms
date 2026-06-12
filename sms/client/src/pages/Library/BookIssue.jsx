import React, { useState } from 'react';
import { Search, BookOpen, ArrowLeftRight, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';

const TABS = [
  { id: 'issue', label: 'Issue Book', icon: BookOpen },
  { id: 'return', label: 'Return Book', icon: ArrowLeftRight },
];

const mockIssuedBooks = [
  { _id: '1', bookTitle: 'NCERT Mathematics - Class 10', isbn: '978-81-7708-550-1', studentName: 'Rahul Sharma', studentId: 'SMS2024001', issueDate: '2025-01-10', dueDate: '2025-01-24', returned: false },
  { _id: '2', bookTitle: 'Concepts of Physics Vol 1', isbn: '978-81-7708-187-8', studentName: 'Priya Patel', studentId: 'SMS2024002', issueDate: '2025-01-05', dueDate: '2025-01-19', returned: false },
  { _id: '3', bookTitle: 'Wings of Fire', isbn: '978-81-7276-0', studentName: 'Amit Kumar', studentId: 'SMS2024003', issueDate: '2024-12-20', dueDate: '2025-01-03', returned: false },
  { _id: '4', bookTitle: 'To Kill a Mockingbird', isbn: '978-0-06-1120', studentName: 'Sneha Gupta', studentId: 'SMS2024004', issueDate: '2025-01-15', dueDate: '2025-01-29', returned: false },
  { _id: '5', bookTitle: 'Introduction to Algorithms', isbn: '978-0-262-0338', studentName: 'Vikram Singh', studentId: 'SMS2024005', issueDate: '2025-01-08', dueDate: '2025-01-22', returned: true },
];

const BookIssue = () => {
  const [activeTab, setActiveTab] = useState('issue');
  const [bookSearch, setBookSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [returnSearch, setReturnSearch] = useState('');
  const [returnBook, setReturnBook] = useState(null);
  const [fine, setFine] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();
  const daysOverdue = (dueDate) => Math.max(0, Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24)));

  const handleIssue = async () => {
    setProcessing(true);
    try {
      await api.post('/library/issue', {
        bookId: selectedBook._id,
        studentId: selectedStudent._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setSelectedBook(null);
      setSelectedStudent(null);
      alert('Book issued successfully');
    } catch {
      alert('Failed to issue book');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    setProcessing(true);
    try {
      await api.post('/library/return', {
        issueId: returnBook._id,
        fine,
      });
      setReturnBook(null);
      setFine(0);
      setShowConfirm(false);
      alert('Book returned successfully');
    } catch {
      alert('Failed to return book');
    } finally {
      setProcessing(false);
    }
  };

  const activeIssues = mockIssuedBooks.filter((b) => !b.returned);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book Issue / Return</h1>
        <p className="text-sm text-gray-500 mt-1">Issue books to students and process returns</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'issue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Book Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">1. Search Book</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ISBN or Title..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {selectedBook && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm font-medium text-emerald-800">{selectedBook.title}</p>
                  <p className="text-xs text-emerald-600">ISBN: {selectedBook.isbn}</p>
                </div>
              )}
            </div>

            {/* Student Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">2. Search Student</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Admission No or Name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {selectedStudent && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">{selectedStudent.name}</p>
                  <p className="text-xs text-blue-600">ID: {selectedStudent.id}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleIssue}
              disabled={processing || !selectedBook || !selectedStudent}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <BookOpen size={16} />
              {processing ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'return' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg mx-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Search Issued Book</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ISBN or Book Title..."
                value={returnSearch}
                onChange={(e) => setReturnSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {returnBook && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-800">{returnBook.bookTitle}</p>
                  <p className="text-xs text-gray-500">Issued to: {returnBook.studentName}</p>
                  <p className="text-xs text-gray-500">Due: {new Date(returnBook.dueDate).toLocaleDateString()}</p>
                </div>
                {isOverdue(returnBook.dueDate) && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">Overdue by {daysOverdue(returnBook.dueDate)} days</span>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600 mb-1">Fine Amount (Rs.)</label>
                      <input
                        type="number"
                        value={fine}
                        onChange={(e) => setFine(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Process Return
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Currently Issued Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Currently Issued Books</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Book</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Student</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Issue Date</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeIssues.map((issue) => {
                const overdue = isOverdue(issue.dueDate);
                return (
                  <tr key={issue._id} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{issue.bookTitle}</p>
                      <p className="text-xs text-gray-500">{issue.isbn}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{issue.studentName}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{new Date(issue.issueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {new Date(issue.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          <AlertTriangle size={12} /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle size={12} /> Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Return" size="sm">
        <p className="text-sm text-gray-600 mb-4">Confirm return of &quot;{returnBook?.bookTitle}&quot; from {returnBook?.studentName}?</p>
        {fine > 0 && <p className="text-sm text-red-600 mb-4">Fine: Rs. {fine}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleReturn} disabled={processing} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">
            {processing ? 'Processing...' : 'Confirm Return'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default BookIssue;
