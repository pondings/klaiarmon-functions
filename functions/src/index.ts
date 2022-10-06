import * as functions from "firebase-functions";
import { execGetAlexaNotification } from "./getAlexaNotification";

import { execGetTodayCalendarEvent } from "./getTodayCalendarEvent";
import { execRecurringExpenseSchedule } from "./recurringExpenseSchedule";

export const getTodayCalendarEvent = functions.https.onRequest(async (request, response) => {
  response = setResponseCORS(response);
  try {
    const token = request.get('Authorization')?.split('Bearer ')[1];
    await validateUserToken(token!);
    await execGetTodayCalendarEvent(request, response);
  } catch (err) {
    errorHandle(response, err);
  }
});

export const getAlexaNotification = functions.https.onRequest(async (request, response) => {
  response = setResponseCORS(response);
  try {
    const token = request.get('Authorization')?.split('Bearer ')[1];
    await validateUserToken(token!);
    await execGetAlexaNotification(request, response);
  } catch (err) {
    errorHandle(response, err);
  }
});

export const recurringExpenseSchedule = functions.pubsub.schedule('0 20 * * *').timeZone('Asia/Bangkok').onRun(async (_) => {
    try {
      await execRecurringExpenseSchedule();
    } catch (err) {
      functions.logger.error(err);
    }
});

const validateUserToken = async (token: string) => {
  try {
    await functions.app.admin.auth().verifyIdToken(token!);
  } catch (err) {
    throw 'TOKEN_ERR';
  }
};

const errorHandle = (response: functions.Response<any>, err: any) => {
  let errMessage = err === 'TOKEN_ERR' ? 'Unauthorized' : 'Unexpected Error';
  let errStatus = err === 'TOKEN_ERR' ? 401 : 500;
  functions.logger.error('Error while exec', err);
  response.status(errStatus)
    .send({ error: errMessage });
};

export const setResponseCORS= (response: functions.Response) => {
  return response.set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
    .set('Access-Control-Allow-Headers', '*');
};
