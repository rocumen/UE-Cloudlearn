import {
  getDashboardSummary,
  getStudentLearningRecords
} from '../services/records.service.js';
import { sendSuccess } from '../utils/response.js';

export async function getMyRecordsHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const records = await getStudentLearningRecords(db, req.user.id);
    return sendSuccess(res, 200, records);
  } catch (err) {
    return next(err);
  }
}

export async function getDashboardSummaryHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const summary = await getDashboardSummary(db, req.user);
    return sendSuccess(res, 200, summary);
  } catch (err) {
    return next(err);
  }
}
