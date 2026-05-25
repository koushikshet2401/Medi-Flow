import https from 'https';
import querystring from 'querystring';

/**
 * Sends a real SMS using Twilio if configured in environment variables.
 * Falls back to console log otherwise.
 * 
 * To configure, add the following to your backend/.env file:
 * - TWILIO_ACCOUNT_SID=your_account_sid
 * - TWILIO_AUTH_TOKEN=your_auth_token
 * - TWILIO_PHONE_NUMBER=your_twilio_phone_number
 */
export async function sendSMS(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`\n=================== SMS SIMULATOR (NOT CONFIGURED) ===================`);
    console.log(`To: ${to}`);
    console.log(`Body: ${body}`);
    console.log(`======================================================================\n`);
    return { success: false, message: "Twilio credentials not configured in backend/.env" };
  }

  // Format to standard international number (e.g. India standard starts with +91)
  let formattedTo = to.trim();
  if (formattedTo.length === 10 && !formattedTo.startsWith("+")) {
    formattedTo = `+91${formattedTo}`;
  } else if (!formattedTo.startsWith("+")) {
    formattedTo = `+${formattedTo}`;
  }

  const postData = querystring.stringify({
    To: formattedTo,
    From: fromNumber,
    Body: body,
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const options = {
    hostname: 'api.twilio.com',
    port: 443,
    path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length,
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let bodyData = '';
      res.on('data', (chunk) => {
        bodyData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[SMS SUCCESS] Sent Twilio message to ${formattedTo}`);
          resolve({ success: true, response: JSON.parse(bodyData) });
        } else {
          console.error(`[SMS ERROR] Twilio Status: ${res.statusCode} | Response: ${bodyData}`);
          resolve({ success: false, statusCode: res.statusCode, error: bodyData });
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[SMS REQUEST ERROR] Twilio API call failed: ${e.message}`);
      resolve({ success: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}
