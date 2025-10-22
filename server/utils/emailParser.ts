import { simpleParser, ParsedMail } from 'mailparser';
import * as cheerio from 'cheerio';

export interface ParsedEmail {
  subject: string;
  from: { email: string; name: string };
  to: string;
  date: Date;
  htmlBody: string;
  plainBody: string;
  snippet: string;
  hasImages: boolean;
}

/**
 * Parse Gmail message into structured format
 */
export async function parseGmailMessage(gmailMessage: any): Promise<ParsedEmail> {
  // Extract headers
  const headers = gmailMessage.payload.headers;
  const getHeader = (name: string) => {
    const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  };

  const subject = getHeader('Subject');
  const fromHeader = getHeader('From');
  const toHeader = getHeader('To');
  const dateHeader = getHeader('Date');

  // Parse from address
  const fromMatch = fromHeader.match(/(.*?)\s*<(.+?)>/) || [null, fromHeader, fromHeader];
  const fromName = fromMatch[1]?.trim() || '';
  const fromEmail = fromMatch[2]?.trim() || fromHeader;

  // Extract body
  let htmlBody = '';
  let plainBody = '';

  const extractBody = (part: any) => {
    if (part.mimeType === 'text/html' && part.body.data) {
      htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/plain' && part.body.data) {
      plainBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }

    if (part.parts) {
      part.parts.forEach(extractBody);
    }
  };

  extractBody(gmailMessage.payload);

  // If no plain text, extract from HTML
  if (!plainBody && htmlBody) {
    const $ = cheerio.load(htmlBody);
    // Remove script and style tags
    $('script, style').remove();
    plainBody = $.text().replace(/\s+/g, ' ').trim();
  }

  // Generate snippet
  const snippet = gmailMessage.snippet || plainBody.substring(0, 200);

  // Check for images
  const hasImages = htmlBody.includes('<img') || htmlBody.includes('background-image');

  return {
    subject,
    from: { email: fromEmail, name: fromName },
    to: toHeader,
    date: new Date(dateHeader || Date.now()),
    htmlBody,
    plainBody,
    snippet,
    hasImages,
  };
}

/**
 * Extract text content for AI analysis
 */
export function extractTextForAI(parsed: ParsedEmail): string {
  // Combine subject and body for AI analysis
  const text = `${parsed.subject}\n\n${parsed.plainBody}`;
  // Limit to reasonable length for AI
  return text.substring(0, 10000);
}

/**
 * Clean HTML for storage
 */
export function cleanHtml(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove tracking pixels and scripts
  $('script, iframe').remove();
  $('img[width="1"], img[height="1"]').remove();
  
  return $.html();
}

