import create from 'zustand';

interface Assignment {
  id: string;
  topic: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  wordCount: number;
  content?: string;
  citations?: Array<{ title: string; url: string; sourceType: string }>;
  createdAt: string;
}

interface AssignmentState {
  assignments: Assignment[];
  currentAssignment: Assignment | null;
  loading: boolean;
  error: string | null;
  setAssignments: (assignments: Assignment[]) => void;
  setCurrentAssignment: (assignment: Assignment | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addAssignment: (assignment: Assignment) => void;
}

export const useAssignmentStore = create<AssignmentState>((set) => ({
  assignments: [],
  currentAssignment: null,
  loading: false,
  error: null,
  setAssignments: (assignments) => set({ assignments }),
  setCurrentAssignment: (currentAssignment) => set({ currentAssignment }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [assignment, ...state.assignments] })),
}));
