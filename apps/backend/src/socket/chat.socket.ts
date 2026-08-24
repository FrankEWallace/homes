import type { Server, Socket } from 'socket.io';
import * as chatService from '../modules/chat/chat.service';
import { prisma } from '../config/prisma';

export function registerChatHandlers(io: Server, socket: Socket) {
  const userId = (socket as any).userId as string;

  socket.on('join_room', async ({ roomId }: { roomId: string }) => {
    try {
      const member = await prisma.chatMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!member) {
        socket.emit('error', { message: 'You are not a member of this room' });
        return;
      }
      socket.join(roomId);
    } catch {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('leave_room', ({ roomId }: { roomId: string }) => {
    socket.leave(roomId);
  });

  socket.on(
    'send_message',
    async ({ roomId, text }: { roomId: string; text: string }) => {
      if (!roomId || typeof text !== 'string' || !text.trim()) {
        socket.emit('error', { message: 'roomId and non-empty text are required' });
        return;
      }

      try {
        const message = await chatService.sendMessage(roomId, userId, text.trim());

        // Broadcast to all room members (including sender for consistency)
        io.to(roomId).emit('new_message', message);

        // Acknowledge delivery to sender
        socket.emit('message_sent', {
          messageId: message.id,
          roomId,
          status: 'delivered',
        });
      } catch (err: any) {
        socket.emit('error', { message: err?.message ?? 'Failed to send message' });
      }
    },
  );

  socket.on(
    'typing',
    ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', { roomId, userId, isTyping });
    },
  );
}
