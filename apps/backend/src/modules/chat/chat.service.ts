import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { notifyUser } from '../../utils/notify';

export async function getRooms(userId: string) {
    return prisma.chatRoom.findMany({
        where: {
            members: { some: { userId } }
        },
        include: {
            listing: { select: { title: true, images: true } },
            members: {
                include: {
                    user: { select: { firstName: true, lastName: true, avatarUrl: true } }
                }
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
            _count: { select: { messages: true } }
        },
        orderBy: { updatedAt: 'desc' }
    });
}

export async function getRoomMessages(roomId: string, userId: string) {
    // Verify membership
    const member = await prisma.chatMember.findUnique({
        where: { roomId_userId: { roomId, userId } }
    });

    if (!member) throw new AppError(403, 'You are not a member of this room');

    return prisma.message.findMany({
        where: { roomId },
        include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
        },
        orderBy: { createdAt: 'asc' }
    });
}

export async function sendMessage(roomId: string, senderId: string, text: string, type: string = 'text', mediaUrl?: string) {
    // Check if room exists and user is a member
    const membership = await prisma.chatMember.findUnique({
        where: { roomId_userId: { roomId, userId: senderId } },
    });

    if (!membership) {
        throw new Error('User is not a member of this chat room');
    }

    const [message] = await prisma.$transaction([
        prisma.message.create({
            data: {
                roomId,
                senderId,
                text,
                type,
                mediaUrl,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
            },
        }),
        prisma.chatRoom.update({
            where: { id: roomId },
            data: { updatedAt: new Date() }
        })
    ]);

    // Notify other members of the room
    const otherMembers = await prisma.chatMember.findMany({
        where: { roomId, userId: { not: senderId } },
        include: { user: { select: { id: true, phone: true } } }
    });

    const senderName = message.sender 
        ? `${message.sender.firstName} ${message.sender.lastName}`.trim() 
        : 'Someone';

    for (const member of otherMembers) {
        notifyUser({
            userId: member.userId,
            phone: member.user.phone,
            type: 'new_message',
            title: senderName,
            body: text.length > 100 ? text.slice(0, 97) + '…' : text,
            channels: ['push', 'in_app'],
            data: { 
                type: 'new_message', 
                roomId, 
                messageId: message.id 
            }
        }).catch(err => console.error('[Chat] Failed to notify user:', err));
    }

    return message;
}

/**
 * Ensures a group chat exists for a specific listing and date (event/safari).
 * Automatically adds the user to the room.
 */
export async function joinGroupChat(listingId: string, date: Date, userId: string) {
    // Find or create room
    let room = await prisma.chatRoom.findFirst({
        where: { listingId, date, type: 'group' }
    });

    if (!room) {
        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        if (!listing) throw new AppError(404, 'Listing not found');

        room = await prisma.chatRoom.create({
            data: {
                listingId,
                date,
                type: 'group',
                name: `${listing.title} - ${date.toISOString().split('T')[0]}`,
                members: {
                    create: { userId: listing.hostId, role: 'agent' }
                }
            }
        });
    }

    // Add user if not already a member
    return prisma.chatMember.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        update: {},
        create: { roomId: room.id, userId, role: 'member' }
    });
}

export async function seedUser(userId: string) {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) throw new Error('No admin user found to initialize support');
    const adminId = admin.id;
    
    // Check if support room already exists
    let room = await prisma.chatRoom.findFirst({
        where: {
            type: 'direct',
            members: {
                every: {
                    userId: { in: [userId, adminId] }
                }
            }
        }
    });

    if (room) {
        return { roomId: room.id };
    }
    
    room = await prisma.chatRoom.create({
        data: {
            type: 'direct',
            name: 'Homes Support',
            members: {
                create: [
                    { userId: userId, role: 'member' },
                    { userId: adminId, role: 'agent' },
                ],
            },
        },
    });

    await prisma.message.create({
        data: {
            roomId: room.id,
            senderId: adminId,
            text: 'Jambo! This is the Homes Support team. How can we help you today regarding your listings?',
        }
    });

    return { roomId: room.id };
}

export async function deleteRoom(roomId: string, _userId: string) {
    // Delete the whole room (including messages via cascade or manual)
    return prisma.chatRoom.delete({
        where: { id: roomId },
    });
}

export async function updateMessage(messageId: string, userId: string, text: string) {
    // Check ownership
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) {
        throw new Error('Not authorized to edit this message');
    }

    return prisma.message.update({
        where: { id: messageId },
        data: { text },
    });
}

export async function deleteMessage(messageId: string, userId: string) {
    // Check ownership
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) {
        throw new Error('Not authorized to delete this message');
    }

    return prisma.message.delete({
        where: { id: messageId },
    });
}
