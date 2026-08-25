import type { RequestHandler } from 'express';
import * as leadsService from './leads.service';
import { CreateLeadSchema, LeadQuerySchema, UpdateLeadStatusSchema } from './leads.schemas';
import { sendSuccess, sendCreated } from '../../utils/response';

/** Public lead submission. `optionalAuthenticate` attaches req.user for seekers. */
export const createLead: RequestHandler = async (req, res, next) => {
  try {
    const input = CreateLeadSchema.parse(req.body);
    const result = await leadsService.createLead(input, {
      seekerId: req.user?.role === 'seeker' ? req.user.sub : undefined,
      ipAddress: req.ip,
    });
    sendCreated(res, { id: result.id }, 'Your message has been sent');
  } catch (err) {
    next(err);
  }
};

export const listLeads: RequestHandler = async (req, res, next) => {
  try {
    const query = LeadQuerySchema.parse(req.query);
    const { leads, meta } = await leadsService.listAgentLeads(req.user!.sub, query);
    sendSuccess(res, leads, 'Leads retrieved', 200, meta);
  } catch (err) {
    next(err);
  }
};

export const leadStats: RequestHandler = async (req, res, next) => {
  try {
    const counts = await leadsService.getLeadStats(req.user!.sub);
    sendSuccess(res, counts);
  } catch (err) {
    next(err);
  }
};

export const updateLeadStatus: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateLeadStatusSchema.parse(req.body);
    const lead = await leadsService.updateLeadStatus(req.params.id as string, req.user!.sub, input);
    sendSuccess(res, lead, 'Lead updated');
  } catch (err) {
    next(err);
  }
};
