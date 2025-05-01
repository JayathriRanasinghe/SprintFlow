
'use client';

import { useCallback } from 'react';
import type { Ticket, TicketStatus } from '@/types/ticket';
import useLocalStorage from './useLocalStorage';

// Mock function for generating IDs
const generateTicketId = () => `TKT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const TICKETS_STORAGE_KEY = 'sprintflow_tickets';

export function useTickets() {
  const [tickets, setTickets] = useLocalStorage<Ticket[]>(TICKETS_STORAGE_KEY, []);

  const addTicket = useCallback((newTicketData: Omit<Ticket, 'id' | 'order'> & { sprintId: string }) => {
    const sprintTickets = tickets.filter(t => t.sprintId === newTicketData.sprintId);
    const maxOrder = sprintTickets.reduce((max, t) => Math.max(max, t.order), 0);
    const newTicket: Ticket = {
      ...newTicketData,
      id: newTicketData.id || generateTicketId(), // Use provided ID or generate
      order: maxOrder + 1,
      // Default values for potentially missing fields
      description: newTicketData.description ?? '',
      status: newTicketData.status ?? 'Todo',
      dailyWorkNote: newTicketData.dailyWorkNote ?? '',
      specialNotes: newTicketData.specialNotes ?? '',
      markForPostScrum: newTicketData.markForPostScrum ?? false,
      postScrumPrepNotes: newTicketData.postScrumPrepNotes ?? '',
      postScrumDiscussionResults: newTicketData.postScrumDiscussionResults ?? '',
      markForDemo: newTicketData.markForDemo ?? false,
      demoTestData: newTicketData.demoTestData ?? '',
    };
    setTickets(prevTickets => [...prevTickets, newTicket]);
    return newTicket; // Return the created ticket
  }, [tickets, setTickets]);

  const updateTicket = useCallback((updatedTicket: Ticket) => {
    setTickets(prevTickets =>
      prevTickets.map(t => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t))
    );
  }, [setTickets]);

  const deleteTicket = useCallback((id: string) => {
    setTickets(prevTickets => prevTickets.filter(t => t.id !== id));
  }, [setTickets]);

  const updateTicketStatus = useCallback((ticketId: string, newStatus: TicketStatus) => {
     updateTicket({ id: ticketId, status: newStatus } as Ticket); // Cast needed as we only update status
  }, [updateTicket]);


  const updateTicketsOrder = useCallback((sprintId: string, orderedTickets: Ticket[]) => {
    // Re-assign order based on new position
    const updatedOrderedTickets = orderedTickets.map((t, index) => ({ ...t, order: index + 1 }));

    setTickets(prevTickets => [
      ...prevTickets.filter(t => t.sprintId !== sprintId), // Keep tickets from other sprints
      ...updatedOrderedTickets // Add the reordered tickets for the current sprint
    ]);
  }, [setTickets]);

  const getTicketsBySprint = useCallback((sprintId: string | undefined): Ticket[] => {
      if (!sprintId) return [];
      return tickets
          .filter(t => t.sprintId === sprintId)
          .sort((a, b) => a.order - b.order);
  }, [tickets]);

  return {
    tickets,
    addTicket,
    updateTicket,
    deleteTicket,
    updateTicketStatus,
    updateTicketsOrder,
    getTicketsBySprint,
    setTickets, // Expose raw setter if needed
  };
}
