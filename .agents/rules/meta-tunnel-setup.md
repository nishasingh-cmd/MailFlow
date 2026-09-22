# Meta Developer Portal — Tunnel URL Update Checklist

> **Permanent Reference Guide**: Whenever Cloudflare Tunnel restarts and generates a new tunnel URL (e.g. `https://<your-new-subdomain>.trycloudflare.com`), update the 4 locations in the Meta Developer Portal (`https://developers.facebook.com/apps/2429075644282551/`).

---

## 1. App Settings → Basic
**Navigation:** Left Sidebar → **App settings** → **Basic**

| Field Name | What to Enter |
| :--- | :--- |
| **Privacy Policy URL** | `https://<your-new-tunnel-url>/privacy` |
| **Terms of Service URL** | `https://<your-new-tunnel-url>/terms` |
| **User Data Deletion** | Set to **Data Deletion Instructions URL** → `https://<your-new-tunnel-url>/privacy` |
| **App Domains** | `trycloudflare.com` *(Static — no need to change on every restart!)* |

👉 Click **Save changes** at the bottom.

---

## 2. Facebook Login for Business → Settings
**Navigation:** Left Sidebar → **Facebook Login for Business** → **Settings**

| Field Name | What to Enter |
| :--- | :--- |
| **Valid OAuth Redirect URIs** | Add:<br>• `https://<your-new-tunnel-url>/`<br>• `https://<your-new-tunnel-url>/whatsapp`<br>• `https://<your-new-tunnel-url>/settings` |
| **Allowed Domains for the JavaScript SDK** | `https://<your-new-tunnel-url>` |

👉 Click **Save changes** at the bottom.

---

## 3. WhatsApp → Embedded Signup Builder → Manage Domains
**Navigation:** Left Sidebar → **WhatsApp** → **Embedded Signup Builder** → Expand **Manage Domains**

| Field Name | What to Enter |
| :--- | :--- |
| **Add Domain / Allowed Domains** | `https://<your-new-tunnel-url>` |

---

## 4. WhatsApp Webhook (Incoming Messages & Delivery Receipts)
**Navigation:** Left Sidebar → **WhatsApp** → **Configuration** → **Webhook** section

| Field Name | What to Enter |
| :--- | :--- |
| **Callback URL** | `https://<your-new-tunnel-url>/api/whatsapp/webhook` |
| **Verify Token** | `mailflow_verify_2026_x7k9` |
| **Webhook Subscriptions** | Ensure `messages` and `message_template_status_update` are subscribed/checked. |

👉 Click **Verify and save**.

---

## 💡 Pro-Tip to Never Update Privacy/Terms on Restarts
Hosting privacy policy and terms of service pages on a permanent static URL (e.g. GitHub Pages or Vercel / custom production domain) eliminates the need to update **Step 1** on every restart. You will then only need to update the JavaScript SDK Allowed Domain and the Webhook Callback URL.
