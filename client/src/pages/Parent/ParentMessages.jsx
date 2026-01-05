import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import {
  ChatTeardropText,
  PaperPlaneRight,
  MagnifyingGlass,
  Chats,
  Check,
  Circle,
} from '@phosphor-icons/react';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'sms_parent_conversations';

const MOCK_TEACHERS = [
  { id: 't1', name: 'Ms. Jane Wanjiku', subject: 'Mathematics', status: 'online' },
  { id: 't2', name: 'Mr. David Otieno', subject: 'English', status: 'offline' },
  { id: 't3', name: 'Mrs. Sarah Muthoni', subject: 'Science', status: 'online' },
  { id: 't4', name: 'Mr. James Kimani', subject: 'History', status: 'offline' },
];

const INITIAL_MESSAGES = {
  t1: [
    {
      id: 101,
      sender: 'teacher',
      text: 'Hello! Just a reminder that the math quiz is on Thursday.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      status: 'read',
    },
    {
      id: 102,
      sender: 'parent',
      text: 'Thank you, we will prepare.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
      status: 'read',
    },
  ],
  t3: [
    {
      id: 103,
      sender: 'teacher',
      text: 'Your child did great in the science lab today.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
      status: 'read',
    },
  ],
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const bubbleVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } },
};

const formatMessageTime = (iso) => {
  const date = new Date(iso);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
  return format(date, 'dd MMM yyyy, h:mm a');
};

const getLastMessage = (messages = []) => {
  if (messages.length === 0) return null;
  return messages[messages.length - 1];
};

const ParentMessages = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState({});
  const [selectedTeacherId, setSelectedTeacherId] = useState(MOCK_TEACHERS[0].id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const scrollRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  // Load conversations from local storage on mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
        const parsed = stored ? JSON.parse(stored) : {};
        const merged = { ...INITIAL_MESSAGES };
        Object.keys(parsed).forEach((key) => {
          if (Array.isArray(parsed[key])) {
            merged[key] = parsed[key];
          }
        });
        setConversations(merged);
        setLoading(false);
      } catch {
        setError('Could not load your messages. Please try again.');
        setLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  // Persist conversations whenever they change.
  useEffect(() => {
    if (loading || error) return;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      }
    } catch {
      // Ignore storage errors so the UI keeps working.
    }
  }, [conversations, loading, error]);

  // Scroll to the latest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations, selectedTeacherId]);

  const selectedTeacher = useMemo(
    () => MOCK_TEACHERS.find((t) => t.id === selectedTeacherId) || MOCK_TEACHERS[0],
    [selectedTeacherId]
  );

  const messages = useMemo(
    () => conversations[selectedTeacherId] || [],
    [conversations, selectedTeacherId]
  );

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return MOCK_TEACHERS;
    return MOCK_TEACHERS.filter(
      (t) => t.name.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query)
    );
  }, [search]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    const newMessage = {
      id: Date.now(),
      sender: 'parent',
      text,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setConversations((prev) => ({
      ...prev,
      [selectedTeacherId]: [...(prev[selectedTeacherId] || []), newMessage],
    }));
    setDraft('');

    // Simulate network delivery and a teacher reply.
    setTimeout(() => {
      setConversations((prev) => {
        const list = prev[selectedTeacherId] || [];
        return {
          ...prev,
          [selectedTeacherId]: list.map((m) =>
            m.id === newMessage.id ? { ...m, status: 'delivered' } : m
          ),
        };
      });

      setTimeout(() => {
        const reply = {
          id: Date.now() + 1,
          sender: 'teacher',
          text: "Thanks for your message. I'll get back to you shortly.",
          timestamp: new Date().toISOString(),
          status: 'read',
        };
        setConversations((prev) => ({
          ...prev,
          [selectedTeacherId]: [...(prev[selectedTeacherId] || []), reply],
        }));
        setSending(false);
        toast.success(`Message sent to ${selectedTeacher.name}`);
      }, 1200);
    }, 700);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-[420px] w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
        {error}
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div {...itemProps}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Messages</h1>
            <p className="mt-1 text-sm text-zinc-500">Send and receive messages with your child&apos;s teachers</p>
          </div>
          <Badge variant="info" className="w-fit">
            Demo mode — messages are stored locally
          </Badge>
        </div>
      </motion.div>

      <motion.div {...itemProps}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Conversations list */}
          <Card className="flex flex-col lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Chats size={18} className="text-accent-600" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4">
              <Input
                placeholder="Search teachers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startIcon={<MagnifyingGlass size={18} />}
              />

              <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                {filteredTeachers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">No teachers found</p>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const isActive = teacher.id === selectedTeacherId;
                    const last = getLastMessage(conversations[teacher.id]);
                    return (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => setSelectedTeacherId(teacher.id)}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                          isActive
                            ? 'border-accent-200 bg-accent-50/60'
                            : 'border-transparent bg-zinc-50/60 hover:bg-zinc-100/60'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar name={teacher.name} size="md" />
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                              teacher.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-300'
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900">{teacher.name}</p>
                            {last && (
                              <span className="shrink-0 text-xs text-zinc-400">
                                {formatMessageTime(last.timestamp)}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-zinc-500">{teacher.subject}</p>
                          {last && (
                            <p className="mt-1 truncate text-xs text-zinc-600">
                              {last.sender === 'parent' ? 'You: ' : ''}
                              {last.text}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat area */}
          <Card className="flex flex-col lg:col-span-2">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <Avatar name={selectedTeacher.name} size="md" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{selectedTeacher.name}</CardTitle>
                  <p className="text-xs text-zinc-500">{selectedTeacher.subject}</p>
                </div>
                <Badge variant={selectedTeacher.status === 'online' ? 'success' : 'neutral'}>
                  <Circle
                    weight="fill"
                    size={8}
                    className={`${selectedTeacher.status === 'online' ? 'text-emerald-600' : 'text-zinc-400'}`}
                  />
                  {selectedTeacher.status === 'online' ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4 p-0">
              <div
                ref={scrollRef}
                className="flex max-h-[420px] min-h-[320px] flex-col gap-3 overflow-y-auto p-4"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <EmptyState
                      icon={ChatTeardropText}
                      title="No messages yet"
                      description={`Send a message to ${selectedTeacher.name.split(' ')[0]} to start the conversation.`}
                    />
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const isParent = message.sender === 'parent';
                      return (
                        <motion.div
                          key={message.id}
                          variants={shouldReduceMotion ? undefined : bubbleVariants}
                          initial={shouldReduceMotion ? undefined : 'hidden'}
                          animate={shouldReduceMotion ? undefined : 'visible'}
                          className={`flex w-full ${isParent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
                              isParent
                                ? 'rounded-br-md bg-accent-600 text-white'
                                : 'rounded-bl-md bg-zinc-100 text-zinc-800'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{message.text}</p>
                            <div
                              className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                                isParent ? 'text-accent-100' : 'text-zinc-500'
                              }`}
                            >
                              <span>{formatMessageTime(message.timestamp)}</span>
                              {isParent && (
                                <span className="flex items-center gap-0.5">
                                  <Check size={12} weight="bold" />
                                  {message.status === 'read' ? <Check size={12} weight="bold" /> : null}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="rounded-2xl rounded-br-md bg-accent-600/90 px-4 py-2.5 text-white">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        Sending…
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="border-t border-zinc-100 p-4">
                <form onSubmit={handleSend} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder={`Message ${selectedTeacher.name.split(' ')[0]}...`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    isLoading={sending}
                    className="shrink-0"
                  >
                    <PaperPlaneRight size={18} />
                    Send
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ParentMessages;
