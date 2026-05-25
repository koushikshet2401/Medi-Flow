/**
 * Simulates sending an email by writing to console log.
 */
export async function sendEmail(to, subject, body) {
  console.log(`\n=================== EMAIL SIMULATOR ===================`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log(`=======================================================\n`);
  return { success: true, message: "Email simulation successful" };
}
