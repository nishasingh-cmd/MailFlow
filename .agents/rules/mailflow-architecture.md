# MailFlow — Permanent AI + Channel Architecture Rule

> **This is a PERMANENT product architecture rule. Do NOT change, reinterpret, or bypass it in any future implementation unless explicitly instructed by the user.**

---

## Core Communication Architecture

MailFlow has TWO communication channels:

1. **EMAIL**
2. **WHATSAPP**

The AI behavior is **different** for each channel.

---

## 1. EMAIL — AI Generates the Full Message

Email is the primary AI-generated communication channel.

**Flow:**
```
Lead -> Research -> AI Personalization Engine -> Full personalized email -> User Preview/Edit -> Email Provider -> Recipient
```

The AI is allowed to generate:
- Subject line
- Greeting
- Personalized opening
- Full body copy
- Call-to-action
- Closing

AI-generated email content must never be replaced by a generic hardcoded fallback unless explicitly required.

---

## 2. WHATSAPP — Approved Meta Template ONLY

WhatsApp must **NEVER** use AI to generate a free-form marketing message.

All outbound WhatsApp marketing messages must be sent through an **APPROVED Meta WhatsApp Template**.

**Flow:**
```
Lead -> Research -> AI Personalization Engine -> Determine template variables -> Approved Meta Template -> WhatsApp Cloud API -> Recipient
```

**What AI may do:**
- Determine the correct value for each template variable (e.g. {{1}} = lead name, {{2}} = company name)

**What AI must NOT do:**
- Rewrite the approved template body
- Generate free-form WhatsApp message text
- Replace approved template content with AI-generated content

---

## 3. AI Engine Responsibility (Per Channel)

```
                    AI ENGINE
                        |
              +----------+---------+
              |                    |
            EMAIL             WHATSAPP
              |                    |
       Full message        Template variables
       generation               only
              |                    |
              v                    v
        Email Provider     Approved Meta
                           WhatsApp Template
                                   |
                                   v
                            WhatsApp Cloud API
```

---

## 4. Absolute Prohibitions

- NO AI-generated free-form WhatsApp marketing messages
- NO sending AI text directly to WhatsApp instead of a template
- NO replacing approved template content with AI-generated content
- NO creating a WhatsApp message in the UI that differs from the actual Meta template
- NO sending a WhatsApp message without an approved Meta template where one is required
- NO hardcoding WhatsApp message text when the template and variables should come from the database
- NO treating WhatsApp and Email personalization as the same generation process

---

## 5. Preview Must Match Actual Delivery

For WhatsApp, the preview shown inside MailFlow MUST represent the actual approved Meta template with the resolved variables.

Example:
Template:    "Hi {{1}}, I came across your practice and wanted to reach out on behalf of {{2}}."
Resolved:    "Hi Dr. Rahul, I came across your practice and wanted to reach out on behalf of Sharma Dental Clinic."

There must NEVER be a situation where: UI Preview != Actual WhatsApp Message Sent

---

## 6. Future Features — Implementation Checklist

Before implementing ANY future Email, WhatsApp, AI, Campaign, Lead, CRM, Analytics, or Messaging feature:

1. Read and follow this architecture.
2. Determine whether the change affects Email or WhatsApp.
3. Preserve the channel-specific AI behavior.
4. Never introduce a free-form WhatsApp AI message flow.
5. Never assume Email and WhatsApp have identical message-generation rules.
6. If a proposed feature conflicts with this architecture, STOP and ask for explicit confirmation before changing the architecture.

---

## 7. Channel AI Output Summary

| Channel   | AI Output                                  |
|-----------|--------------------------------------------|
| EMAIL     | Complete, fully personalized message body  |
| WHATSAPP  | Template variable values only              |

This distinction is PERMANENT and defines MailFlow core product identity.
