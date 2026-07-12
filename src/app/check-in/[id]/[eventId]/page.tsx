import * as React from 'react';
import EventCheckInClient from './EventCheckInClient';

/**
 * Legacy dynamic route handler for event-specific check-ins.
 * Redirects visitors from /check-in/{id}/{eventId} to /check-in/event/?groupId={id}&eventId={eventId}.
 */
export async function generateStaticParams() {
  return [
    { id: 'view', eventId: 'entry' },
    { id: 'group', eventId: 'session' }
  ];
}

export default async function EventCheckInLegacyPage({ 
    params 
}: { 
    params: Promise<{ id: string, eventId: string }> 
}) {
    const { id, eventId } = await params;
    return <EventCheckInClient groupId={id} eventId={eventId} />;
}
