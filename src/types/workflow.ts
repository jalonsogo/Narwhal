export type NodeType = 'input' | 'output' | 'agent' | 'tool' | 'knowledge' | 'step' | 'condition';

export interface ToolFunction {
  name: string;
  description: string;
  arguments: Record<string, any>;
}

export interface ToolConfiguration {
  scope?: string;
  functions?: ToolFunction[];
  customConfig?: Record<string, any>;
}

export interface MCPToolset {
  type: 'mcp';
  ref?: string;
  command?: string;
  args?: string[];
  tools?: string[];
  env?: string[];
}

export interface AgentConfiguration {
  name?: string;
  model: string;
  description: string;
  instruction: string;
  toolsets: MCPToolset[];
}

export interface KnowledgeItem {
  id: string;
  type: 'pdf' | 'csv' | 'xlsx' | 'url' | 'file';
  name: string;
  content?: string;
  url?: string;
  size?: number;
  uploadedAt: Date;
}

export interface MemoryEntry {
  id: string;
  memory: string;
  timestamp: Date;
}

export interface GeneratedFile {
  path: string;
  name: string;
  size?: number;
  createdAt: Date;
}

export interface WorkflowOutput {
  response: string;
  generatedFiles: GeneratedFile[];
  executionTime?: number;
  timestamp: Date;
}

export interface WorkflowStep {
  id: string;
  description: string;
  toolIds: string[]; // IDs of tools used in this step
  order: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  icon: string;
  position: { x: number; y: number };
  data?: ToolConfiguration;
  agentConfig?: AgentConfiguration;
  knowledgeItems?: KnowledgeItem[];
  hasKnowledgeAccess?: boolean; // For agent nodes to enable/disable knowledge base access
  output?: WorkflowOutput; // For output node to store execution results
  prompt?: string; // For input node to store the user's prompt
  stepDescription?: string; // For step nodes - description of what this step does
  conditionDescription?: string; // For condition nodes - the condition being checked
  steps?: WorkflowStep[]; // For agent nodes - list of workflow steps
  toolFunction?: string; // For tool nodes - the specific function this tool provides
  showSteps?: boolean; // For agent nodes - whether to show/hide step nodes
  showTools?: boolean; // For agent nodes - whether to show/hide tool nodes
  showConnectors?: boolean; // For agent nodes - whether to show/hide MCP connector nodes
  parentAgentId?: string; // For step/tool/agent nodes - ID of the parent agent (for sub-agents)
  memoryEntries?: MemoryEntry[]; // For memory tool nodes - stored memories
  mcpConfig?: {
    type: 'mcp';
    command: string;
    args: string[];
  }; // For MCP connector tool nodes
  toolsets?: any[]; // For agent nodes - store all toolsets from config (including MCP)
  toolsetType?: 'ref' | 'builtin' | 'mcp'; // For tool nodes created from agent toolsets
  subAgents?: string[]; // For agent nodes - IDs of child agents (sub-agents)
  showSubAgents?: boolean; // For agent nodes - whether to show/hide sub-agent nodes
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  connectionType?: 'flow' | 'tool'; // flow = main execution, tool = agent's tool
}

export interface NodeTemplate {
  type: NodeType;
  name: string;
  icon: string;
  description: string;
  color: string;
  mcpConfig?: {
    type: 'mcp';
    command: string;
    args: string[];
  };
}
