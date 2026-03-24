import { Injectable, Logger } from '@nestjs/common';

export interface ProcessedContent {
  html: string;
  plainText: string;
  wordCount: number;
  readingTimeMinutes: number;
  headings: { level: number; text: string }[];
  links: { href: string; text: string }[];
  images: string[];
}

@Injectable()
export class ContentProcessorService {
  private readonly logger = new Logger(ContentProcessorService.name);

  /**
   * Process HTML content and extract metadata
   */
  process(html: string): ProcessedContent {
    const plainText = this.htmlToPlainText(html);
    const wordCount = this.countWords(plainText);
    
    return {
      html,
      plainText,
      wordCount,
      readingTimeMinutes: Math.ceil(wordCount / 200), // ~200 words per minute
      headings: this.extractHeadings(html),
      links: this.extractLinks(html),
      images: this.extractImages(html),
    };
  }

  /**
   * Convert HTML to plain text
   */
  htmlToPlainText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Count words in text
   */
  countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Extract headings from HTML
   */
  extractHeadings(html: string): { level: number; text: string }[] {
    const headings: { level: number; text: string }[] = [];
    const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: this.htmlToPlainText(match[2]),
      });
    }

    return headings;
  }

  /**
   * Extract links from HTML
   */
  extractLinks(html: string): { href: string; text: string }[] {
    const links: { href: string; text: string }[] = [];
    const regex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      links.push({
        href: match[1],
        text: this.htmlToPlainText(match[2]),
      });
    }

    return links;
  }

  /**
   * Extract image URLs from HTML
   */
  extractImages(html: string): string[] {
    const images: string[] = [];
    const regex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      images.push(match[1]);
    }

    return images;
  }

  /**
   * Generate table of contents from headings
   */
  generateToc(headings: { level: number; text: string }[]): string {
    if (headings.length === 0) return '';

    const minLevel = Math.min(...headings.map((h) => h.level));
    
    return headings
      .map((h) => {
        const indent = '  '.repeat(h.level - minLevel);
        const slug = h.text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `${indent}- [${h.text}](#${slug})`;
      })
      .join('\n');
  }

  /**
   * Sanitize HTML content (basic XSS prevention)
   */
  sanitize(html: string): string {
    // Remove script tags
    let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove event handlers
    clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: URLs
    clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    
    return clean;
  }
}
