import { Request, Response, NextFunction } from 'express';
import * as citiesService from './cities.service';

export const getCities = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cities = await citiesService.listActiveCities();
    res.status(200).json({ success: true, data: cities });
  } catch (error) {
    next(error);
  }
};

export const getCityWeather = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await citiesService.getCityWeather(String(req.params.slug));
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
