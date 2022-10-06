import * as functions from 'firebase-functions';
import { ALEXA_NOTIFICATION_COLLECTION_PATH } from './common/constants/collection-path';

export const execGetAlexaNotification = async (request: functions.https.Request, response: functions.Response<any>) => {
    const params = request.query;
    functions.logger.info(`Start execute execGetAlexaNotification with params ${JSON.stringify(params)}`);

    const firestore = functions.app.admin.firestore();
    const collection = firestore.collection(ALEXA_NOTIFICATION_COLLECTION_PATH)

    const alexaNotifications = await Promise.all((await collection.where('alert', '==', true)
        .where('tag', '==', params.tag)
        .get())
        .docs.map(doc => ({ ...doc.data(), _id: doc.id }))
        .map(async (noti: any) => {
            const { _id, ..._noti }  = noti;
            await firestore.doc(`${ALEXA_NOTIFICATION_COLLECTION_PATH}/${_id}`).update({ ..._noti, alert: false });
            return _noti;
        }))

    response.send({ data: alexaNotifications || [] });
};