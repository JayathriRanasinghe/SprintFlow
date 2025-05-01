
export type TicketStatus = 'Todo' | 'In Progress' | 'Code Review' | 'QA Ready' | 'QA' | 'Done';

export interface Ticket {
  id: string;
  sprintId: string;
  name: string;
  description?: string;
  order: number;
  status: TicketStatus;
  dailyWorkNote?: string;
  specialNotes?: string;
  markForPostScrum: boolean;
  postScrumPrepNotes?: string;
  postScrumDiscussionResults?: string;
  markForDemo: boolean;
  demoTestData?: string;
}
