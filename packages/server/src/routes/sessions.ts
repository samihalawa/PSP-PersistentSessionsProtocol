import { Router, Application } from 'express';
import { StorageProvider } from '@psp/core';
import { SessionController } from '../controllers/session-controller';
import { validateSession } from '../middleware/validators';

/**
 * Sets up session routes
 */
export function setupSessionRoutes(app: Application, storageProvider: StorageProvider): void {
  const router = Router();
  const controller = new SessionController(storageProvider);
  
  /**
   * @swagger
   * /sessions:
   *   get:
   *     summary: List all sessions
   *     description: Returns a list of all sessions matching the query criteria
   *     parameters:
   *       - in: query
   *         name: name
   *         schema:
   *           type: string
   *         description: Filter by session name
   *       - in: query
   *         name: tags
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Filter by tags
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Limit the number of results
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *         description: Skip a number of results
   *     responses:
   *       200:
   *         description: A list of sessions
   */
  router.get('/', controller.listSessions);
  
  /**
   * @swagger
   * /sessions/{id}:
   *   get:
   *     summary: Get a session by ID
   *     description: Returns a single session by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     responses:
   *       200:
   *         description: The session
   *       404:
   *         description: Session not found
   */
  router.get('/:id', controller.getSession);
  
  /**
   * @swagger
   * /sessions:
   *   post:
   *     summary: Create a new session
   *     description: Creates a new empty session
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: Session created
   *       400:
   *         description: Invalid request
   */
  router.post('/', validateSession, controller.createSession);
  
  /**
   * @swagger
   * /sessions/{id}:
   *   put:
   *     summary: Update a session
   *     description: Updates an existing session
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               metadata:
   *                 type: object
   *               state:
   *                 type: object
   *     responses:
   *       200:
   *         description: Session updated
   *       404:
   *         description: Session not found
   */
  router.put('/:id', controller.updateSession);
  
  /**
   * @swagger
   * /sessions/{id}:
   *   patch:
   *     summary: Partially update a session
   *     description: Updates parts of an existing session
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               metadata:
   *                 type: object
   *               state:
   *                 type: object
   *     responses:
   *       200:
   *         description: Session updated
   *       404:
   *         description: Session not found
   */
  router.patch('/:id', controller.patchSession);
  
  /**
   * @swagger
   * /sessions/{id}:
   *   delete:
   *     summary: Delete a session
   *     description: Deletes an existing session
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     responses:
   *       204:
   *         description: Session deleted
   *       404:
   *         description: Session not found
   */
  router.delete('/:id', controller.deleteSession);
  
  /**
   * @swagger
   * /sessions/{id}/events:
   *   get:
   *     summary: Get session events
   *     description: Returns the recorded events for a session
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     responses:
   *       200:
   *         description: The session events
   *       404:
   *         description: Session not found
   */
  router.get('/:id/events', controller.getSessionEvents);
  
  /**
   * @swagger
   * /sessions/{id}/events:
   *   post:
   *     summary: Add events to a session
   *     description: Adds new events to a session's recording
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: array
   *             items:
   *               type: object
   *     responses:
   *       200:
   *         description: Events added
   *       404:
   *         description: Session not found
   */
  router.post('/:id/events', controller.addSessionEvents);
  
  // Mount the router
  app.use('/sessions', router);
}