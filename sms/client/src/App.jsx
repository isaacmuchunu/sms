import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/Students/StudentList';
import StudentForm from './pages/Students/StudentForm';
import StudentDetail from './pages/Students/StudentDetail';
import TeacherList from './pages/Teachers/TeacherList';
import TeacherForm from './pages/Teachers/TeacherForm';
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
import Settings from './pages/Settings/Settings';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/students/new" element={<StudentForm />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/teachers" element={<TeacherList />} />
          <Route path="/teachers/new" element={<TeacherForm />} />
          <Route path="/classes" element={<ClassList />} />
          <Route path="/subjects" element={<SubjectList />} />
          <Route path="/attendance" element={<AttendanceMark />} />
          <Route path="/attendance/report" element={<AttendanceReport />} />
          <Route path="/exams" element={<ExamList />} />
          <Route path="/exams/marks" element={<MarksEntry />} />
          <Route path="/exams/results" element={<Results />} />
          <Route path="/finance/fee-structure" element={<FeeStructure />} />
          <Route path="/finance/collection" element={<FeeCollection />} />
          <Route path="/finance/reports" element={<FeeReports />} />
          <Route path="/library" element={<BookList />} />
          <Route path="/library/issue" element={<BookIssue />} />
          <Route path="/transport" element={<RouteList />} />
          <Route path="/hostel" element={<RoomList />} />
          <Route path="/reports" element={<Analytics />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
