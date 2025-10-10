import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useDrop } from 'react-dnd';
import { WorkflowNode } from './WorkflowNode';
import { AgentDropZone } from './AgentDropZone';
import { KnowledgeNode } from './KnowledgeNode';
import { WorkflowNode as WorkflowNodeType, Connection, NodeTemplate, KnowledgeItem, AgentConfiguration, MCPToolset, WorkflowStep } from '../types/workflow';
import { ConfigPanel } from './ConfigPanel';
import { OutputPanel } from './OutputPanel';
import { ToolConfigPanel } from './ToolConfigPanel';
import { Button } from './ui/button';
import * as LucideIcons from 'lucide-react';
import yaml from 'js-yaml';
import { getToolFunctions } from '../data/toolDefinitions';

const INPUT_NODE_ID = 'default-input';
const OUTPUT_NODE_ID = 'default-output';
const KNOWLEDGE_NODE_ID = 'default-knowledge';

export const WorkflowCanvas = forwardRef((props, ref) => {
  const [nodes, setNodes] = useState<WorkflowNodeType[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showDropZone, setShowDropZone] = useState(true);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [tempConnection, setTempConnection] = useState<{ from: string; x: number; y: number } | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [outputPanelOpen, setOutputPanelOpen] = useState(false);
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<WorkflowNodeType | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const isConnectingRef = useRef(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [toolConfigDialogOpen, setToolConfigDialogOpen] = useState(false);
  const [selectedToolForConfig, setSelectedToolForConfig] = useState<WorkflowNodeType | null>(null);

  // Panning state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  // Panning handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan on middle mouse button or left click on empty space
    if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
      e.preventDefault();
      setIsPanning(true);
      isPanningRef.current = true;
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning && isPanningRef.current) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    isPanningRef.current = false;
  };

  // Add global mouse up listener for panning
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        isPanningRef.current = false;
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPanning]);

  // Expose createEmptyAgent method via ref
  useImperativeHandle(ref, () => ({
    createEmptyAgent: () => {
      const newAgent: WorkflowNodeType = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        name: 'New Agent',
        icon: 'Bot',
        position: { x: 400, y: 250 },
        description: '',
        toolsets: [],
        prompt: '',
        showTools: true,
        showConnectors: true,
      };
      setNodes(prev => [...prev, newAgent]);
      // Open config panel immediately
      setSelectedNodeForConfig(newAgent);
      setConfigDialogOpen(true);
    }
  }));

  // Initialize with default Input, Output, and Knowledge nodes
  useEffect(() => {
    const inputNode: WorkflowNodeType = {
      id: INPUT_NODE_ID,
      type: 'input',
      name: 'Input',
      icon: 'PlayCircle',
      position: { x: 50, y: 150 },
    };

    const outputNode: WorkflowNodeType = {
      id: OUTPUT_NODE_ID,
      type: 'output',
      name: 'Output',
      icon: 'CheckCircle',
      position: { x: 700, y: 150 },
      output: {
        response: 'This is a sample workflow output from the agent execution.\n\nThe workflow has been completed successfully with the following results:\n- Processed input data\n- Applied transformations\n- Generated output files\n\nAll tasks completed without errors.',
        generatedFiles: [
          {
            path: '/workspace/output/report.txt',
            name: 'report.txt',
            size: 2048,
            createdAt: new Date(),
          },
          {
            path: '/workspace/output/data.csv',
            name: 'data.csv',
            size: 15360,
            createdAt: new Date(),
          },
        ],
        executionTime: 3456,
        timestamp: new Date(),
      },
    };

    const knowledgeNode: WorkflowNodeType = {
      id: KNOWLEDGE_NODE_ID,
      type: 'knowledge',
      name: 'Knowledge Base',
      icon: 'Database',
      position: { x: 50, y: 400 },
      knowledgeItems: [],
    };

    setNodes([inputNode, outputNode, knowledgeNode]);
  }, []);

  // Check if there's an agent in the workflow to hide the drop zone
  useEffect(() => {
    const hasAgent = nodes.some(node => node.type === 'agent');
    setShowDropZone(!hasAgent);
  }, [nodes]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'node',
    drop: async (item: NodeTemplate, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = offset.x - canvasRect.left - 100;
        const y = offset.y - canvasRect.top - 60;

        // Don't allow dropping Input or Output nodes
        if (item.type === 'input' || item.type === 'output') {
          return;
        }

        const newNode: WorkflowNodeType = {
          id: `node-${Date.now()}-${Math.random()}`,
          type: item.type,
          name: item.name,
          icon: item.icon,
          position: { x, y },
          hasKnowledgeAccess: item.type === 'agent' ? true : undefined,
          mcpConfig: item.mcpConfig,
          toolsetType: item.mcpConfig ? 'mcp' : undefined,
        };

        // If it's an agent, fetch its configuration and create tool nodes
        if (item.type === 'agent') {
          try {
            const response = await fetch(`http://localhost:8080/api/agents/${item.name}`);
            if (response.ok) {
              const agentData = await response.json();
              const rootAgent = agentData.agents?.root || {};

              // Create tool nodes for each toolset
              const toolNodesToAdd: WorkflowNodeType[] = [];
              const connectionsToAdd: Connection[] = [];

              if (rootAgent.toolsets && Array.isArray(rootAgent.toolsets)) {
                // Store all toolsets on the agent node for display in card
                newNode.toolsets = rootAgent.toolsets;
                newNode.showTools = true; // Default to showing tools
                newNode.showConnectors = true; // Default to showing connectors

                // Helper function to get display name for built-in tools
                const getToolDisplayName = (tool: any): string => {
                  if (tool.ref) return tool.ref;
                  const builtInToolNames: Record<string, string> = {
                    'think': 'Think',
                    'todo': 'Todo List',
                    'memory': 'Memory',
                    'code': 'Code Execution',
                    'browser': 'Browser',
                    'filesystem': 'File System',
                  };
                  return builtInToolNames[tool.type] || tool.type || 'Tool';
                };

                // Helper function to get icon for toolset type
                const getToolIcon = (toolset: any): string => {
                  if (toolset.type === 'mcp') return 'Cloud';
                  if (toolset.ref) return 'Wrench';
                  // Built-in tools
                  const builtInIcons: Record<string, string> = {
                    'think': 'Lightbulb',
                    'todo': 'CheckSquare',
                    'memory': 'Brain',
                    'code': 'Code',
                    'browser': 'Globe',
                    'filesystem': 'FolderOpen',
                  };
                  return builtInIcons[toolset.type] || 'Wrench';
                };

                // Create nodes for ALL toolsets (tools with ref, built-in tools, and MCP connectors)
                const columns = 2;
                const toolSpacingX = 250; // Horizontal spacing
                const toolSpacingY = 140; // Vertical spacing
                const startOffsetY = 180; // Start below the agent node

                rootAgent.toolsets.forEach((toolset: any, index: number) => {
                  const row = Math.floor(index / columns);
                  const col = index % columns;

                  // Determine toolset type
                  const toolsetType: 'ref' | 'builtin' | 'mcp' =
                    toolset.type === 'mcp' ? 'mcp' :
                    toolset.ref ? 'ref' : 'builtin';

                  // Get display name
                  const displayName = toolset.type === 'mcp'
                    ? (toolset.command || 'MCP Connector')
                    : getToolDisplayName(toolset);

                  // Get functions for this tool from toolDefinitions
                  const toolFunctions = getToolFunctions(displayName);

                  const toolNode: WorkflowNodeType = {
                    id: `node-${Date.now()}-${Math.random()}-${index}`,
                    type: 'tool',
                    name: displayName,
                    icon: getToolIcon(toolset),
                    position: {
                      x: newNode.position.x + (col * toolSpacingX) - 110, // Center below agent
                      y: newNode.position.y + startOffsetY + (row * toolSpacingY),
                    },
                    parentAgentId: newNode.id,
                    toolsetType: toolsetType,
                    mcpConfig: toolset.type === 'mcp' ? {
                      type: 'mcp',
                      command: toolset.command,
                      args: toolset.args || [],
                    } : undefined,
                    data: toolFunctions.length > 0 ? {
                      functions: toolFunctions.map(f => f.name),
                    } : undefined,
                  };

                  toolNodesToAdd.push(toolNode);

                  // Create connection from tool to agent
                  const connection: Connection = {
                    id: `conn-${Date.now()}-${index}`,
                    sourceId: toolNode.id,
                    targetId: newNode.id,
                    connectionType: 'tool',
                  };

                  connectionsToAdd.push(connection);
                });
              }

              // Add agent and all tool nodes together in a single state update
              setNodes(prev => [...prev, newNode, ...toolNodesToAdd]);
              // Add all connections
              if (connectionsToAdd.length > 0) {
                setConnections(prev => [...prev, ...connectionsToAdd]);
              }
            } else {
              // If fetch fails, just add the agent node
              setNodes(prev => [...prev, newNode]);
            }
          } catch (error) {
            console.error('Failed to fetch agent config on drop:', error);
            // If fetch fails, just add the agent node
            setNodes(prev => [...prev, newNode]);
          }
        } else {
          // For non-agent nodes, just add the node
          setNodes(prev => [...prev, newNode]);
        }

        // Check if dropped on a connection line to insert in the middle
        if (hoveredConnection && item.type === 'agent') {
          const connection = connections.find(c => c.id === hoveredConnection);
          if (connection && connection.connectionType !== 'tool') {
            // Delete the old connection
            setConnections(prev => prev.filter(c => c.id !== hoveredConnection));

            // Create two new connections with the agent in the middle
            const conn1: Connection = {
              id: `conn-${Date.now()}-1`,
              sourceId: connection.sourceId,
              targetId: newNode.id,
              connectionType: 'flow',
            };

            const conn2: Connection = {
              id: `conn-${Date.now()}-2`,
              sourceId: newNode.id,
              targetId: connection.targetId,
              connectionType: 'flow',
            };

            setConnections(prev => [...prev, conn1, conn2]);
          }
        }

        setHoveredConnection(null);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const setRefs = (element: HTMLDivElement | null) => {
    canvasRef.current = element;
    drop(element);
  };

  const handleNodeMove = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(node =>
      node.id === id ? { ...node, position: { x, y } } : node
    ));
  };

  const handleNodeDelete = (id: string) => {
    // Don't allow deleting default Input, Output, and Knowledge nodes
    if (id === INPUT_NODE_ID || id === OUTPUT_NODE_ID || id === KNOWLEDGE_NODE_ID) {
      return;
    }

    // If deleting an agent with sub-agents, also delete all its sub-agents and their tools
    const nodeToDelete = nodes.find(n => n.id === id);
    const nodesToDelete = [id];

    if (nodeToDelete?.type === 'agent' && nodeToDelete.subAgents) {
      // Add all sub-agents to deletion list
      nodeToDelete.subAgents.forEach(subAgentId => {
        nodesToDelete.push(subAgentId);
        // Find and delete tools for each sub-agent
        nodes.forEach(n => {
          if (n.type === 'tool' && n.parentAgentId === subAgentId) {
            nodesToDelete.push(n.id);
          }
        });
      });
    }

    // If it's a sub-agent, remove it from parent's subAgents array
    if (nodeToDelete?.parentAgentId && nodeToDelete?.type === 'agent') {
      setNodes(prev => prev.map(node => {
        if (node.id === nodeToDelete.parentAgentId) {
          return {
            ...node,
            subAgents: (node.subAgents || []).filter(saId => saId !== id),
          };
        }
        return node;
      }));
    }

    setNodes(prev => prev.filter(node => !nodesToDelete.includes(node.id)));
    setConnections(prev => prev.filter(conn =>
      !nodesToDelete.includes(conn.sourceId) && !nodesToDelete.includes(conn.targetId)
    ));
  };

  const handleKnowledgeItemAdd = (nodeId: string, item: KnowledgeItem) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, knowledgeItems: [...(node.knowledgeItems || []), item] }
        : node
    ));
  };

  const handleKnowledgeItemRemove = (nodeId: string, itemId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, knowledgeItems: (node.knowledgeItems || []).filter(item => item.id !== itemId) }
        : node
    ));
  };

  const handleToggleKnowledge = (nodeId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, hasKnowledgeAccess: node.hasKnowledgeAccess === false ? true : false }
        : node
    ));
  };

  const handleToggleSteps = (nodeId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, showSteps: !node.showSteps }
        : node
    ));
  };

  const handlePromptChange = (nodeId: string, prompt: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, prompt }
        : node
    ));
  };

  const handleNodeUpdate = (nodeId: string, updates: Partial<WorkflowNodeType>) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, ...updates }
        : node
    ));
  };

  const handleToolDropOnAgent = async (agentId: string, item: NodeTemplate) => {
    // Find the agent node
    const agentNode = nodes.find(n => n.id === agentId);
    if (!agentNode) return;

    // If it's an agent being dropped, create a sub-agent
    if (item.type === 'agent') {
      // Count existing sub-agents for this agent to position the new one
      const existingSubAgents = nodes.filter(n => n.type === 'agent' && n.parentAgentId === agentId);
      const subAgentCount = existingSubAgents.length;

      // Calculate position in grid layout (2 columns) below tools
      const columns = 2;
      const subAgentSpacingX = 250;
      const subAgentSpacingY = 140;
      // Start further down to avoid overlapping with tools
      const existingTools = getAgentTools(agentId);
      const toolRows = Math.ceil(existingTools.length / columns);
      const startOffsetY = 180 + (toolRows * 140); // Position below all tools
      const row = Math.floor(subAgentCount / columns);
      const col = subAgentCount % columns;

      // Create the sub-agent node
      const subAgentNode: WorkflowNodeType = {
        id: `node-${Date.now()}-${Math.random()}`,
        type: 'agent',
        name: item.name,
        icon: item.icon,
        position: {
          x: agentNode.position.x + (col * subAgentSpacingX) - 110,
          y: agentNode.position.y + startOffsetY + (row * subAgentSpacingY),
        },
        parentAgentId: agentId,
        hasKnowledgeAccess: true,
        showSubAgents: true,
      };

      // If it's an agent from the sidebar, fetch its configuration and create tool nodes
      if (item.name !== 'New Agent') {
        try {
          const response = await fetch(`http://localhost:8080/api/agents/${item.name}`);
          if (response.ok) {
            const agentData = await response.json();
            const rootAgent = agentData.agents?.root || {};

            // Create tool nodes for the sub-agent
            const toolNodesToAdd: WorkflowNodeType[] = [];
            const connectionsToAdd: Connection[] = [];

            if (rootAgent.toolsets && Array.isArray(rootAgent.toolsets)) {
              subAgentNode.toolsets = rootAgent.toolsets;
              subAgentNode.showTools = true;
              subAgentNode.showConnectors = true;

              const getToolDisplayName = (tool: any): string => {
                if (tool.ref) return tool.ref;
                const builtInToolNames: Record<string, string> = {
                  'think': 'Think',
                  'todo': 'Todo List',
                  'memory': 'Memory',
                  'code': 'Code Execution',
                  'browser': 'Browser',
                  'filesystem': 'File System',
                };
                return builtInToolNames[tool.type] || tool.type || 'Tool';
              };

              const getToolIcon = (toolset: any): string => {
                if (toolset.type === 'mcp') return 'Cloud';
                if (toolset.ref) return 'Wrench';
                const builtInIcons: Record<string, string> = {
                  'think': 'Lightbulb',
                  'todo': 'CheckSquare',
                  'memory': 'Brain',
                  'code': 'Code',
                  'browser': 'Globe',
                  'filesystem': 'FolderOpen',
                };
                return builtInIcons[toolset.type] || 'Wrench';
              };

              const toolColumns = 2;
              const toolSpacingX = 250;
              const toolSpacingY = 140;
              const toolStartOffsetY = 180;

              rootAgent.toolsets.forEach((toolset: any, index: number) => {
                const toolRow = Math.floor(index / toolColumns);
                const toolCol = index % toolColumns;

                const toolsetType: 'ref' | 'builtin' | 'mcp' =
                  toolset.type === 'mcp' ? 'mcp' :
                  toolset.ref ? 'ref' : 'builtin';

                const displayName = toolset.type === 'mcp'
                  ? (toolset.command || 'MCP Connector')
                  : getToolDisplayName(toolset);

                const toolFunctions = getToolFunctions(displayName);

                const toolNode: WorkflowNodeType = {
                  id: `node-${Date.now()}-${Math.random()}-${index}`,
                  type: 'tool',
                  name: displayName,
                  icon: getToolIcon(toolset),
                  position: {
                    x: subAgentNode.position.x + (toolCol * toolSpacingX) - 110,
                    y: subAgentNode.position.y + toolStartOffsetY + (toolRow * toolSpacingY),
                  },
                  parentAgentId: subAgentNode.id,
                  toolsetType: toolsetType,
                  mcpConfig: toolset.type === 'mcp' ? {
                    type: 'mcp',
                    command: toolset.command,
                    args: toolset.args || [],
                  } : undefined,
                  data: toolFunctions.length > 0 ? {
                    functions: toolFunctions.map(f => f.name),
                  } : undefined,
                };

                toolNodesToAdd.push(toolNode);

                const connection: Connection = {
                  id: `conn-${Date.now()}-${index}`,
                  sourceId: toolNode.id,
                  targetId: subAgentNode.id,
                  connectionType: 'tool',
                };

                connectionsToAdd.push(connection);
              });
            }

            // Add sub-agent and all its tool nodes
            setNodes(prev => [...prev, subAgentNode, ...toolNodesToAdd]);
            if (connectionsToAdd.length > 0) {
              setConnections(prev => [...prev, ...connectionsToAdd]);
            }
          } else {
            setNodes(prev => [...prev, subAgentNode]);
          }
        } catch (error) {
          console.error('Failed to fetch agent config for sub-agent:', error);
          setNodes(prev => [...prev, subAgentNode]);
        }
      } else {
        setNodes(prev => [...prev, subAgentNode]);
      }

      // Update the parent agent to track this sub-agent
      setNodes(prev => prev.map(node => {
        if (node.id === agentId) {
          const updatedSubAgents = [...(node.subAgents || []), subAgentNode.id];
          return { ...node, subAgents: updatedSubAgents, showSubAgents: true };
        }
        return node;
      }));

      // Create a connection from sub-agent to parent agent
      const subAgentConnection: Connection = {
        id: `conn-${Date.now()}-subagent`,
        sourceId: subAgentNode.id,
        targetId: agentId,
        connectionType: 'tool', // Use 'tool' type for sub-agents to get the dashed line
      };

      setConnections(prev => [...prev, subAgentConnection]);

      return;
    }

    // Original tool drop logic
    const existingTools = getAgentTools(agentId);
    const toolCount = existingTools.length;

    const columns = 2;
    const toolSpacingX = 250;
    const toolSpacingY = 140;
    const startOffsetY = 180;
    const row = Math.floor(toolCount / columns);
    const col = toolCount % columns;

    const toolFunctions = getToolFunctions(item.name);

    const toolNode: WorkflowNodeType = {
      id: `node-${Date.now()}-${Math.random()}`,
      type: 'tool',
      name: item.name,
      icon: item.icon,
      position: {
        x: agentNode.position.x + (col * toolSpacingX) - 110,
        y: agentNode.position.y + startOffsetY + (row * toolSpacingY),
      },
      parentAgentId: agentId,
      toolsetType: item.mcpConfig ? 'mcp' : 'builtin',
      mcpConfig: item.mcpConfig,
      data: toolFunctions.length > 0 ? {
        functions: toolFunctions.map(f => f.name),
      } : undefined,
    };

    const toolsetEntry: any = item.mcpConfig ? {
      type: 'mcp',
      name: item.name,
      command: item.mcpConfig.command,
      args: item.mcpConfig.args,
    } : {
      type: item.name.toLowerCase().replace(/\s+/g, '_'),
    };

    setNodes(prev => prev.map(node => {
      if (node.id === agentId) {
        const updatedToolsets = [...(node.toolsets || []), toolsetEntry];
        return { ...node, toolsets: updatedToolsets };
      }
      return node;
    }));

    setNodes(prev => [...prev, toolNode]);

    const connection: Connection = {
      id: `conn-${Date.now()}`,
      sourceId: toolNode.id,
      targetId: agentId,
      connectionType: 'tool',
    };

    setConnections(prev => [...prev, connection]);
  };

  const getKnowledgeItemCount = () => {
    const knowledgeNode = nodes.find(n => n.type === 'knowledge');
    return knowledgeNode?.knowledgeItems?.length || 0;
  };

  const handleConnectionStart = (nodeId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      isConnectingRef.current = true;
      const sourceNode = nodes.find(n => n.id === nodeId);
      if (sourceNode && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        setTempConnection({
          from: nodeId,
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top,
        });
      }
    } else {
      setConnectingFrom(nodeId);
    }
  };

  const handleConnectionEnd = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) {
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        sourceId: connectingFrom,
        targetId: nodeId,
      };
      setConnections(prev => [...prev, newConnection]);
    }
    setConnectingFrom(null);
  };

  const handleConnectionDrag = (e: React.MouseEvent) => {
    if (tempConnection && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setTempConnection({
        ...tempConnection,
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
      });
    }
  };

  const handleConnectionDrop = (nodeId: string) => {
    if (tempConnection && tempConnection.from !== nodeId) {
      const sourceNode = nodes.find(n => n.id === tempConnection.from);
      const targetNode = nodes.find(n => n.id === nodeId);

      const exists = connections.some(
        conn => conn.sourceId === tempConnection.from && conn.targetId === nodeId
      );

      if (!exists && sourceNode && targetNode) {
        const connectionType = sourceNode.type === 'tool' && targetNode.type === 'agent'
          ? 'tool'
          : 'flow';

        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          sourceId: tempConnection.from,
          targetId: nodeId,
          connectionType,
        };
        setConnections(prev => [...prev, newConnection]);
      }
    }
    setTempConnection(null);
    isConnectingRef.current = false;
  };

  const handleConnectionCancel = () => {
    if (isConnectingRef.current) {
      setTempConnection(null);
      isConnectingRef.current = false;
    }
  };

  const handleDeleteConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  };

  const handleClearAll = () => {
    // Keep only Input, Output, and Knowledge nodes (but clear knowledge items)
    setNodes(prev => prev.filter(node =>
      node.id === INPUT_NODE_ID || node.id === OUTPUT_NODE_ID || node.id === KNOWLEDGE_NODE_ID
    ).map(node =>
      node.id === KNOWLEDGE_NODE_ID ? { ...node, knowledgeItems: [] } : node
    ));
    setConnections([]);
  };

  const handleImportAgent = () => {
    setShowMoreMenu(false);

    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = yaml.load(text) as any;

        // Parse cagent YAML format
        if (!parsed.agents) {
          alert('Invalid cagent YAML: No agents found');
          return;
        }

        // Get agents from YAML (can be root or named agents)
        const agentEntries = Object.entries(parsed.agents);
        let xOffset = 250; // Start position for first agent

        const newNodes: WorkflowNodeType[] = [];
        const newConnections: Connection[] = [];

        agentEntries.forEach(([agentName, agentData]: [string, any]) => {
          // Parse MCP toolsets
          const toolsets: MCPToolset[] = [];

          if (agentData.toolsets) {
            agentData.toolsets.forEach((toolset: any) => {
              if (toolset.type === 'mcp') {
                toolsets.push({
                  type: 'mcp',
                  ref: toolset.ref,
                  command: toolset.command,
                  args: toolset.args,
                  tools: toolset.tools,
                  env: toolset.env,
                });
              }
            });
          }

          // Create agent configuration
          const agentConfig: AgentConfiguration = {
            model: agentData.model || 'gpt-4',
            description: agentData.description || '',
            instruction: agentData.instruction || '',
            toolsets,
          };

          // Create new agent node
          const agentNode: WorkflowNodeType = {
            id: `agent-${Date.now()}-${Math.random()}`,
            type: 'agent',
            name: agentName === 'root' ? 'Salesforce Agent' : agentName,
            icon: 'Bot',
            position: { x: xOffset, y: 150 },
            agentConfig,
            showSteps: true, // Show steps by default
          };

          // Parse workflow steps and extract tool functions from instructions
          const instructions = agentData.instruction || '';
          const workflowSteps: WorkflowStep[] = [];
          const toolFunctionMap = new Map<string, Set<string>>(); // stepId -> tool functions

          // Extract numbered steps
          const stepMatches = instructions.matchAll(/^\s*(\d+)\.\s+(.+?)(?=\n\s*\d+\.|$)/gms);
          const steps = Array.from(stepMatches);

          steps.forEach(([_, stepNumber, stepText], index) => {
            const stepId = `step-${Date.now()}-${index}`;

            // Extract tool function calls from step text (e.g., connect_salesforce(), search_salesforce_accounts())
            const toolCalls = stepText.match(/\b([a-z_]+\([^)]*\))/g) || [];
            const toolFunctions = new Set<string>();

            toolCalls.forEach(call => {
              const funcName = call.split('(')[0];
              toolFunctions.add(funcName);
            });

            toolFunctionMap.set(stepId, toolFunctions);

            workflowSteps.push({
              id: stepId,
              description: stepText.trim().split('\n')[0],
              toolIds: [], // Will be populated after creating tool nodes
              order: parseInt(stepNumber)
            });
          });

          // Store steps in agent node
          agentNode.steps = workflowSteps;
          newNodes.push(agentNode);

          // Create tool nodes for each unique tool function
          const allToolFunctions = new Set<string>();
          toolFunctionMap.forEach(funcs => funcs.forEach(f => allToolFunctions.add(f)));

          const toolNodeMap = new Map<string, string>(); // tool function name -> node ID
          let toolXOffset = xOffset + 300;
          let toolYOffset = 150;

          allToolFunctions.forEach(toolFunc => {
            const toolNode: WorkflowNodeType = {
              id: `tool-${Date.now()}-${Math.random()}`,
              type: 'tool',
              name: toolFunc,
              icon: 'Wrench',
              position: { x: toolXOffset, y: toolYOffset },
              toolFunction: toolFunc,
              parentAgentId: agentNode.id,
            };

            toolNodeMap.set(toolFunc, toolNode.id);
            newNodes.push(toolNode);
            toolYOffset += 100;
          });

          // Create step nodes and connect them in sequence: agent -> step1 -> step2 -> ...
          let stepYOffset = 300;
          let previousStepId = agentNode.id;

          workflowSteps.forEach((step, index) => {
            const stepNode: WorkflowNodeType = {
              id: step.id,
              type: 'step',
              name: `Step ${step.order}`,
              icon: 'Circle',
              position: { x: xOffset, y: stepYOffset },
              stepDescription: step.description,
              parentAgentId: agentNode.id,
            };

            newNodes.push(stepNode);

            // Connect to previous step (or agent for first step)
            newConnections.push({
              id: `conn-${Date.now()}-${Math.random()}`,
              sourceId: previousStepId,
              targetId: stepNode.id,
              connectionType: 'flow',
            });

            // Connect tools used in this step to the step node
            const toolFuncs = toolFunctionMap.get(step.id) || new Set();
            toolFuncs.forEach(toolFunc => {
              const toolNodeId = toolNodeMap.get(toolFunc);
              if (toolNodeId) {
                step.toolIds.push(toolNodeId);
                newConnections.push({
                  id: `conn-${Date.now()}-${Math.random()}`,
                  sourceId: stepNode.id,
                  targetId: toolNodeId,
                  connectionType: 'tool',
                });
              }
            });

            previousStepId = stepNode.id;
            stepYOffset += 120;
          });

          xOffset += 600; // Offset next agent group to the right
        });

        setNodes(prev => [...prev, ...newNodes]);
        setConnections(prev => [...prev, ...newConnections]);

        alert(`Successfully imported ${agentEntries.length} agent(s) from ${file.name}`);
      } catch (error) {
        console.error('Import error:', error);
        alert(`Failed to import agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    input.click();
  };

  const handleDeleteWorkflow = () => {
    if (window.confirm('Are you sure you want to delete this workflow? This will reset the canvas to its initial state.')) {
      // Reset to initial state
      const inputNode: WorkflowNodeType = {
        id: INPUT_NODE_ID,
        type: 'input',
        name: 'Input',
        icon: 'PlayCircle',
        position: { x: 50, y: 150 },
      };

      const outputNode: WorkflowNodeType = {
        id: OUTPUT_NODE_ID,
        type: 'output',
        name: 'Output',
        icon: 'CheckCircle',
        position: { x: 700, y: 150 },
      };

      const knowledgeNode: WorkflowNodeType = {
        id: KNOWLEDGE_NODE_ID,
        type: 'knowledge',
        name: 'Knowledge Base',
        icon: 'Database',
        position: { x: 50, y: 400 },
        knowledgeItems: [],
      };

      setNodes([inputNode, outputNode, knowledgeNode]);
      setConnections([]);
      setShowMoreMenu(false);
    }
  };

  const handleExportWorkflow = () => {
    const workflow = {
      nodes,
      connections,
      version: '1.0',
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMoreMenu(false);
  };

  const handleShareWorkflow = () => {
    // TODO: Implement share functionality
    alert('Share functionality coming soon!');
    setShowMoreMenu(false);
  };

  const handleAgentDropInZone = async (template: NodeTemplate) => {
    const newNode: WorkflowNodeType = {
      id: `node-${Date.now()}-${Math.random()}`,
      type: template.type,
      name: template.name,
      icon: template.icon,
      position: { x: 370, y: 120 },
      hasKnowledgeAccess: template.type === 'agent' ? true : undefined,
    };

    // Fetch agent configuration and create tool nodes
    try {
      const response = await fetch(`http://localhost:8080/api/agents/${template.name}`);
      if (response.ok) {
        const agentData = await response.json();
        const rootAgent = agentData.agents?.root || {};

        // Create tool nodes for each toolset
        const toolNodesToAdd: WorkflowNodeType[] = [];
        const connectionsToAdd: Connection[] = [];

        if (rootAgent.toolsets && Array.isArray(rootAgent.toolsets)) {
          // Store all toolsets on the agent node for display in card
          newNode.toolsets = rootAgent.toolsets;
          newNode.showTools = true; // Default to showing tools
          newNode.showConnectors = true; // Default to showing connectors

          // Helper function to get display name for built-in tools
          const getToolDisplayName = (tool: any): string => {
            if (tool.ref) return tool.ref;
            const builtInToolNames: Record<string, string> = {
              'think': 'Think',
              'todo': 'Todo List',
              'memory': 'Memory',
              'code': 'Code Execution',
              'browser': 'Browser',
              'filesystem': 'File System',
            };
            return builtInToolNames[tool.type] || tool.type || 'Tool';
          };

          // Helper function to get icon for toolset type
          const getToolIcon = (toolset: any): string => {
            if (toolset.type === 'mcp') return 'Cloud';
            if (toolset.ref) return 'Wrench';
            // Built-in tools
            const builtInIcons: Record<string, string> = {
              'think': 'Lightbulb',
              'todo': 'CheckSquare',
              'memory': 'Brain',
              'code': 'Code',
              'browser': 'Globe',
              'filesystem': 'FolderOpen',
            };
            return builtInIcons[toolset.type] || 'Wrench';
          };

          // Create nodes for ALL toolsets (tools with ref, built-in tools, and MCP connectors)
          const columns = 2;
          const toolSpacingX = 250; // Horizontal spacing
          const toolSpacingY = 140; // Vertical spacing
          const startOffsetY = 180; // Start below the agent node

          rootAgent.toolsets.forEach((toolset: any, index: number) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            // Determine toolset type
            const toolsetType: 'ref' | 'builtin' | 'mcp' =
              toolset.type === 'mcp' ? 'mcp' :
              toolset.ref ? 'ref' : 'builtin';

            // Get display name
            const displayName = toolset.type === 'mcp'
              ? (toolset.command || 'MCP Connector')
              : getToolDisplayName(toolset);

            // Get functions for this tool from toolDefinitions
            const toolFunctions = getToolFunctions(displayName);

            const toolNode: WorkflowNodeType = {
              id: `node-${Date.now()}-${Math.random()}-${index}`,
              type: 'tool',
              name: displayName,
              icon: getToolIcon(toolset),
              position: {
                x: newNode.position.x + (col * toolSpacingX) - 110, // Center below agent
                y: newNode.position.y + startOffsetY + (row * toolSpacingY),
              },
              parentAgentId: newNode.id,
              toolsetType: toolsetType,
              mcpConfig: toolset.type === 'mcp' ? {
                type: 'mcp',
                command: toolset.command,
                args: toolset.args || [],
              } : undefined,
              data: toolFunctions.length > 0 ? {
                functions: toolFunctions.map(f => f.name),
              } : undefined,
            };

            toolNodesToAdd.push(toolNode);

            // Create connection from tool to agent
            const connection: Connection = {
              id: `conn-${Date.now()}-${index}`,
              sourceId: toolNode.id,
              targetId: newNode.id,
              connectionType: 'tool',
            };

            connectionsToAdd.push(connection);
          });
        }

        // Add agent and all tool nodes together
        setNodes(prev => [...prev, newNode, ...toolNodesToAdd]);

        // Add tool connections
        if (connectionsToAdd.length > 0) {
          setConnections(prev => [...prev, ...connectionsToAdd]);
        }
      } else {
        // If fetch fails, just add the agent node
        setNodes(prev => [...prev, newNode]);
      }
    } catch (error) {
      console.error('Failed to fetch agent config on drop zone:', error);
      // If fetch fails, just add the agent node
      setNodes(prev => [...prev, newNode]);
    }

    // Auto-connect Input -> Agent -> Output
    const inputConnection: Connection = {
      id: `conn-${Date.now()}-1`,
      sourceId: INPUT_NODE_ID,
      targetId: newNode.id,
      connectionType: 'flow',
    };

    const outputConnection: Connection = {
      id: `conn-${Date.now()}-2`,
      sourceId: newNode.id,
      targetId: OUTPUT_NODE_ID,
      connectionType: 'flow',
    };

    setConnections(prev => [...prev, inputConnection, outputConnection]);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => {
    setZoom(1);
  };

  const getConnectionPath = (sourceId: string, targetId: string | null, endX?: number, endY?: number) => {
    const sourceNode = nodes.find(n => n.id === sourceId);

    if (!sourceNode) return '';

    const nodeWidth = 200;
    const nodeHeight = 120;

    // Connection point circle is 3.5px radius, positioned at -8px (which is the center)
    // So we need to calculate from the node edge + the offset

    let startX = 0;
    let startY = 0;

    // Check if this connection is from a parent agent's section to a child node
    const targetNode = targetId ? nodes.find(n => n.id === targetId) : null;
    const isToolConnection = sourceNode.type === 'tool' && targetNode?.type === 'agent';
    const isSubAgentConnection = sourceNode.type === 'agent' && sourceNode.parentAgentId === targetId;

    // For connections from parent agent sections, find the section circle position
    if (targetNode && (isToolConnection || isSubAgentConnection)) {
      // Start from parent's section circle on the left
      let sectionOffsetY = 0;

      if (isSubAgentConnection) {
        // Sub-agents section (first section)
        sectionOffsetY = 20;
      } else if (isToolConnection) {
        // Calculate section offset based on tool type
        const isMcpTool = sourceNode.toolsetType === 'mcp' || sourceNode.mcpConfig;

        if (isMcpTool) {
          // MCP Connectors section
          const hasSubAgents = targetNode.subAgents && targetNode.subAgents.length > 0;
          const agentTools = nodes.filter(n =>
            n.type === 'tool' &&
            n.parentAgentId === targetId &&
            !(n.toolsetType === 'mcp' || n.mcpConfig)
          );
          const hasRegularTools = agentTools.length > 0;

          if (hasSubAgents && hasRegularTools) {
            sectionOffsetY = 180; // Below sub-agents and tools sections
          } else if (hasSubAgents || hasRegularTools) {
            sectionOffsetY = 100; // Below one section
          } else {
            sectionOffsetY = 20; // First section
          }
        } else {
          // Regular tools section
          const hasSubAgents = targetNode.subAgents && targetNode.subAgents.length > 0;

          if (hasSubAgents) {
            sectionOffsetY = 100; // Below sub-agents section
          } else {
            sectionOffsetY = 20; // First section
          }
        }
      }

      startX = targetNode.position.x - 24; // Section circle on left
      startY = targetNode.position.y + sectionOffsetY;
    } else {
      // Regular connection start points
      // Determine start position based on source node type
      if (sourceNode.type === 'input' || sourceNode.type === 'agent' || sourceNode.type === 'step') {
        // Output from bottom for agent/step vertical flow
        if (sourceNode.type === 'agent' || sourceNode.type === 'step') {
          startX = sourceNode.position.x + (nodeWidth / 2);
          startY = sourceNode.position.y + nodeHeight + 8;
        } else {
          // Input outputs from right side
          startX = sourceNode.position.x + nodeWidth + 8;
          startY = sourceNode.position.y + (nodeHeight / 2);
        }
      } else if (sourceNode.type === 'tool') {
        // Tool outputs from right side
        startX = sourceNode.position.x + nodeWidth + 8;
        startY = sourceNode.position.y + (nodeHeight / 2);
      }
    }

    let finalEndX = endX || 0;
    let finalEndY = endY || 0;

    if (targetId) {
      if (!targetNode) return '';

      const sourceIsToolToAgent = sourceNode.type === 'tool' && targetNode.type === 'agent';
      const sourceIsSubAgentToAgent = sourceNode.type === 'agent' && sourceNode.parentAgentId === targetId;
      const sourceIsAgentOrStepToStep = (sourceNode.type === 'agent' || sourceNode.type === 'step') && targetNode.type === 'step';

      if (sourceIsToolToAgent) {
        // For tool to agent connections, end at tool's left circle
        finalEndX = sourceNode.position.x - 8; // Left side circle
        finalEndY = sourceNode.position.y + (nodeHeight / 2);
      } else if (sourceIsSubAgentToAgent) {
        // For sub-agent to parent agent connections, end at sub-agent's left circle
        finalEndX = sourceNode.position.x - 8; // Left side circle
        finalEndY = sourceNode.position.y + (nodeHeight / 2);
      } else if (sourceIsAgentOrStepToStep) {
        // For agent/step to step connections (vertical flow), connect bottom to top
        finalEndX = targetNode.position.x + (nodeWidth / 2);
        finalEndY = targetNode.position.y - 8;
      } else {
        // Regular left-right flow connections
        // Input from left side: node.x - 8px (the -left-2 offset)
        finalEndX = targetNode.position.x - 8;
        finalEndY = targetNode.position.y + (nodeHeight / 2);
      }
    }

    const midX = (startX + finalEndX) / 2;
    const midY = (startY + finalEndY) / 2;

    // Use different curve for tool connections (vertical approach)
    const sourceNode2 = nodes.find(n => n.id === sourceId);
    const targetNode2 = targetId ? nodes.find(n => n.id === targetId) : null;
    const isToolConnection = sourceNode2?.type === 'tool' && targetNode2?.type === 'agent';
    const isSubAgentConnection = sourceNode2?.type === 'agent' && sourceNode2.parentAgentId === targetId;
    const isVerticalStepFlow = (sourceNode2?.type === 'agent' || sourceNode2?.type === 'step') && targetNode2?.type === 'step';

    if (isToolConnection || isSubAgentConnection) {
      // Smooth curve for tool and sub-agent connections
      return `M ${startX} ${startY} C ${startX + 50} ${startY}, ${finalEndX - 50} ${finalEndY}, ${finalEndX} ${finalEndY}`;
    }

    if (isVerticalStepFlow) {
      // Vertical curve for agent/step to step connections
      return `M ${startX} ${startY} C ${startX} ${midY}, ${finalEndX} ${midY}, ${finalEndX} ${finalEndY}`;
    }

    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${finalEndY}, ${finalEndX} ${finalEndY}`;
  };

  // Get connection path for placeholder connections
  const getPlaceholderConnectionPath = (startX: number, startY: number, endX: number, endY: number) => {
    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  };

  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 120;

  // Get connected tools for each agent
  const getAgentTools = (agentId: string) => {
    return connections
      .filter(conn => conn.targetId === agentId && conn.connectionType === 'tool')
      .map(conn => nodes.find(n => n.id === conn.sourceId))
      .filter(Boolean) as WorkflowNodeType[];
  };

  const getConnectedAgents = (toolId: string) => {
    return connections
      .filter(conn => conn.sourceId === toolId && conn.connectionType === 'tool')
      .map(conn => nodes.find(n => n.id === conn.targetId))
      .filter(Boolean) as WorkflowNodeType[];
  };

  const handleOpenConfig = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // If it's a tool node, show the config panel
      if (node.type === 'tool') {
        setSelectedNodeForConfig(node);
        setConfigDialogOpen(true);
        return;
      }

      // If it's an agent node, fetch its configuration from the API
      if (node.type === 'agent') {
        try {
          console.log('Fetching agent config for:', node.name);
          const response = await fetch(`http://localhost:8080/api/agents/${node.name}`);
          console.log('Agent config response status:', response.status);

          if (response.ok) {
            const agentData = await response.json();
            console.log('Agent config data:', agentData);

            // Extract the root agent configuration
            const rootAgent = agentData.agents?.root || {};

            // Parse the agent configuration
            const toolsets: MCPToolset[] = [];
            if (rootAgent.toolsets) {
              rootAgent.toolsets.forEach((toolset: any) => {
                if (toolset.type === 'mcp') {
                  toolsets.push({
                    type: 'mcp',
                    ref: toolset.ref,
                    command: toolset.command,
                    args: toolset.args,
                    tools: toolset.tools,
                    env: toolset.env,
                  });
                }
              });
            }

            // Update node with fetched configuration
            const updatedNode = {
              ...node,
              agentConfig: {
                model: rootAgent.model || '',
                description: rootAgent.description || '',
                instruction: rootAgent.instruction || '',
                toolsets,
              }
            };

            console.log('Updated node with config:', updatedNode);
            setSelectedNodeForConfig(updatedNode);
            setConfigDialogOpen(true);
          } else {
            console.error('Failed to fetch agent config, status:', response.status);
            // Fallback to existing node data
            setSelectedNodeForConfig(node);
            setConfigDialogOpen(true);
          }
        } catch (error) {
          console.error('Failed to fetch agent config:', error);
          // Fallback to existing node data
          setSelectedNodeForConfig(node);
          setConfigDialogOpen(true);
        }
      } else if (node.type === 'output') {
        setSelectedNodeForConfig(node);
        setOutputPanelOpen(true);
      } else {
        setSelectedNodeForConfig(node);
        setConfigDialogOpen(true);
      }
    }
  };

  const handleSaveConfig = (nodeId: string, config: any) => {
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;

      if (node.type === 'agent') {
        // Update both agentConfig and name if provided
        const updates: any = { agentConfig: config };
        if (config.name) {
          updates.name = config.name;
        }
        return { ...node, ...updates };
      } else if (node.type === 'tool') {
        return { ...node, data: config };
      }
      return node;
    }));
  };

  const generateCagentYaml = (agentNode: WorkflowNodeType): string => {
    const config = agentNode.agentConfig;
    if (!config) {
      return 'version: "2"\n\nagents:\n  root:\n    model: openai/gpt-4o-mini\n    description: A helpful AI assistant\n    instruction: |\n      You are a helpful assistant.';
    }

    let yaml = 'version: "2"\n\nagents:\n  root:\n';
    yaml += `    model: ${config.model}\n`;
    yaml += `    description: ${config.description}\n`;
    yaml += `    instruction: |\n`;
    config.instruction.split('\n').forEach(line => {
      yaml += `      ${line}\n`;
    });

    if (config.toolsets && config.toolsets.length > 0) {
      yaml += `    toolsets:\n`;
      config.toolsets.forEach(toolset => {
        yaml += `      - type: ${toolset.type}\n`;
        if (toolset.ref) yaml += `        ref: ${toolset.ref}\n`;
        if (toolset.command) yaml += `        command: ${toolset.command}\n`;
        if (toolset.args && toolset.args.length > 0) {
          yaml += `        args: [${toolset.args.map(a => `"${a}"`).join(', ')}]\n`;
        }
        if (toolset.tools && toolset.tools.length > 0) {
          yaml += `        tools: [${toolset.tools.map(t => `"${t}"`).join(', ')}]\n`;
        }
        if (toolset.env && toolset.env.length > 0) {
          yaml += `        env:\n`;
          toolset.env.forEach(e => {
            yaml += `          - "${e}"\n`;
          });
        }
      });
    }

    return yaml;
  };

  const handleRunWorkflow = async () => {
    if (isExecuting) return;

    setIsExecuting(true);

    try {
      // Find the connected agent nodes in the workflow
      const inputNode = nodes.find(n => n.id === INPUT_NODE_ID);
      const outputNode = nodes.find(n => n.id === OUTPUT_NODE_ID);

      if (!inputNode || !outputNode) {
        alert('Input or Output node not found');
        return;
      }

      // Use first agent in the workflow
      const agentNodes = nodes.filter(n => n.type === 'agent');

      if (agentNodes.length === 0) {
        alert('No agent in the workflow. Drag an agent from the sidebar to the canvas.');
        setIsExecuting(false);
        return;
      }

      const activeAgent = agentNodes[0];
      const activeAgentName = activeAgent.name;

      console.log('Using agent:', activeAgentName);

      // Get the input prompt from the Input node
      const inputPrompt = inputNode.prompt || "Execute the workflow task";

      if (!inputPrompt.trim()) {
        alert('Please enter a prompt in the Input node before running the workflow.');
        setIsExecuting(false);
        return;
      }

      console.log('Calling cagent API...');

      const startTime = Date.now();

      try {
        // cagent API endpoint (assumes it's already running on port 8080)
        const apiPort = 8080;
        const apiUrl = `http://localhost:${apiPort}`;

        console.log('Making request to:', `${apiUrl}/api/agents/${activeAgentName}/chat`);

        // Make API request to cagent using the agent-specific endpoint
        const response = await fetch(`${apiUrl}/api/agents/${activeAgentName}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: inputPrompt,
              },
            ],
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const executionTime = Date.now() - startTime;

        console.log('API Response:', result);

        // Extract response from API result
        const agentResponse = result.choices?.[0]?.message?.content || 'No response from agent';

        // Check for generated files in the response (if cagent returns them)
        const generatedFiles: Array<{path: string; name: string; size: number; createdAt: Date}> = [];

        // Update output node with results
        setNodes(prev => prev.map(node => {
          if (node.id === OUTPUT_NODE_ID) {
            return {
              ...node,
              output: {
                response: agentResponse,
                generatedFiles,
                executionTime,
                timestamp: new Date(),
              },
            };
          }
          return node;
        }));

        // Auto-open output panel
        setSelectedNodeForConfig(nodes.find(n => n.id === OUTPUT_NODE_ID) || null);
        setOutputPanelOpen(true);

      } catch (apiError) {
        console.error('cagent API error:', apiError);
        alert(`Failed to connect to cagent API: ${apiError instanceof Error ? apiError.message : 'Unknown error'}\n\nMake sure cagent API is running on http://localhost:8080`);

        const executionTime = Date.now() - startTime;
        const emptyFiles: Array<{path: string; name: string; size: number; createdAt: Date}> = [];

        setNodes(prev => prev.map(node => {
          if (node.id === OUTPUT_NODE_ID) {
            return {
              ...node,
              output: {
                response: `Failed to connect to cagent API\n\nError: ${apiError instanceof Error ? apiError.message : 'Unknown error'}\n\nMake sure cagent API is running:\ncagent api <agent.yaml> --listen :8080`,
                generatedFiles: emptyFiles,
                executionTime,
                timestamp: new Date(),
              },
            };
          }
          return node;
        }));

        setSelectedNodeForConfig(nodes.find(n => n.id === OUTPUT_NODE_ID) || null);
        setOutputPanelOpen(true);
      }

    } catch (error) {
      console.error('Workflow execution error:', error);
      alert(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <ConfigPanel
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        node={selectedNodeForConfig}
        onSave={handleSaveConfig}
        connectedTools={selectedNodeForConfig?.type === 'agent' ? getAgentTools(selectedNodeForConfig.id) : []}
        connectedAgents={selectedNodeForConfig?.type === 'tool' ? getConnectedAgents(selectedNodeForConfig.id) : []}
      />

      <OutputPanel
        open={outputPanelOpen}
        onOpenChange={setOutputPanelOpen}
        output={selectedNodeForConfig?.type === 'output' ? selectedNodeForConfig.output || null : null}
      />

      <div ref={setRefs} className="flex-1 relative overflow-hidden bg-grid-pattern">
        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          onClick={handleRunWorkflow}
          disabled={isExecuting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isExecuting ? (
            <>
              <LucideIcons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <LucideIcons.Play className="w-4 h-4 mr-2" />
              Run
            </>
          )}
        </Button>

        {/* More Menu */}
        <div className="relative" ref={moreMenuRef}>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <LucideIcons.MoreVertical className="w-4 h-4" />
          </Button>

          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={handleImportAgent}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <LucideIcons.Upload className="w-4 h-4" />
                Import Agent YAML
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={handleExportWorkflow}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <LucideIcons.Download className="w-4 h-4" />
                Export Workflow
              </button>
              <button
                onClick={handleShareWorkflow}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <LucideIcons.Share2 className="w-4 h-4" />
                Share Workflow
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={handleDeleteWorkflow}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <LucideIcons.Trash2 className="w-4 h-4" />
                Delete Workflow
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls - Top Right */}
      <div className="absolute top-16 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <LucideIcons.ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetView}>
            <LucideIcons.Maximize className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <LucideIcons.ZoomOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottom Right - Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <h4 className="text-xs mb-2 text-muted-foreground">Connection Types</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-slate-400"></div>
              <span className="text-xs">Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-green-500" style={{ backgroundImage: 'repeating-linear-gradient(to right, #10b981 0, #10b981 8px, transparent 8px, transparent 12px)' }}></div>
              <span className="text-xs">Tool</span>
            </div>
          </div>
        </div>
      </div>



      <div
        ref={canvasRef}
        className={`w-full h-full relative ${isOver ? 'bg-blue-50' : ''} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: 'top left'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={(e) => {
          handleCanvasMouseMove(e);
          handleConnectionDrag(e);
        }}
        onMouseUp={(e) => {
          handleCanvasMouseUp();
          handleConnectionCancel(e);
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
            </marker>
            <marker
              id="arrowhead-tool"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
            </marker>
            <marker
              id="arrowhead-placeholder"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#cbd5e1" />
            </marker>
          </defs>

          {/* Placeholder connections when drop zone is visible */}
          {showDropZone && (
            <>
              {/* Input to Drop Zone */}
              <path
                d={getPlaceholderConnectionPath(
                  50 + NODE_WIDTH + 8,  // Input node position + width + 8px offset
                  150 + NODE_HEIGHT/2,  // Input node position + half height
                  370 - 8,              // Drop zone position - 8px offset
                  120 + NODE_HEIGHT/2   // Drop zone position + half height
                )}
                stroke="#cbd5e1"
                strokeWidth="2"
                fill="none"
                strokeDasharray="8,4"
                opacity="0.6"
              />
              {/* Drop Zone to Output */}
              <path
                d={getPlaceholderConnectionPath(
                  370 + NODE_WIDTH + 8, // Drop zone position + width + 8px offset
                  120 + NODE_HEIGHT/2,  // Drop zone position + half height
                  700 - 8,              // Output node position - 8px offset
                  150 + NODE_HEIGHT/2   // Output node position + half height
                )}
                stroke="#cbd5e1"
                strokeWidth="2"
                fill="none"
                strokeDasharray="8,4"
                opacity="0.6"
              />
            </>
          )}
          {connections.map(conn => {
            const isToolConnection = conn.connectionType === 'tool';
            const isHovered = hoveredConnection === conn.id;
            return (
              <g key={conn.id}>
                <path
                  d={getConnectionPath(conn.sourceId, conn.targetId)}
                  stroke={isHovered ? '#3b82f6' : (isToolConnection ? '#10b981' : '#94a3b8')}
                  strokeWidth={isHovered ? '3' : (isToolConnection ? '3' : '2')}
                  fill="none"
                  className="transition-all"
                  strokeDasharray={isToolConnection ? '8,4' : 'none'}
                />
                <path
                  d={getConnectionPath(conn.sourceId, conn.targetId)}
                  stroke="transparent"
                  strokeWidth="12"
                  fill="none"
                  className="cursor-pointer pointer-events-auto hover:stroke-red-200"
                  onMouseEnter={() => !isToolConnection && setHoveredConnection(conn.id)}
                  onMouseLeave={() => setHoveredConnection(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this connection?')) {
                      handleDeleteConnection(conn.id);
                    }
                  }}
                />
              </g>
            );
          })}
          {tempConnection && (
            <path
              d={getConnectionPath(tempConnection.from, null, tempConnection.x, tempConnection.y)}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
          )}
        </svg>

        <div className="relative" style={{ zIndex: 2 }}>
          {/* Agent drop zone placeholder */}
          {showDropZone && (
            <AgentDropZone
              position={{ x: 370, y: 120 }}
              onDrop={handleAgentDropInZone}
            />
          )}

          {nodes.filter(node => {
            // Filter out step nodes if their parent agent has showSteps = false
            if (node.type === 'step') {
              if (node.parentAgentId) {
                const parentAgent = nodes.find(n => n.id === node.parentAgentId);
                return parentAgent?.showSteps !== false;
              }
            }

            // Filter out sub-agent nodes if their parent agent has showSubAgents = false
            if (node.type === 'agent' && node.parentAgentId) {
              const parentAgent = nodes.find(n => n.id === node.parentAgentId);
              if (parentAgent) {
                return parentAgent.showSubAgents !== false;
              }
            }

            // Filter out tool nodes based on their toolsetType and parent agent visibility settings
            if (node.type === 'tool' && node.parentAgentId) {
              const parentAgent = nodes.find(n => n.id === node.parentAgentId);
              if (parentAgent) {
                // For tools belonging to sub-agents, check if the sub-agent is visible first
                const agentNode = nodes.find(n => n.id === node.parentAgentId);
                if (agentNode?.type === 'agent' && agentNode.parentAgentId) {
                  const grandParentAgent = nodes.find(n => n.id === agentNode.parentAgentId);
                  if (grandParentAgent?.showSubAgents === false) {
                    return false;
                  }
                }

                // MCP connector nodes - check showConnectors
                if (node.toolsetType === 'mcp') {
                  return parentAgent.showConnectors !== false;
                }
                // Built-in and ref tools - check showTools
                if (node.toolsetType === 'builtin' || node.toolsetType === 'ref') {
                  return parentAgent.showTools !== false;
                }
              }
            }

            return true;
          }).map(node => (
            node.type === 'knowledge' ? (
              <KnowledgeNode
                key={node.id}
                node={node}
                onItemAdd={handleKnowledgeItemAdd}
                onItemRemove={handleKnowledgeItemRemove}
                onPositionChange={(nodeId, x, y) => {
                  setNodes(prev => prev.map(n =>
                    n.id === nodeId ? { ...n, position: { x, y } } : n
                  ));
                }}
              />
            ) : (
              <WorkflowNode
                key={node.id}
                node={node}
                onMove={handleNodeMove}
                onDelete={handleNodeDelete}
                onConnectionStart={handleConnectionStart}
                onConnectionEnd={handleConnectionEnd}
                onConnectionDrop={handleConnectionDrop}
                onConfigure={handleOpenConfig}
                isConnecting={connectingFrom !== null && connectingFrom !== node.id}
                isDraggingConnection={tempConnection !== null}
                connectedTools={node.type === 'agent' ? getAgentTools(node.id) : []}
                connectedAgents={node.type === 'tool' ? getConnectedAgents(node.id) : []}
                isDefaultNode={node.id === INPUT_NODE_ID || node.id === OUTPUT_NODE_ID}
                onToggleKnowledge={handleToggleKnowledge}
                onToggleSteps={handleToggleSteps}
                onNodeUpdate={handleNodeUpdate}
                knowledgeItemCount={getKnowledgeItemCount()}
                onPromptChange={handlePromptChange}
                onToolDrop={handleToolDropOnAgent}
              />
            )
          ))}
        </div>
      </div>

      {/* Stats Panel */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 flex gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Nodes: </span>
          <span>{nodes.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Connections: </span>
          <span>{connections.length}</span>
        </div>
      </div>
    </div>

    {/* Tool Config Panel */}
    {selectedToolForConfig && (
      <ToolConfigPanel
        isOpen={toolConfigDialogOpen}
        onClose={() => {
          setToolConfigDialogOpen(false);
          setSelectedToolForConfig(null);
        }}
        node={selectedToolForConfig}
        onSave={handleSaveConfig}
      />
    )}
    </>
  );
});
