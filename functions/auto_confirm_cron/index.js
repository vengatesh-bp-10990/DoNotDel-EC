'use strict';

const catalyst = require('zcatalyst-sdk-node');

const SENDER_EMAIL = 'vengi9360@gmail.com';
const STORE_NAME = 'Homemade Products';
const STORE_URL = 'https://homemade.onslate.in';
const AUTO_CONFIRM_MINUTES = 1;

// ─── Email Helpers ───
async function sendEmail(catalystApp, to, subject, htmlContent) {
  try {
    await catalystApp.email().sendMail({
      from_email: SENDER_EMAIL,
      to_email: to,
      subject,
      content: htmlContent,
      html_mode: true,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (e) { console.error(`Email send error to ${to}:`, e.message); }
}

function emailWrapper(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;">${STORE_NAME}</h1>
  </div>
  <div style="padding:32px;">${body}</div>
  <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${STORE_NAME} &bull; <a href="${STORE_URL}" style="color:#f59e0b;">Visit Store</a></p>
  </div>
</div></body></html>`;
}

function statusUpdateEmail(customerName, orderId, newStatus, total) {
  const statusEmoji = { Confirmed:'\u2705', Processing:'\u2699\uFE0F', Shipped:'\uD83D\uDE9A', Delivered:'\uD83D\uDCE6', Cancelled:'\u274C' };
  const statusMsg = {
    Confirmed: 'Your order has been auto-confirmed and is being prepared.',
    Processing: 'Your order is being processed and will ship soon.',
    Shipped: 'Your order has been shipped! It\'s on the way.',
    Delivered: 'Your order has been delivered! Enjoy your purchase.',
    Cancelled: 'Your order has been cancelled. If you have questions, please contact us.',
  };
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;">${statusEmoji[newStatus]||''} Order Auto-Confirmed</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hi ${customerName}, here's an update on your order.</p>
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Order #${orderId}</p>
      <div style="display:inline-block;background:#ecfdf5;color:#059669;padding:8px 24px;border-radius:999px;font-size:16px;font-weight:700;">
        ${newStatus}
      </div>
      <p style="margin:12px 0 0;color:#6b7280;font-size:14px;">${statusMsg[newStatus]||'Your order status has been updated.'}</p>
    </div>
    <div style="text-align:center;">
      <a href="${STORE_URL}/order/${orderId}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View Order Details &rarr;</a>
    </div>
  `);
}

module.exports = async (cronDetails, context) => {
  console.log('=== Auto-confirm job triggered at', new Date().toISOString(), '===');
  let catalystApp;
  try {
    catalystApp = catalyst.initialize(context);
  } catch (initErr) {
    console.error('Catalyst init failed:', initErr.message);
    context.closeWithFailure();
    return;
  }

  try {
    const zcql = catalystApp.zcql();

    // Get all Pending orders
    console.log('Querying pending orders...');
    const pendingRes = await zcql.executeZCQLQuery(
      `SELECT ROWID, User_ID, Total_Amount, CREATEDTIME FROM Orders WHERE Status = 'Pending'`
    );
    console.log('Pending query result count:', pendingRes.length);
    console.log('Raw result sample:', JSON.stringify(pendingRes[0] || 'none'));

    const pendingOrders = pendingRes.map(r => r.Orders || r);

    if (!pendingOrders.length) {
      console.log('No pending orders to auto-confirm.');
      context.closeWithSuccess();
      return;
    }

    const now = Date.now();
    let confirmedCount = 0;

    for (const order of pendingOrders) {
      console.log(`Processing order:`, JSON.stringify(order));
      const createdTime = new Date(order.CREATEDTIME).getTime();
      const elapsedMinutes = (now - createdTime) / 60000;
      console.log(`Order #${order.ROWID}: created=${order.CREATEDTIME}, elapsed=${elapsedMinutes.toFixed(2)} min`);

      if (elapsedMinutes >= AUTO_CONFIRM_MINUTES) {
        const orderId = order.ROWID;
        const userId = order.User_ID;

        // Update order status to Confirmed
        try {
          const table = catalystApp.datastore().table('Orders');
          await table.updateRow({ ROWID: orderId, Status: 'Confirmed' });
          console.log(`Order #${orderId} auto-confirmed successfully`);
          confirmedCount++;
        } catch (updateErr) {
          console.error(`Failed to update order #${orderId}:`, updateErr.message, updateErr.stack);
          continue;
        }

        // Send email notification (non-blocking)
        try {
          const userRes = await zcql.executeZCQLQuery(
            `SELECT Name, Email FROM Users WHERE ROWID = '${userId}'`
          );
          if (userRes.length > 0) {
            const user = userRes[0].Users || userRes[0];
            const html = statusUpdateEmail(user.Name, orderId, 'Confirmed', order.Total_Amount);
            await sendEmail(catalystApp, user.Email, `Order #${orderId} Auto-Confirmed - ${STORE_NAME}`, html);
          }
        } catch (emailErr) {
          console.error(`Email failed for order #${orderId}:`, emailErr.message);
        }
      }
    }

    console.log(`=== Auto-confirm done: ${confirmedCount}/${pendingOrders.length} confirmed ===`);
    context.closeWithSuccess();
  } catch (err) {
    console.error('Auto-confirm job error:', err.message, err.stack);
    context.closeWithFailure();
  }
};
