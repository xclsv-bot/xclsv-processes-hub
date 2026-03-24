import { Injectable, Logger } from '@nestjs/common';
import { AIService } from './ai.service';

export interface ProcessTemplate {
  title: string;
  description: string;
  content: string;
  suggestedTags: string[];
}

@Injectable()
export class ProcessGeneratorService {
  private readonly logger = new Logger(ProcessGeneratorService.name);

  constructor(private readonly aiService: AIService) {}

  async generateProcess(
    topic: string,
    area: string,
    userId: string,
  ): Promise<ProcessTemplate> {
    const prompt = `Create a comprehensive process document for the following topic in a ${area} context:

Topic: ${topic}

Generate a well-structured process document that includes:
1. A clear, descriptive title
2. A brief description (2-3 sentences)
3. Full content with:
   - Purpose/Overview
   - Prerequisites
   - Step-by-step instructions
   - Expected outcomes
   - Common issues and solutions
   - Tips for success

Format the content in HTML with proper headings (h2, h3), lists, and paragraphs.

Also suggest 3-5 relevant tags for categorization.

Respond in this exact JSON format:
{
  "title": "Process Title",
  "description": "Brief description",
  "content": "<h2>Overview</h2><p>...</p>",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

    const response = await this.aiService.generate(prompt, {
      maxTokens: 4096,
      temperature: 0.7,
      userId,
      feature: 'process-generator',
      systemPrompt: 'You are an expert at creating detailed business process documentation. Always respond with valid JSON.',
    });

    try {
      // Extract JSON from response (might have markdown code blocks)
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const result = JSON.parse(jsonStr);
      return {
        title: result.title || topic,
        description: result.description || '',
        content: result.content || '',
        suggestedTags: result.suggestedTags || [],
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      // Return a basic template if parsing fails
      return {
        title: topic,
        description: `Process for ${topic}`,
        content: response.content,
        suggestedTags: [area.toLowerCase()],
      };
    }
  }

  async suggestImprovements(content: string, userId: string): Promise<string[]> {
    const prompt = `Analyze this process documentation and suggest specific improvements:

${content}

Provide 3-5 specific, actionable suggestions to improve this documentation.
Format as a JSON array of strings: ["suggestion1", "suggestion2", ...]`;

    const response = await this.aiService.generate(prompt, {
      maxTokens: 1024,
      temperature: 0.5,
      userId,
      feature: 'suggest-improvements',
    });

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [response.content];
    } catch {
      return [response.content];
    }
  }

  async generateSection(
    existingContent: string,
    sectionType: string,
    userId: string,
  ): Promise<string> {
    const sectionPrompts: Record<string, string> = {
      prerequisites: 'Generate a "Prerequisites" section listing what is needed before starting this process.',
      troubleshooting: 'Generate a "Troubleshooting" section with common issues and solutions.',
      checklist: 'Generate a checklist summary of the key steps in this process.',
      faq: 'Generate an FAQ section with common questions about this process.',
    };

    const prompt = `Based on this process documentation:

${existingContent}

${sectionPrompts[sectionType] || `Generate a "${sectionType}" section.`}

Format the response in HTML.`;

    const response = await this.aiService.generate(prompt, {
      maxTokens: 1024,
      userId,
      feature: `generate-section-${sectionType}`,
    });

    return response.content;
  }
}
