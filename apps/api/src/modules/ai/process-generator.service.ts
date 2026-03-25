import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AIService } from './ai.service';
import { prisma } from '@xclsv/database';

export interface ProcessTemplate {
  title: string;
  description: string;
  content: string;
  suggestedTags: string[];
}

const SOP_TEMPLATE = `## [TITLE]

### Document Information
| Field | Value |
|-------|-------|
| **Owner** | [OWNER] |
| **Department** | [DEPARTMENT] |
| **Last Updated** | [DATE] |
| **Status** | [STATUS] |

---

### 1. Purpose
[Clearly state why this process exists and what it accomplishes]

### 2. Scope
[Define when and where this process applies, and any limitations]

### 3. Prerequisites
- [What needs to be in place before starting]
- [Required access, tools, or permissions]

### 4. Procedure

#### Step 1: [Step Title]
[Detailed instructions]

#### Step 2: [Step Title]
[Detailed instructions]

#### Step 3: [Step Title]
[Detailed instructions]

### 5. Expected Outcomes
[What success looks like when this process is completed correctly]

### 6. Troubleshooting
| Issue | Solution |
|-------|----------|
| [Common problem] | [How to resolve] |

### 7. Related Documents
- [Links to related processes or resources]

---
*This SOP was generated from process documentation.*`;

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

  async generateAndSaveSop(processId: string): Promise<{ sopContent: string }> {
    // Fetch the process
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { owner: true },
    });

    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    // Generate SOP from content
    const prompt = `Convert this process documentation into a formal Standard Operating Procedure (SOP) format.

**Process Title:** ${process.title}
**Owner:** ${process.owner?.name || 'Not assigned'}
**Department:** ${process.area}
**Description:** ${process.description || 'N/A'}

**Current Content:**
${process.content || 'No content provided'}

Create a professional SOP document in Markdown format that includes:
1. Document Information (owner, department, date, status)
2. Purpose - why this process exists
3. Scope - when/where it applies
4. Prerequisites - what's needed before starting
5. Procedure - numbered steps with clear instructions
6. Expected Outcomes - what success looks like
7. Troubleshooting - common issues and solutions table
8. Related Documents - placeholder for links

Use proper markdown formatting with headers (##, ###), tables, and bullet points.
Keep the original process steps but organize them into the SOP structure.
Be professional but concise.`;

    const response = await this.aiService.generate(prompt, {
      maxTokens: 4096,
      temperature: 0.3,
      feature: 'generate-sop',
      systemPrompt: 'You are an expert at creating formal Standard Operating Procedure (SOP) documents. Create clear, professional documentation in Markdown format.',
    });

    // Save the SOP content
    await this.prisma.process.update({
      where: { id: processId },
      data: { sopContent: response.content },
    });

    return { sopContent: response.content };
  }

  async generateSopForAll(): Promise<{ processed: number; errors: string[] }> {
    const processes = await this.prisma.process.findMany({
      where: { 
        sopContent: null,
        content: { not: null },
      },
      select: { id: true, title: true },
    });

    const errors: string[] = [];
    let processed = 0;

    for (const process of processes) {
      try {
        await this.generateAndSaveSop(process.id);
        processed++;
        this.logger.log(`Generated SOP for: ${process.title}`);
      } catch (error) {
        errors.push(`${process.title}: ${error.message}`);
        this.logger.error(`Failed to generate SOP for ${process.title}: ${error.message}`);
      }
    }

    return { processed, errors };
  }
}
