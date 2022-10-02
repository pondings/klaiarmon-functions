import * as functions from "firebase-functions";
import axios from 'axios';

export const alexaNotify = functions.https.onRequest(async (request, response) => {
  const message = request.query.notification;
  functions.logger.info(request.query);
  functions.logger.info(`Start alexa notify function with message: ${message}`);

  response = setResponseCORS(response);
  const token = request.get('Authorization')?.split('Bearer ')[1];
  try {
    await functions.app.admin.auth().verifyIdToken(token!);
    const url = `https://api.notifymyecho.com/v1/NotifyMe?notification=${message}&accessCode=${process.env.ALEXA_NOTIFY_CREDENTIAL}`;
    await axios.get(url);

    response.send({ message: 'Success' });
  } catch (err) {
    functions.logger.error(err);
    response.status(500)
      .send({ error: 'Unexpected Error!' });
  }
});

export const setResponseCORS= (response: functions.Response) => {
  return response.set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
    .set('Access-Control-Allow-Headers', '*');
};
