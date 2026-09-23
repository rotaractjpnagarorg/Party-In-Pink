import { describe, expect, it, vi } from 'vitest';
import { getClientAddress, enforcePublicRateLimit } from './publicRateLimit.js';
import { db } from '../config/firebase.js';

describe('publicRateLimit middleware', () => {
  describe('getClientAddress', () => {
    it('returns rawRequest.ip when present', () => {
      const address = getClientAddress({ ip: '203.0.113.195' });
      expect(address).toBe('203.0.113.195');
    });

    it('falls back to socket.remoteAddress if ip is missing', () => {
      const address = getClientAddress({ socket: { remoteAddress: '198.51.100.42' } });
      expect(address).toBe('198.51.100.42');
    });

    it('returns "unknown" if both ip and socket address are missing', () => {
      const address = getClientAddress({});
      expect(address).toBe('unknown');
    });
  });

  describe('enforcePublicRateLimit', () => {
    it('allows requests within limit and updates transaction', async () => {
      const mockSet = vi.fn();
      const mockGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ count: 2 }),
      });

      const mockDoc = { id: 'test-key' };
      vi.spyOn(db, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc),
      } as any);

      vi.spyOn(db, 'runTransaction').mockImplementation(async (callback: any) => {
        return callback({
          get: mockGet,
          set: mockSet,
        });
      });

      await expect(
        enforcePublicRateLimit('test-action', '127.0.0.1', 5, 60000, 1)
      ).resolves.toBeUndefined();

      expect(mockSet).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          action: 'test-action',
          count: 3,
        }),
        { merge: true }
      );
    });

    it('throws resource-exhausted error when quota exceeded', async () => {
      const mockSet = vi.fn();
      const mockGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ count: 5 }),
      });

      const mockDoc = { id: 'test-key' };
      vi.spyOn(db, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc),
      } as any);

      vi.spyOn(db, 'runTransaction').mockImplementation(async (callback: any) => {
        return callback({
          get: mockGet,
          set: mockSet,
        });
      });

      await expect(
        enforcePublicRateLimit('test-action', '127.0.0.1', 5, 60000, 1)
      ).rejects.toMatchObject({
        code: 'resource-exhausted',
      });

      expect(mockSet).not.toHaveBeenCalled();
    });
  });
});
