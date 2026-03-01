export type NotificationEmail = {
  subject: string;
  html: string;
  text: string;
};

export function buildNotificationEmail(params: { message: string }): NotificationEmail {
  return {
    subject: 'Volleyball Season Update',
    html: `<p>${params.message}</p>`,
    text: params.message,
  };
}
