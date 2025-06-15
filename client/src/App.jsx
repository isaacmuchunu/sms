import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleProtectedRoute from './components/ModuleProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/Students/StudentList';
import StudentForm from './pages/Students/StudentForm';
import StudentDetail from './pages/Students/StudentDetail';
import TeacherList from './pages/Teachers/TeacherList';
import TeacherForm from './pages/Teachers/TeacherForm';
import TeacherDetail from './pages/Teachers/TeacherDetail';
import ClassList from './pages/Classes/ClassList';
import SubjectList from './pages/Subjects/SubjectList';
import AttendanceMark from './pages/Attendance/AttendanceMark';
import AttendanceReport from './pages/Attendance/AttendanceReport';
import ExamList from './pages/Exams/ExamList';
import MarksEntry from './pages/Exams/MarksEntry';
import Results from './pages/Exams/Results';
import FeeStructure from './pages/Fees/FeeStructure';
import FeeCollection from './pages/Fees/FeeCollection';
import FeeReports from './pages/Fees/FeeReports';
import BookList from './pages/Library/BookList';
import BookIssue from './pages/Library/BookIssue';
import RouteList from './pages/Transport/RouteList';
import RoomList from './pages/Hostel/RoomList';
import Analytics from './pages/Reports/Analytics';
import Announcements from './pages/Notifications/Announcements';
import NotificationList from './pages/Notifications/NotificationList';
import Settings from './pages/Settings/Settings';
import Profile from './pages/Profile/Profile';
import UserList from './pages/Users/UserList';
import SchoolList from './pages/Schools/SchoolList';
import ModuleRequests from './pages/Modules/ModuleRequests';
import SetPassword from './pages/Auth/SetPassword';
import ParentDashboard from './pages/Parent/ParentDashboard';
import ParentAttendance from './pages/Parent/ParentAttendance';
import ParentFees from './pages/Parent/ParentFees';
import ParentResults from './pages/Parent/ParentResults';
import ParentMeetings from './pages/Parent/ParentMeetings';
import ParentLibrary from './pages/Parent/ParentLibrary';

const RoleBasedRedirect = ({ fallback = '/dashboard' }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'parent') return <Navigate to="/parent" replace />;
  return <Navigate to={fallback} replace />;
};

const DashboardOrParent = () => {
  const { user } = useAuth();
  if (user?.role === 'parent') return <Navigate to="/parent" replace />;
  return <Dashboard />;
};

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'accountant', 'librarian', 'staff', 'super_admin']}><DashboardOrParent /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><StudentList /></ProtectedRoute>} />
          <Route path="/students/new" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><StudentForm /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><StudentDetail /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'teacher', 'principal']}><TeacherList /></ProtectedRoute>} />
          <Route path="/teachers/new" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><TeacherForm /></ProtectedRoute>} />
          <Route path="/teachers/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'teacher', 'principal']}><TeacherDetail /></ProtectedRoute>} />
          <Route path="/teachers/:id/edit" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><TeacherForm /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><UserList /></ProtectedRoute>} />
          <Route path="/schools" element={<ProtectedRoute allowedRoles={['super_admin']}><SchoolList /></ProtectedRoute>} />
          <Route path="/module-requests" element={<ProtectedRoute allowedRoles={['admin']}><ModuleRequests /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><ClassList /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><SubjectList /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><AttendanceMark /></ProtectedRoute>} />
          <Route path="/attendance/report" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><AttendanceReport /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><ExamList /></ProtectedRoute>} />
          <Route path="/exams/marks" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}><MarksEntry /></ProtectedRoute>} />
          <Route path="/exams/results" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'student', 'parent']}><Results /></ProtectedRoute>} />
          <Route path="/finance/fee-structure" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'accountant', 'principal']}><FeeStructure /></ProtectedRoute>} />
          <Route path="/finance/collection" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'accountant', 'principal']}><FeeCollection /></ProtectedRoute>} />
          <Route path="/finance/reports" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'accountant', 'principal']}><FeeReports /></ProtectedRoute>} />
          <Route path="/library" element={<ModuleProtectedRoute module="library" allowedRoles={['admin', 'librarian', 'teacher', 'student', 'super_admin']}><BookList /></ModuleProtectedRoute>} />
          <Route path="/library/issue" element={<ModuleProtectedRoute module="library" allowedRoles={['admin', 'librarian']}><BookIssue /></ModuleProtectedRoute>} />
          <Route path="/transport" element={<ModuleProtectedRoute module="transport" allowedRoles={['admin', 'transport_manager']}><RouteList /></ModuleProtectedRoute>} />
          <Route path="/hostel" element={<ModuleProtectedRoute module="hostel" allowedRoles={['admin', 'warden']}><RoomList /></ModuleProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'teacher', 'principal']}><Analytics /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'staff']}><Announcements /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'staff', 'student', 'parent']}><NotificationList /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'staff', 'super_admin']}><Settings /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'staff', 'super_admin', 'accountant', 'librarian', 'transport_manager', 'warden', 'student', 'parent']}><Profile /></ProtectedRoute>} />
          <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/attendance" element={<ProtectedRoute allowedRoles={['parent']}><ParentAttendance /></ProtectedRoute>} />
          <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={['parent']}><ParentFees /></ProtectedRoute>} />
          <Route path="/parent/results" element={<ProtectedRoute allowedRoles={['parent']}><ParentResults /></ProtectedRoute>} />
          <Route path="/parent/meetings" element={<ProtectedRoute allowedRoles={['parent']}><ParentMeetings /></ProtectedRoute>} />
          <Route path="/parent/library" element={<ProtectedRoute allowedRoles={['parent']}><ParentLibrary /></ProtectedRoute>} />
          <Route path="/" element={<RoleBasedRedirect />} />
        </Route>
        <Route path="*" element={<RoleBasedRedirect />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
