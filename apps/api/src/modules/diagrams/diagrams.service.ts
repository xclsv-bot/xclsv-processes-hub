import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';

export interface DiagramNode {
  id: string;
  sequence: number;
  title: string;
  owners: string[];
  tools: string[];
  isHandoff: boolean;
}

export interface NumberedFlowDiagram {
  processId: string;
  processTitle: string;
  mermaidSyntax: string;
  nodes: DiagramNode[];
  handoffCount: number;
  generatedAt: Date;
}

export interface FlowchartDiagram {
  processId: string;
  processTitle: string;
  mermaidSyntax: string;
  nodeCount: number;
  hasDecisionPoints: boolean;
  generatedAt: Date;
}

@Injectable()
export class DiagramsService {
  private readonly logger = new Logger(DiagramsService.name);

  /**
   * WO-45: Generate Mermaid numbered step flow
   * Simple linear flow with numbered circles and owner labels
   */
  async generateNumberedFlow(processId: string): Promise<NumberedFlowDiagram> {
    const process = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });

    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    const steps = await prisma.processStep.findMany({
      where: { processId, deletedAt: null },
      orderBy: { sequence: 'asc' },
      include: {
        owners: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        tools: {
          include: {
            tool: { select: { id: true, name: true, icon: true } },
          },
        },
      },
    });

    if (steps.length === 0) {
      return {
        processId,
        processTitle: process.title,
        mermaidSyntax: 'graph TD\n  empty[No steps defined]',
        nodes: [],
        handoffCount: 0,
        generatedAt: new Date(),
      };
    }

    // Detect handoff points
    const handoffPoints = this.detectHandoffs(steps);

    // Build nodes
    const nodes: DiagramNode[] = steps.map((step) => ({
      id: step.id,
      sequence: step.sequence,
      title: step.title,
      owners: step.owners.map((o) => o.user.name),
      tools: step.tools.map((t) => t.tool.name),
      isHandoff: handoffPoints.has(step.id),
    }));

    // Generate Mermaid syntax
    const mermaidSyntax = this.generateNumberedFlowMermaid(nodes, process.title);

    this.logger.log(`Generated numbered flow for process ${processId} with ${nodes.length} steps`);

    return {
      processId,
      processTitle: process.title,
      mermaidSyntax,
      nodes,
      handoffCount: handoffPoints.size,
      generatedAt: new Date(),
    };
  }

  /**
   * WO-46: Generate Mermaid professional flowchart
   * Complex diagram with decision points, boxes, and diamonds
   */
  async generateFlowchart(processId: string): Promise<FlowchartDiagram> {
    const process = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });

    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    const steps = await prisma.processStep.findMany({
      where: { processId, deletedAt: null },
      orderBy: { sequence: 'asc' },
      include: {
        owners: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        tools: {
          include: {
            tool: { select: { id: true, name: true, icon: true } },
          },
        },
      },
    });

    if (steps.length === 0) {
      return {
        processId,
        processTitle: process.title,
        mermaidSyntax: 'flowchart TD\n  empty[No steps defined]',
        nodeCount: 0,
        hasDecisionPoints: false,
        generatedAt: new Date(),
      };
    }

    // Analyze for decision points (look for keywords in descriptions)
    const decisionKeywords = ['if', 'decision', 'approve', 'reject', 'yes/no', 'check', 'verify', 'review'];
    const hasDecisionPoints = steps.some((step) => {
      const text = (step.title + ' ' + (step.description || '')).toLowerCase();
      return decisionKeywords.some((kw) => text.includes(kw));
    });

    // Generate Mermaid flowchart syntax
    const mermaidSyntax = this.generateFlowchartMermaid(steps, process.title, hasDecisionPoints);

    this.logger.log(`Generated flowchart for process ${processId} with ${steps.length} nodes`);

    return {
      processId,
      processTitle: process.title,
      mermaidSyntax,
      nodeCount: steps.length,
      hasDecisionPoints,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate department-wide view showing multiple processes
   */
  async generateDepartmentView(area: string): Promise<{ mermaidSyntax: string; processes: string[] }> {
    const processes = await prisma.process.findMany({
      where: { area: area as any, deletedAt: null, status: 'PUBLISHED' },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { sequence: 'asc' },
          take: 1,
        },
      },
    });

    if (processes.length === 0) {
      return {
        mermaidSyntax: `flowchart TD\n  empty[No published processes in ${area}]`,
        processes: [],
      };
    }

    // Build department overview
    let mermaid = `flowchart TD\n`;
    mermaid += `  subgraph ${area.replace('_', ' ')}\n`;

    processes.forEach((p, i) => {
      const nodeId = `p${i}`;
      const label = p.title.replace(/"/g, "'").slice(0, 40);
      mermaid += `    ${nodeId}["${label}"]\n`;
    });

    // Connect processes that might be related (simple sequential for now)
    for (let i = 0; i < processes.length - 1; i++) {
      mermaid += `    p${i} -.-> p${i + 1}\n`;
    }

    mermaid += `  end\n`;

    return {
      mermaidSyntax: mermaid,
      processes: processes.map((p) => p.title),
    };
  }

  private detectHandoffs(steps: any[]): Set<string> {
    const handoffs = new Set<string>();

    for (let i = 1; i < steps.length; i++) {
      const prevOwners = new Set(steps[i - 1].owners.map((o: any) => o.user.id));
      const currOwners = new Set(steps[i].owners.map((o: any) => o.user.id));

      if (prevOwners.size > 0 && currOwners.size > 0) {
        const hasOverlap = [...prevOwners].some((id) => currOwners.has(id));
        if (!hasOverlap) {
          handoffs.add(steps[i].id);
        }
      }
    }

    return handoffs;
  }

  private generateNumberedFlowMermaid(nodes: DiagramNode[], title: string): string {
    let mermaid = `graph TD\n`;
    mermaid += `  %% ${title}\n`;

    // Define nodes with numbered circles
    nodes.forEach((node) => {
      const nodeId = `step${node.sequence}`;
      const ownerText = node.owners.length > 0 ? `<br/><small>${node.owners[0]}</small>` : '';
      const label = `${node.sequence}. ${node.title.slice(0, 30)}${ownerText}`;

      if (node.isHandoff) {
        // Handoff nodes get special styling
        mermaid += `  ${nodeId}((("${label}")))\n`;
        mermaid += `  style ${nodeId} fill:#fef3c7,stroke:#f59e0b,stroke-width:3px\n`;
      } else {
        // Regular numbered circle
        mermaid += `  ${nodeId}(("${label}"))\n`;
        mermaid += `  style ${nodeId} fill:#eff6ff,stroke:#3b82f6,stroke-width:2px\n`;
      }
    });

    // Connect nodes sequentially
    for (let i = 0; i < nodes.length - 1; i++) {
      const fromId = `step${nodes[i].sequence}`;
      const toId = `step${nodes[i + 1].sequence}`;
      const isHandoffTransition = nodes[i + 1].isHandoff;

      if (isHandoffTransition) {
        mermaid += `  ${fromId} -.->|handoff| ${toId}\n`;
      } else {
        mermaid += `  ${fromId} --> ${toId}\n`;
      }
    }

    return mermaid;
  }

  private generateFlowchartMermaid(steps: any[], title: string, hasDecisions: boolean): string {
    let mermaid = `flowchart TD\n`;
    mermaid += `  %% ${title}\n`;

    // Start node
    mermaid += `  start([Start]) --> step1\n`;

    // Define step nodes
    steps.forEach((step, i) => {
      const nodeId = `step${step.sequence}`;
      const owners = step.owners.map((o: any) => o.user.name).join(', ');
      const tools = step.tools.map((t: any) => t.tool.icon || t.tool.name.charAt(0)).join(' ');
      
      let label = step.title.replace(/"/g, "'").slice(0, 35);
      if (owners) label += `<br/><small>👤 ${owners}</small>`;
      if (tools) label += `<br/><small>🔧 ${tools}</small>`;

      // Check if this looks like a decision step
      const isDecision = hasDecisions && /review|check|approve|verify|decision/i.test(step.title);

      if (isDecision) {
        mermaid += `  ${nodeId}{{"${label}"}}\n`;
      } else {
        mermaid += `  ${nodeId}["${label}"]\n`;
      }

      // Connect to next step
      if (i < steps.length - 1) {
        const nextId = `step${steps[i + 1].sequence}`;
        if (isDecision) {
          mermaid += `  ${nodeId} -->|Yes| ${nextId}\n`;
          // Add a rejection path to end for decision nodes
          mermaid += `  ${nodeId} -->|No| reject${step.sequence}[Rejected]\n`;
        } else {
          mermaid += `  ${nodeId} --> ${nextId}\n`;
        }
      }
    });

    // End node
    if (steps.length > 0) {
      mermaid += `  step${steps[steps.length - 1].sequence} --> finish([End])\n`;
    }

    return mermaid;
  }
}
