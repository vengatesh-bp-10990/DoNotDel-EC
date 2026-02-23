import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

// ─── Catalyst Auth Callback Detection ───
// URLs like /login/accounts/p/{ZAID}/pconfirm or /login/accounts/p/{ZAID}/resetpassword
// must be handled by Catalyst's SDK natively — do NOT mount React for these.
const isCatalystAuthCallback = /^\/login\/accounts\//.test(window.location.pathname);

if (isCatalystAuthCallback) {
  // Don't mount React — show a minimal branded page and let Catalyst SDK handle the auth flow
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#f9fafb,#fff,#fffbeb);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="text-align:center;width:100%;max-width:480px;padding:0 24px;">
        <div style="display:inline-flex;align-items:center;gap:12px;margin-bottom:32px;">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#f59e0b,#ea580c);border-radius:12px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:18px;">🏠</span>
          </div>
          <span style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#d97706,#ea580c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Homemade Products</span>
        </div>
        <div id="catalyst-auth-container" style="min-height:400px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #f3f4f6;"></div>
        <p style="margin-top:24px;color:#9ca3af;font-size:13px;">
          <a href="/login" style="color:#d97706;font-weight:600;text-decoration:none;">← Back to Sign In</a>
        </p>
      </div>
    </div>
  `;

  // Wait for Catalyst SDK and render the signIn form (handles pconfirm/reset automatically)
  function initCatalystAuth() {
    if (window.catalyst && window.catalyst.auth && window.catalyst.auth.signIn) {
      window.catalyst.auth.signIn('catalyst-auth-container', { service_url: '/' });
    } else {
      setTimeout(initCatalystAuth, 200);
    }
  }
  setTimeout(initCatalystAuth, 300);

} else {
  // Normal React app mount
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
