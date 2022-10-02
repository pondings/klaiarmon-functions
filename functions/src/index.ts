import * as functions from "firebase-functions";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const alexaNotify = functions.https.onRequest(async (request, response) => {
  response = setResponseCORS(response);

  const token = request.get('Authorization')?.split('Bearer ')[1];
  functions.logger.info(token);
  try {
    const validToken = await functions.app.admin.auth().verifyIdToken(token!);
    functions.logger.info('validToken', validToken);
    functions.logger.info(validToken);

    response.send({ message: 'Hello from Firebase!' });
  } catch (err) {
    functions.logger.error(err);
    response.status(401)
      .send({ error: 'Unauthorized' });
  }
});

export const setResponseCORS= (response: functions.Response) => {
  return response.set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
    .set('Access-Control-Allow-Headers', '*');
};
