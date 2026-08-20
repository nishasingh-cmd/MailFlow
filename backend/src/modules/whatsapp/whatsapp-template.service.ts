export class WhatsappTemplateService {
  static substituteVariables(templateBody: string, variables: Record<string, string>): string {
    if (!templateBody) return '';
    let result = templateBody;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(regex, value ?? '');
    });

    return result;
  }
}
