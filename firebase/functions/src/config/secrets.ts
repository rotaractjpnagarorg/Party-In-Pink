import { defineSecret, defineString } from 'firebase-functions/params';

export const KONFHUB_API_KEY = defineSecret('KONFHUB_API_KEY');
export const KONFHUB_EVENT_ID = defineSecret('KONFHUB_EVENT_ID');
export const KONFHUB_INTERNAL_SINGLE_TICKET_ID = defineString(
  'KONFHUB_INTERNAL_SINGLE_TICKET_ID',
  { default: '121417' }
);
export const KONFHUB_INTERNAL_BULK_TICKET_ID = defineString(
  'KONFHUB_INTERNAL_BULK_TICKET_ID',
  { default: '121588' }
);
export const KONFHUB_INTERNAL_DONOR_TICKET_ID = defineString(
  'KONFHUB_INTERNAL_DONOR_TICKET_ID',
  { default: '121589' }
);
export const KONFHUB_INTERNAL_FREE_TICKET_ID = defineString(
  'KONFHUB_INTERNAL_FREE_TICKET_ID',
  { default: '121589' }
);
export const KONFHUB_ACCESS_CODE_BULK = defineSecret('KONFHUB_ACCESS_CODE_BULK');
export const KONFHUB_ACCESS_CODE_FREE = defineSecret('KONFHUB_ACCESS_CODE_FREE');

export const SLACK_WEBHOOK_URL = defineSecret('SLACK_WEBHOOK_URL');
export const SLACK_SIGNING_SECRET = defineSecret('SLACK_SIGNING_SECRET');
export const SLACK_TEAM_ID = defineString('SLACK_TEAM_ID', { default: '' });
export const SLACK_APPROVER_USER_IDS = defineString('SLACK_APPROVER_USER_IDS', { default: '' });

export const BREVO_API_KEY = defineSecret('BREVO_API_KEY');
export const BREVO_WEBHOOK_SECRET = defineSecret('BREVO_WEBHOOK_SECRET');
export const BREVO_SENDER_EMAIL = defineString('BREVO_SENDER_EMAIL', {
  default: 'tickets@rotaractjpnagar.org',
});
export const BREVO_SENDER_NAME = defineString('BREVO_SENDER_NAME', {
  default: 'Party In Pink 5.0',
});
export const PUBLIC_WEB_URL = defineString('PUBLIC_WEB_URL', {
  default: 'https://pip.rotaractjpnagar.org',
});

export const CASHFREE_APP_ID = defineSecret('CASHFREE_APP_ID');
export const CASHFREE_SECRET_KEY = defineSecret('CASHFREE_SECRET_KEY');
export const CASHFREE_ENV = defineString('CASHFREE_ENV', { default: 'PRODUCTION' });

export const konfHubSecrets = [
  KONFHUB_API_KEY,
  KONFHUB_EVENT_ID,
  KONFHUB_ACCESS_CODE_BULK,
  KONFHUB_ACCESS_CODE_FREE,
  SLACK_WEBHOOK_URL,
];

export const cashfreeSecrets = [
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
  SLACK_WEBHOOK_URL,
];

