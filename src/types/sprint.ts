
import type { Ticket } from './ticket';

export interface Sprint {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tickets: Ticket[];
  demoDay?: Date; // Calculated as day before endDate
}
