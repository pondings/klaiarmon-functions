import * as functions from "firebase-functions";

import { Timestamp } from 'firebase-admin/firestore';
import { stringFormat } from "./common/utils/common-utils";
import Moment from "./common/utils/moment-utils";
import { USER_COLLECTION_PATH } from "./common/constants/collection-path";

const EXPENSE_CONTENT_NOTIFICATION_TEMPLATE = '<font face="Arial">Hi <b>{0},<br></b></font><p><span><b>System</b></span><font face="Arial">&#160;is <b>added the new</b> expense which included you in the bill.</font></p><div><b><u>Expense Info</u></b></div><div><b>Name</b>:&#160;<span>{1}</span></div><div><b>Amount</b>:&#160;<span>{2}</span></div><div><b>Date</b>:&#160;<span>{3}</span></div><div><b>Bill to</b></div><div></div><ol>{4}</ol><div></div>';
const EXPENSE_DETAIL_NOTIFICATION_TEMPLATE = '<li><b>{0} amount</b> {1}</li>';

const RECURRING_COLLECTION_PATH = 'accounting/expense/recurring';
const EXPENSE_COLLECTION_PATH = 'accounting/expense/data';
const NOTIFICATION_COLLECTION_PATH = 'notification';
const ALEXA_NOTIFICATION_COLLECTION_PATH = 'alexa-notification';

export const execRecurringExpenseSchedule = async () => {
    const firestore = functions.app.admin.firestore();
    const recurringCollection = firestore.collection(RECURRING_COLLECTION_PATH).where('active', '==', true)
        .where('nextRecurring', '<=', Moment.get().endOf('day').toDate());

    const documents = (await recurringCollection.get()).docs.map((doc: any) => ({ id: doc.id, data: doc.data() }));
    documents.forEach(async (document: any) => {
        const { id, data: recurring } = document;
        const expense: any = { name: `${recurring.name}#${recurring.currentCycle + 1}`, paidBy: recurring.paidBy, date: recurring.nextRecurring, amount: recurring.billings.map((bill: any) => bill.amount).reduce((prev: number, cur: number) => prev + cur, 0), billings: recurring.billings, files: [], meta: { createdBy: 'SYSTEM', createdDate: Timestamp.now(), updatedBy: 'SYSTEM', updatedDate: Timestamp.now() } };
        if ([0, '0', null, undefined].includes(expense.amount)) expense.status = 'ALERT';

        recurring.currentCycle += 1;
        if (recurring.currentCycle === recurring.cycle) {
            recurring.active = false;
        } else {
            const curRecurDate = recurring.nextRecurring.toDate();
            const nextMonth = Moment.fromDateStr(`${curRecurDate.getFullYear()}/${curRecurDate.getMonth() + 1}/1`).add(1, 'month');
            const lastDayOfnextMonth = nextMonth.endOf('month').get('date');

            const nextRecurringDay = recurring.repeat > lastDayOfnextMonth ? lastDayOfnextMonth : recurring.repeat; 
            const nextRecurring = Moment.fromDateStr(`${nextMonth.get('year')}/${nextMonth.get('month') + 1}/${nextRecurringDay}`)
                .startOf('day')
                .toDate();
            recurring.nextRecurring = Timestamp.fromDate(nextRecurring);
        }
        recurring.meta.updatedBy = 'SYSTEM';
        recurring.meta.updatedDate = Timestamp.fromDate(Moment.get().toDate());

        await firestore.collection(EXPENSE_COLLECTION_PATH).add(expense);
        await firestore.collection(RECURRING_COLLECTION_PATH).doc(id).update(recurring);
        await pushExpenseNotification(recurring);
        await addToAlexaNotification(recurring);
    });
};

export const addToAlexaNotification = async (recurExpense: any) => {
    if (![0, '0', null, undefined].includes(recurExpense.amount)) return;

    const firestore = functions.app.admin.firestore();

    const users = (await firestore.collection(`${USER_COLLECTION_PATH}`).get()).docs.map(doc => doc.data());

    const paidBy = users.find(user => user.uid === recurExpense.paidBy);
    const billingTo = recurExpense.billings.map((billing: any) => users.find(user => user.uid === billing.user)?.displayName);

    const lastBillingPerson = billingTo.pop();
    const billingMessage = `${billingTo.join(', ')} and ${lastBillingPerson}`;
    const message = `${recurExpense.name} paid by ${paidBy?.displayName} <break strength="weak"/> billing to ${billingMessage}`;
    const meta = { createdBy: 'SYSTEM', createdDate: Moment.get().toDate(), updatedBy: 'SYSTEM', updatedDate: Moment.get().toDate() };
    const alexaNotification: any = { alert: true, message, meta, tag: 'RECURRING_EXPENSE' };

    firestore.collection(ALEXA_NOTIFICATION_COLLECTION_PATH).add(alexaNotification);
}

export const pushExpenseNotification = async (recurExpense: any) => {
    if ([0, '0', null, undefined].includes(recurExpense.amount)) return;

    const firestore = functions.app.admin.firestore();
    const users = (await firestore.collection('users').get()).docs.map(doc => doc.data());

    const displayNames = users.map(user => user.displayName).join(', ');
    const billName = `${recurExpense.name}#${recurExpense.currentCycle}`;
    const amount = recurExpense.billings.map((bill: any) => bill.amount).reduce((prev: number, cur: number) => prev + cur, 0).toFixed(2);
    const date = Moment.fromTimestamp(recurExpense.nextRecurring).format('DD/MM/YYYY');
    const details = recurExpense.billings.map((billing: any) => {
        const user = users.find((user: any) => user.uid === billing.user)!;
        return stringFormat(EXPENSE_DETAIL_NOTIFICATION_TEMPLATE, user.displayName, billing.amount.toFixed(2));
    });

    const content = stringFormat(EXPENSE_CONTENT_NOTIFICATION_TEMPLATE, displayNames, billName,
        amount, date, details.join(''));

    await firestore.collection(NOTIFICATION_COLLECTION_PATH).add({
        title: 'System Expense Notification',
        content: content,
        isAlert: false,
        date: Timestamp.now(),
        meta: { createdBy: 'SYSTEM', createdDate: Timestamp.now(), updatedBy: 'SYSTEM', updatedDate: Timestamp.now() },
        to: users.map(user => user.uid),
        readed: []
    });
};
