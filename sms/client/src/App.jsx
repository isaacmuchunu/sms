import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './components/Layout/DashboardLayout';

// Placeholder pages for routing
const PlaceholderPage = ({ title }) => (
  <div className="animate-fade-in">
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <p className="mt-2 text-gray-500">This page is under construction.</p>
  </div>
);

const Dashboard = () => (
  <div className="animate-fade-in space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-white p-6 shadow-card">
        <p className="text-sm font-medium text-gray-500">Total Students</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">1,245</p>
      </div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <p className="text-sm font-medium text-gray-500">Total Teachers</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">86</p>
      </div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <p className="text-sm font-medium text-gray-500">Classes</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">42</p>
      </div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <p className="text-sm font-medium text-gray-500">Attendance Today</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">94.2%</p>
      </div>
    </div>
  </div>
);

const LoginPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
      <h1 className="text-center text-2xl font-bold text-gray-900">EduManage</h1>
      <p className="mt-2 text-center text-sm text-gray-500">Sign in to your account</p>
      <div className="mt-6 text-center text-sm text-gray-400">
        Login functionality will be implemented here.
      </div>
    </div>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<PlaceholderPage title="Students" />} />
          <Route path="/teachers" element={<PlaceholderPage title="Teachers" />} />
          <Route path="/classes" element={<PlaceholderPage title="Classes" />} />
          <Route path="/subjects" element={<PlaceholderPage title="Subjects" />} />
          <Route path="/attendance" element={<PlaceholderPage title="Attendance" />} />
          <Route path="/exams" element={<PlaceholderPage title="Exams" />} />
          <Route path="/finance/fee-structure" element={<PlaceholderPage title="Fee Structure" />} />
          <Route path="/finance/collection" element={<PlaceholderPage title="Fee Collection" />} />
          <Route path="/finance/reports" element={<PlaceholderPage title="Finance Reports" />} />
          <Route path="/library" element={<PlaceholderPage title="Library" />} />
          <Route path="/transport" element={<PlaceholderPage title="Transport" />} />
          <Route path="/hostel" element={<PlaceholderPage title="Hostel" />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="/announcements" element={<PlaceholderPage title="Announcements" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
