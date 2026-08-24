import type { RequestHandler } from 'express';
import * as chatService from './chat.service';
import { sendSuccess } from '../../utils/response';
import { uploadToCloudinary } from '../../utils/upload';
import { AppError } from '../../middleware/errorHandler';
import { z } from 'zod';

const SendMessageSchema = z.object({
    text: z.string().max(2000).optional().nullable(),
    type: z.string().optional().default('text'),
    mediaUrl: z.string().url().optional().nullable(),
}).refine(data => data.text || data.mediaUrl, {
    message: "Either text or mediaUrl must be provided",
});

const JoinGroupSchema = z.object({
    listingId: z.string().min(1),
    date: z.coerce.date(),
});

export const getRooms: RequestHandler = async (req, res, next) => {
    try {
        const rooms = await chatService.getRooms(req.user!.sub);
        sendSuccess(res, rooms);
    } catch (err) {
        next(err);
    }
};

export const getRoomMessages: RequestHandler = async (req, res, next) => {
    try {
        const roomId = String(req.params.roomId);
        const messages = await chatService.getRoomMessages(roomId, req.user!.sub);
        sendSuccess(res, messages);
    } catch (err) {
        next(err);
    }
};

export const sendMessage: RequestHandler = async (req, res, next) => {
    try {
        const roomId = String(req.params.roomId);
        const { text, type, mediaUrl } = SendMessageSchema.parse(req.body);
        const message = await chatService.sendMessage(
            roomId, 
            req.user!.sub, 
            text ?? '', 
            type ?? 'text', 
            mediaUrl ?? undefined
        );
        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('new_message', message);
        }
        sendSuccess(res, message, 'Message sent', 201);
    } catch (err) {
        next(err);
    }
};

export const joinGroupChat: RequestHandler = async (req, res, next) => {
    try {
        const { listingId, date } = JoinGroupSchema.parse(req.body);
        const membership = await chatService.joinGroupChat(listingId, date, req.user!.sub);
        sendSuccess(res, membership, 'Joined group chat', 201);
    } catch (err) {
        next(err);
    }
};

export const deleteRoom: RequestHandler = async (req, res, next) => {
    try {
        const roomId = String(req.params.roomId);
        await chatService.deleteRoom(roomId, req.user!.sub);
        sendSuccess(res, null, 'Chat room removed');
    } catch (err) {
        next(err);
    }
};

export const updateMessage: RequestHandler = async (req, res, next) => {
    try {
        const messageId = String(req.params.messageId);
        const { text } = SendMessageSchema.parse(req.body);
        const message = await chatService.updateMessage(messageId, req.user!.sub, text ?? '');
        sendSuccess(res, message, 'Message updated');
    } catch (err) {
        next(err);
    }
};

export const deleteMessage: RequestHandler = async (req, res, next) => {
    try {
        const messageId = String(req.params.messageId);
        await chatService.deleteMessage(messageId, req.user!.sub);
        sendSuccess(res, null, 'Message deleted');
    } catch (err) {
        next(err);
    }
};

export const uploadMedia: RequestHandler = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new AppError(400, 'No file uploaded');
        }

        const url = await uploadToCloudinary(req.file.buffer, 'chat', `${Date.now()}`);
        sendSuccess(res, { url }, 'Media uploaded');
    } catch (err) {
        next(err);
    }
};

