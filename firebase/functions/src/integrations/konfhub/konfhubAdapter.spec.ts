import { describe, it, expect } from 'vitest';
import { chunkAttendees, type KonfHubAttendee } from './konfhubAdapter.js';

describe('KonfHub Adapter Chunking & Payload Formatting', () => {
  it('correctly segments bulk attendee lists into chunks of 20', () => {
    const attendees: KonfHubAttendee[] = Array.from({ length: 45 }, (_, i) => ({
      fullName: `Attendee ${i + 1}`,
      email: `attendee${i + 1}@example.com`,
      mobileNumber: `98765432${i < 10 ? '0' + i : i}`,
      clubName: 'Rotaract Club of JP Nagar',
    }));

    const chunks = chunkAttendees(attendees);

    expect(chunks.length).toBe(3);
    expect(chunks[0]?.length).toBe(20);
    expect(chunks[1]?.length).toBe(20);
    expect(chunks[2]?.length).toBe(5);
  });
});
