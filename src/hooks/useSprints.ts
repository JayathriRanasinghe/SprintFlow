
'use client';

import { useCallback } from 'react';
import type { Sprint } from '@/types/sprint';
import useLocalStorage from './useLocalStorage';

// Mock function for generating IDs - replace with actual ID generation if needed elsewhere
const generateId = () => `sprint-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SPRINTS_STORAGE_KEY = 'sprintflow_sprints';

export function useSprints() {
  const [sprints, setStoredSprints] = useLocalStorage<Sprint[]>(SPRINTS_STORAGE_KEY, []);

   // Ensure dates are Date objects after loading from localStorage
   const sprintsWithDates = sprints.map(sprint => ({
    ...sprint,
    startDate: new Date(sprint.startDate),
    endDate: new Date(sprint.endDate),
    demoDay: sprint.demoDay ? new Date(sprint.demoDay) : undefined,
  }));


  const setSprints = useCallback((value: Sprint[] | ((val: Sprint[]) => Sprint[])) => {
     const newSprints = typeof value === 'function' ? value(sprintsWithDates) : value;
     // Sort before saving to ensure consistent order
    const sortedSprints = [...newSprints].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    setStoredSprints(sortedSprints);
  }, [setStoredSprints, sprintsWithDates]);


  const addSprint = useCallback((newSprintData: Omit<Sprint, 'id' | 'tickets'>) => {
    const newSprint: Sprint = {
      ...newSprintData,
      id: generateId(),
      tickets: [], // Initialize with empty tickets array
    };
    setSprints(prevSprints => [...prevSprints, newSprint]);
  }, [setSprints]);

  const deleteSprint = useCallback((id: string) => {
    setSprints(prevSprints => prevSprints.filter(sprint => sprint.id !== id));
    // Consider deleting associated tickets as well or handle orphans
  }, [setSprints]);

    const updateSprint = useCallback((updatedSprint: Sprint) => {
    setSprints(prevSprints =>
      prevSprints.map(sprint => (sprint.id === updatedSprint.id ? updatedSprint : sprint))
    );
  }, [setSprints]);


  return {
    sprints: sprintsWithDates, // Return sprints with Date objects
    addSprint,
    deleteSprint,
    updateSprint,
    setSprints, // Expose raw setter if needed, though direct mutation is less common
  };
}
