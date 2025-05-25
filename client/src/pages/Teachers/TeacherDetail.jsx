import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Pencil,
  Trash,
  User,
  Envelope,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Chalkboard,
  Book,
  IdentificationCard,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'danger',
  resigned: 'warning',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  resigned: 'Resigned',
};

const formatName = (teacher) => {
  if (teacher?.user?.name) return teacher.user.name;
  return [teacher?.firstName, teacher?.lastName].filter(Boolean).join(' ') || 'Teacher';
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon size={18} className="mt-0.5 flex-shrink-0 text-zinc-400" />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value || '—'}</p>
    </div>
  </div>
);

const TeacherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { data, loading, error, refetch } = useFetch(`/teachers/${id}`);
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const teacher = data?.teacher || data;

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/teachers/${id}`);
      toast.success('Teacher deactivated successfully');
      setShowDelete(false);
      navigate('/teachers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate teacher');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="space-y-6">
        <Button as={Link} to="/teachers" variant="outline" size="sm">
          <ArrowLeft size={16} />
          Back to teachers
        </Button>
        <EmptyState
          title="Teacher not found"
          description={error || 'The requested teacher record could not be loaded.'}
          action={
            <Button as={Link} to="/teachers" variant="outline">
              Back to teachers
            </Button>
          }
        />
      </div>
    );
  }

  const classTeacherLabel =
    teacher.classTeacher?.class && teacher.classTeacher?.sectionName
      ? `${teacher.classTeacher.class.name} - ${teacher.classTeacher.sectionName}`
      : 'Not assigned';

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" as={Link} to="/teachers" aria-label="Back">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar name={formatName(teacher)} src={teacher.user?.avatar} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  {formatName(teacher)}
                </h1>
                <Badge variant={STATUS_VARIANTS[teacher.status] || 'neutral'}>
                  {STATUS_LABELS[teacher.status] || teacher.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {teacher.designation}
                {teacher.department && ` · ${teacher.department}`} · {teacher.employeeId}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button as={Link} to={`/teachers/${id}/edit`} variant="outline">
            <Pencil size={18} />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            <Trash size={18} />
            Deactivate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Personal information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={User} label="Full name" value={formatName(teacher)} />
              <InfoRow icon={Calendar} label="Date of birth" value={teacher.dob ? format(new Date(teacher.dob), 'dd MMM yyyy') : '—'} />
              <InfoRow icon={Envelope} label="Email" value={teacher.email} />
              <InfoRow icon={Phone} label="Phone" value={teacher.phone} />
              <InfoRow icon={MapPin} label="Address" value={teacher.address} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Professional information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={IdentificationCard} label="Employee ID" value={teacher.employeeId} />
              <InfoRow icon={Briefcase} label="Designation" value={teacher.designation} />
              <InfoRow icon={Briefcase} label="Department" value={teacher.department} />
              <InfoRow icon={Calendar} label="Joining date" value={teacher.joiningDate ? format(new Date(teacher.joiningDate), 'dd MMM yyyy') : '—'} />
              <InfoRow icon={Chalkboard} label="Class teacher of" value={classTeacherLabel} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Qualifications & specialization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={Book} label="Qualification" value={teacher.qualification} />
              <InfoRow icon={Book} label="Specialization" value={teacher.specialization} />
              <InfoRow icon={Briefcase} label="Employment type" value={teacher.employmentType?.replace('_', '-')} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Subjects assigned</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(teacher.subjects) && teacher.subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.map((subject) => (
                    <span
                      key={typeof subject === 'object' ? subject._id : subject}
                      className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                    >
                      {typeof subject === 'object' ? subject.name : subject}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No subjects assigned yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Deactivate teacher"
        description="This will mark the teacher as inactive and revoke their class teacher assignment. You can reactivate them later."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading} disabled={deleteLoading}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default TeacherDetail;
