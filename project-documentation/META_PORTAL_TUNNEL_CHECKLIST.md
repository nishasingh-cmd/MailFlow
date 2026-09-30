# Meta Developer Portal — Tunnel URL Update Checklist

Whenever your Cloudflare tunnel restarts and issues new tunneling URLs, follow this 4-step checklist to update the Meta Developer Portal.

> [!TIP]
> **Dual Tunnel Reminder (`scripts/tunnel.ps1`):**  
> • **Frontend Tunnel URL (`$feUrl`)** goes into: App Settings, Facebook Login for Business, and Embedded Signup Builder.  
> • **Backend Tunnel URL (`$beUrl`)** goes into: WhatsApp Webhook Configuration (`/api/whatsapp/webhook`).

---

## 1. App Settings → Basic
**Navigation:** Left Sidebar $\rightarrow$ **App settings** $\rightarrow$ **Basic**

| Field Name | What to Enter |
|---|---|
| **Privacy Policy URL** | `https://<frontend-tunnel-url>/privacy` |
| **Terms of Service URL** | `https://<frontend-tunnel-url>/terms` |
| **User Data Deletion** | Set to **Data Deletion Instructions URL** $\rightarrow$ `https://<frontend-tunnel-url>/privacy` |
| **App Domains** | `trycloudflare.com` *(You can leave this permanently as `trycloudflare.com` — no need to change it on every restart!)* |

👉 **Click "Save changes"** at the bottom.

---

## 2. Facebook Login for Business → Settings
**Navigation:** Left Sidebar $\rightarrow$ **Facebook Login for Business** $\rightarrow$ **Settings**

| Field Name | What to Enter |
|---|---|
| **Valid OAuth Redirect URIs** | Add the following: <br>• `https://<frontend-tunnel-url>/`<br>• `https://<frontend-tunnel-url>/whatsapp`<br>• `https://<frontend-tunnel-url>/settings` |
| **Allowed Domains for the JavaScript SDK** | `https://<frontend-tunnel-url>` |

👉 **Click "Save changes"** at the bottom.

---

## 3. WhatsApp → Embedded Signup Builder → Manage Domains
**Navigation:** Left Sidebar $\rightarrow$ **WhatsApp** $\rightarrow$ **Embedded Signup Builder** $\rightarrow$ Expand **Manage Domains**

| Field Name | What to Enter |
|---|---|
| **Add Domain / Allowed Domains** | `https://<frontend-tunnel-url>` |

---

## 4. WhatsApp Webhook (For Incoming Messages & Delivery Receipts)
**Navigation:** Left Sidebar $\rightarrow$ **WhatsApp** $\rightarrow$ **Configuration** $\rightarrow$ **Webhook** section

| Field Name | What to Enter |
|---|---|
| **Callback URL** | `https://<backend-tunnel-url>/api/whatsapp/webhook` |
| **Verify Token** | `mailflow_verify_2026_x7k9` |
| **Webhook Subscriptions** | Ensure `messages` and `message_template_status_update` are checked/subscribed. |

👉 **Click "Verify and save"**.

---

## 💡 Pro-Tip: Permanent URLs for Privacy & Terms
If you host your Privacy Policy and Terms of Service pages on a permanent static URL (such as GitHub Pages, Vercel, or your own custom domain), you will **never** have to update Step 1 on tunnel restarts. You will only need to update:
1. Valid OAuth Redirect URIs & Allowed JS SDK domain (Step 2)
2. Embedded Signup Allowed Domains (Step 3)
3. WhatsApp Webhook Callback URL (Step 4)
