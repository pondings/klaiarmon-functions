import * as functions from "firebase-functions";
import moment = require("moment-timezone");
import { THAILAND_TZ } from "./common/constants/time-zone";

export const execGetTodayCalendarEvent = async (request: functions.https.Request, response: functions.Response<any>) => {
    functions.logger.info('Start get calendar event');
    
    const today = moment().tz(THAILAND_TZ);
    const firestore = functions.app.admin.firestore();
    const celendarEvent = firestore.collection('calendar/event/custom-event')
        .where('start', '>=', today.startOf('day').toDate())
        .where('start', '<=', today.endOf('day').toDate());
    const users = (await firestore.collection('users').get()).docs.map(doc => doc.data());
    const events = (await celendarEvent.get()).docs.map(doc => mapEventToResponse(doc, users));

    response.send({ data: events });
}

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