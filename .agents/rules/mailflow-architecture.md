# MAILFLOW — PERMANENT AI + CHANNEL ARCHITECTURE RULE

> **IMPORTANT:** This is a PERMANENT product architecture rule for MailFlow.
> Do NOT change, reinterpret, or bypass this architecture in any future implementation unless the user explicitly instructs it.

---

## CORE MAILFLOW COMMUNICATION ARCHITECTURE

MailFlow has **TWO** communication channels:

1. **EMAIL**
2. **WHATSAPP**

The AI behavior is **DIFFERENT** for each channel.

---

## 1. EMAIL — AI CAN GENERATE THE FULL MESSAGE

Email is the primary AI-generated communication channel.

The AI is allowed to generate: Subject, Greeting, Opening, Personalized body, Call-to-action, Closing.

AI-generated email content must **never** be replaced by a generic hardcoded message unless explicitly required as a fallback.

---

## 2. WHATSAPP — APPROVED META TEMPLATE ONLY

WhatsApp must **NEVER** use AI to generate a completely free-form message.

All outbound WhatsApp marketing messages must be sent through an **APPROVED META WHATSAPP TEMPLATE**.

AI may determine template variables (e.g. {{1}} = Lead Name, {{2}} = Company Name) but **MUST NOT** rewrite the approved template body.

---

## 3. AI ENGINE RESPONSIBILITY

| Channel | AI Output |
|---|---|
| **EMAIL** | Complete personalized email (subject + body) |
| **WHATSAPP** | Template variables / personalization data ONLY |

---

## 4. NEVER VIOLATE THIS RULE

- NO AI-generated free-form WhatsApp marketing messages
- NO sending AI text directly to WhatsApp instead of a template
- NO replacing approved template content with AI-generated content
- NO WhatsApp UI preview that differs from the actual Meta template delivery
- NO sending a WhatsApp message without an approved Meta template where required
- NO hardcoding WhatsApp message text when approved template/variables should be used
- NO treating WhatsApp and Email personalization as the same generation process

---

## 5. PREVIEW MUST MATCH ACTUAL DELIVERY

For WhatsApp: UI Preview == Actual WhatsApp Message (always).

---

## 6. IMPLEMENTATION RULE

Before implementing any Email, WhatsApp, AI, Campaign, Lead, CRM, Analytics, or Messaging feature:

1. Read and follow this architecture.
2. Check whether the change affects Email or WhatsApp.
3. Preserve the channel-specific AI behavior.
4. Never introduce a free-form WhatsApp AI message flow.
5. Never assume Email and WhatsApp have identical message-generation rules.
6. If a proposed feature conflicts with this architecture, STOP and ask for explicit confirmation before changing the architecture.

This is a **PERMANENT MAILFLOW PRODUCT ARCHITECTURE RULE.**
