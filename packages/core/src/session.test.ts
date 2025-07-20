/**
 * Basic tests for PSP core functionality
 */

import { Session, LocalStorageProvider } from './index';

describe('PSP Core', () => {
  test('should create a session', async () => {
    const session = await Session.create({
      name: 'Test Session',
      description: 'A test session',
      tags: ['test']
    });

    expect(session).toBeDefined();
    expect(session.getId()).toBeDefined();
    expect(session.getMetadata().name).toBe('Test Session');
    expect(session.getMetadata().description).toBe('A test session');
    expect(session.getMetadata().tags).toEqual(['test']);
  });

  test('should save and load a session', async () => {
    const storageProvider = new LocalStorageProvider();
    
    // Create a session
    const originalSession = await Session.create({
      name: 'Test Session',
      description: 'A test session',
      storage: 'local'
    });

    const sessionId = originalSession.getId();

    // Load the session
    const loadedSession = await Session.load(sessionId, storageProvider);

    expect(loadedSession).toBeDefined();
    expect(loadedSession.getId()).toBe(sessionId);
    expect(loadedSession.getMetadata().name).toBe('Test Session');
    expect(loadedSession.getMetadata().description).toBe('A test session');
  });

  test('should handle session metadata updates', async () => {
    const session = await Session.create({
      name: 'Original Name',
      description: 'Original Description'
    });

    await session.updateMetadata({
      name: 'Updated Name',
      description: 'Updated Description'
    });

    const metadata = session.getMetadata();
    expect(metadata.name).toBe('Updated Name');
    expect(metadata.description).toBe('Updated Description');
  });

  test('should clone a session', async () => {
    const originalSession = await Session.create({
      name: 'Original Session',
      description: 'Original Description'
    });

    const clonedSession = await originalSession.clone('Cloned Session');

    expect(clonedSession.getId()).not.toBe(originalSession.getId());
    expect(clonedSession.getMetadata().name).toBe('Cloned Session');
    expect(clonedSession.getMetadata().description).toBe('Original Description');
  });
});