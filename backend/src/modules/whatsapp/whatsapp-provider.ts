export interface WhatsappSendOptions {
  phone: string;
  message: string;
  userId: string;
  leadId?: string;
  campaignId?: string;
}

export interface WhatsappSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  error?: string;
}

export interface IWhatsappProvider {
  name: string;
  sendMessage(opts: WhatsappSendOptions): Promise<WhatsappSendResult>;
}

/**
 * Mock WhatsApp Provider — Simulates sending with 2–4s network latency when no API credentials exist.
 * Logs events and returns a mock message ID.
 */
export class MockWhatsappProvider implements IWhatsappProvider {
  name = 'MOCK';

  async sendMessage(opts: WhatsappSendOptions): Promise<WhatsappSendResult> {
    const delayMs = 2000 + Math.floor(Math.random() * 2000);
    console.log(
      `[MockWhatsappProvider] Simulating dispatch to ${opts.phone} (Latency: ${delayMs}ms)...`
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Simple phone validation check simulation
    const cleanPhone = opts.phone.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error(`Invalid recipient phone number format: "${opts.phone}".`);
    }

    const mockMessageId = `wa_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(
      `[MockWhatsappProvider] ✅ Message delivered successfully to ${opts.phone}. ID: ${mockMessageId}`
    );

    return {
      success: true,
      messageId: mockMessageId,
      provider: this.name,
    };
  }
}

/**
 * Factory to get active WhatsApp provider
 */
export class WhatsappProviderFactory {
  static getProvider(): IWhatsappProvider {
    // If TWILIO_ACCOUNT_SID / WHATSAPP_API_KEY environment variables exist in future, return live provider
    return new MockWhatsappProvider();
  }
}
