import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  VideoCamera,
  Student as StudentIcon,
  Users,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
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

const typeIcon = (type) => {
  if (type === 'online') return VideoCamera;
  if (type === 'phone') return Users;
  return MapPin;
};

const ParentMeetings = () => {
  const { data, loading, error } = useFetch('/meetings?upcoming=true');
  const meetings = useMemo(() => data || [], [data]);
  const shouldReduceMotion = useReducedMotion();

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
        Failed to load meetings: {error}
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div {...itemProps}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Meetings</h1>
          <p className="mt-1 text-sm text-zinc-500">Upcoming parent-teacher meetings</p>
        </div>
      </motion.div>

      {meetings.length === 0 ? (
        <motion.div {...itemProps}>
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={Calendar}
                title="No upcoming meetings"
                description="You have no scheduled parent-teacher meetings at the moment."
              />
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {meetings.map((meeting) => {
            const TypeIcon = typeIcon(meeting.type);
            return (
              <motion.div key={meeting.id} {...itemProps}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{meeting.title}</CardTitle>
                        {meeting.description && (
                          <p className="mt-1 text-sm text-zinc-500">{meeting.description}</p>
                        )}
                      </div>
                      <Badge variant="accent" className="capitalize">
                        {meeting.type || 'in-person'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-zinc-700">
                      <Calendar size={18} className="text-accent-600" />
                      <span>
                        {meeting.scheduledAt
                          ? format(new Date(meeting.scheduledAt), 'dd MMM yyyy, h:mm a')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-700">
                      <Clock size={18} className="text-accent-600" />
                      <span>{meeting.duration || 0} minutes</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-700">
                      <TypeIcon size={18} className="text-accent-600" />
                      <span>
                        {meeting.type === 'online'
                          ? meeting.meetLink || 'Online link will be shared soon'
                          : meeting.location || 'School office'}
                      </span>
                    </div>
                    {meeting.student && (
                      <div className="flex items-center gap-3 text-sm text-zinc-700">
                        <StudentIcon size={18} className="text-accent-600" />
                        <span>
                          {meeting.student.firstName} {meeting.student.lastName}
                        </span>
                      </div>
                    )}
                    {meeting.organizer && (
                      <div className="flex items-center gap-3 text-sm text-zinc-700">
                        <Users size={18} className="text-accent-600" />
                        <span>Organizer: {meeting.organizer.name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ParentMeetings;
