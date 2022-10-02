import * as functions from "firebase-functions";
import moment = require("moment");

export const getTodayCalendarEvent = functions.https.onRequest(async (request, response) => {
  const today = moment();
  functions.logger.info('Start get calendar event', new Date(), today.startOf('day').toDate());
  response = setResponseCORS(response);

  try {
    const token = request.get('Authorization')?.split('Bearer ')[1];
    await validateUserToken(token!);

    const firestore = functions.app.admin.firestore();
    const celendarEvent = firestore.collection('calendar/event/custom-event')
      .where('start', '>=', today.startOf('day').toDate())
      .where('start', '<=', today.endOf('day').toDate());
    const users = (await firestore.collection('users').get()).docs.map(doc => doc.data());
    const events = (await celendarEvent.get()).docs.map(doc => mapEventToResponse(doc, users));

    response.send({ data: events });
  } catch (err) {
    let errMessage = err === 'TOKEN_ERR' ? 'Unauthorized' : 'Unexpected Error';
    let errStatus = err === 'TOKEN_ERR' ? 401 : 500;
    functions.logger.error('Error while get today calendar event', err);
    response.status(errStatus)
      .send({ error: errMessage });
  } 
});

const mapEventToResponse = (doc: any, users: any[]) => {
  const data = doc.data();
  
  const createdBy = data.meta.createdBy;
  const user = users.find(user => user.uid === createdBy);
  return {
    title: data.title,
    createdBy: user.displayName,
    description: data.meta.description
  };
};

const validateUserToken = async (token: string)  => {
  try {
    await functions.app.admin.auth().verifyIdToken(token!);
  } catch (err) {
    functions.logger.error(`Error while validate user token`, err);
    throw 'TOKEN_ERR';
  }
}

const setResponseCORS = (response: functions.Response) => {
  return response.set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
    .set('Access-Control-Allow-Headers', '*');
};
