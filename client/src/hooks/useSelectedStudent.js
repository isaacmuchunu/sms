import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const useSelectedStudent = (students) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('student');

  useEffect(() => {
    if (!selectedId && students?.length) {
      const next = new URLSearchParams(searchParams);
      next.set('student', students[0].id);
      setSearchParams(next, { replace: true });
    }
  }, [selectedId, students, searchParams, setSearchParams]);

  const setSelectedId = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('student', id);
    setSearchParams(next, { replace: true });
  };

  const selectedStudent =
    students?.find((s) => s.id === selectedId) || null;

  return { selectedId, selectedStudent, setSelectedId };
};

export default useSelectedStudent;
