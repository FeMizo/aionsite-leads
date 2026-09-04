declare module "mailparser" {
  export function simpleParser(source: Buffer | string): Promise<{
    text?: string;
    subject?: string;
    messageId?: string;
  }>;
}
