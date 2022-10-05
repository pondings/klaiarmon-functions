import * as _moment from 'moment-timezone';
import { Timestamp } from 'firebase-admin/firestore';
import { THAILAND_TZ } from '../constants/time-zone';

export default class Moment {

    static get = () => _moment().tz(THAILAND_TZ);
    static fromDateStr = (dateStr: string) => _moment(dateStr, 'YYYY/MM/DD').tz(THAILAND_TZ);
    static fromTimestamp = (timestamp: Timestamp) => _moment(timestamp.toDate()).tz(THAILAND_TZ);

}
