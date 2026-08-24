import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './chat.controller';
import * as chatService from './chat.service';
import { upload } from '../../utils/upload';

/**
 * @openapi
 * tags:
 *   name: Chat
 *   description: Social messaging and group coordination
 *
 * /chat/rooms:
 *   get:
 *     tags: [Chat]
 *     summary: Get all chat rooms the user is a member of
 *     responses:
 *       200:
 *         description: List of rooms (group or direct)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *
 * /chat/rooms/{roomId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get message history for a room
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   post:
 *     tags: [Chat]
 *     summary: Send a message to a room
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string, example: "Hello everyone!" }
 *     responses:
 *       201: { description: Message sent }
 */


const router = Router();

router.use(authenticate);

router.get('/rooms', ctrl.getRooms);
// Static path must precede '/rooms/:roomId/*' so it isn't captured as a roomId
router.post('/rooms/join-group', ctrl.joinGroupChat);
router.get('/seed-me', async (req, res) => {
    try {
        const userId = req.user!.sub;
        const result = await chatService.seedUser(userId);
        res.json({ success: true, message: 'Seeding successful', result });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.toString() });
    }
});
router.get('/rooms/:roomId/messages', ctrl.getRoomMessages);
router.post('/rooms/:roomId/messages', ctrl.sendMessage);
router.delete('/rooms/:roomId', ctrl.deleteRoom);

router.patch('/messages/:messageId', ctrl.updateMessage);
router.delete('/messages/:messageId', ctrl.deleteMessage);

router.post('/upload', upload.single('file'), ctrl.uploadMedia);

export { router as chatRouter };
