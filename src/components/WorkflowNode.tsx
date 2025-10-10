import { useRef, useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { Button } from './ui/button';
import * as LucideIcons from 'lucide-react';
import { WorkflowNode as WorkflowNodeType, NodeTemplate } from '../types/workflow';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (nodeId: string, e?: React.MouseEvent) => void;
  isConnecting: boolean;
  onConnectionEnd: (nodeId: string) => void;
  onConnectionDrop: (nodeId: string) => void;
  onConfigure: (nodeId: string) => void;
  isDraggingConnection: boolean;
  connectedTools?: WorkflowNodeType[];
  connectedAgents?: WorkflowNodeType[];
  isDefaultNode?: boolean;
  onToggleKnowledge?: (nodeId: string) => void;
  onToggleSteps?: (nodeId: string) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<WorkflowNodeType>) => void;
  knowledgeItemCount?: number;
  onPromptChange?: (nodeId: string, prompt: string) => void;
  onToolDrop?: (agentId: string, tool: NodeTemplate) => void;
}

export function WorkflowNode({
  node,
  onMove,
  onDelete,
  onConnectionStart,
  isConnecting,
  onConnectionEnd,
  onConnectionDrop,
  onConfigure,
  isDraggingConnection,
  connectedTools = [],
  connectedAgents = [],
  isDefaultNode = false,
  onToggleKnowledge,
  onToggleSteps,
  onNodeUpdate,
  knowledgeItemCount = 0,
  onPromptChange,
  onToolDrop
}: WorkflowNodeProps) {
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const hasDragged = useRef(false);

  // Drop zone for tools and agents on agent nodes
  const [{ isOver: isToolOver, draggedItem }, dropRef] = useDrop(() => ({
    accept: 'node',
    canDrop: (item: NodeTemplate) => {
      // Allow dropping tools or agents on agent nodes
      return node.type === 'agent' && (item.type === 'tool' || item.type === 'agent');
    },
    drop: (item: NodeTemplate) => {
      if (onToolDrop && node.type === 'agent') {
        onToolDrop(node.id, item);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
      draggedItem: monitor.getItem() as NodeTemplate | null,
    }),
  }), [node.type, node.id, onToolDrop]);

  // Check if the dragged item is an MCP connector or agent
  const isDraggingConnector = isToolOver && draggedItem?.mcpConfig;
  const isDraggingAgent = isToolOver && draggedItem?.type === 'agent';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingNode) {
        const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
        const deltaY = Math.abs(e.clientY - dragStartPos.current.y);

        if (deltaX > 5 || deltaY > 5) {
          hasDragged.current = true;
        }

        if (hasDragged.current) {
          const newX = dragStartPos.current.nodeX + (e.clientX - dragStartPos.current.x);
          const newY = dragStartPos.current.nodeY + (e.clientY - dragStartPos.current.y);
          onMove(node.id, newX, newY);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingNode(false);
      hasDragged.current = false;
    };

    if (isDraggingNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingNode, node.id, onMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDraggingNode(true);
    hasDragged.current = false;
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: node.position.x,
      nodeY: node.position.y,
    };
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'input': return 'bg-emerald-500';
      case 'output': return 'bg-pink-500';
      case 'agent': return 'bg-blue-500';
      case 'tool':
        // MCP connectors get purple header
        if (node.toolsetType === 'mcp' || node.mcpConfig) {
          return 'bg-purple-500';
        }
        return 'bg-green-500';
      case 'knowledge': return 'bg-black';
      case 'step': return 'bg-purple-500';
      case 'condition': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const Icon = LucideIcons[node.icon as keyof typeof LucideIcons] as any;

  const handleConnectionClick = () => {
    if (isConnecting) {
      onConnectionEnd(node.id);
    } else {
      onConnectionStart(node.id);
    }
  };

  const handleOutputMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(node.id, e);
  };

  const handleInputMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingConnection) {
      onConnectionDrop(node.id);
    }
  };

  // Combine refs for drop zone
  const setRefs = (element: HTMLDivElement | null) => {
    nodeRef.current = element;
    if (node.type === 'agent') {
      dropRef(element);
    }
  };

  return (
    <div
      ref={setRefs}
      className="absolute"
      style={{
        left: node.position.x,
        top: node.position.y,
        cursor: isDraggingNode ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={`w-[230px] bg-white rounded-lg shadow-md border ${
        isDraggingAgent ? 'border-blue-500 border-2 shadow-blue-200' :
        isDraggingConnector ? 'border-purple-500 border-2 shadow-purple-200' :
        isToolOver ? 'border-green-500 border-2 shadow-green-200' : 'border-gray-200'
      } ${isDraggingNode ? 'shadow-xl' : ''} transition-all`}>
        {/* Header */}
        <div className={`${getNodeColor()} px-3 py-2 rounded-t-lg flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-white" />}
            <span className="text-sm font-medium text-white">{node.name}</span>
            {node.type === 'agent' && node.parentAgentId && (
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded" title="Sub-agent">
                <LucideIcons.UserCog className="w-3 h-3" />
              </span>
            )}
          </div>
          {!isDefaultNode && (
            <button
              className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
            >
              <LucideIcons.X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-3 space-y-2">
          {/* Input Prompt */}
          {node.type === 'input' && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Prompt</div>
              <textarea
                value={node.prompt || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  onPromptChange?.(node.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Enter your prompt here..."
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={5}
                style={{ minHeight: '60px', maxHeight: '100px' }}
              />
            </div>
          )}

          {/* Step Description */}
          {node.type === 'step' && node.stepDescription && (
            <div>
              <div className="text-xs text-gray-700 leading-relaxed">
                {node.stepDescription}
              </div>
            </div>
          )}

          {/* Condition Description */}
          {node.type === 'condition' && node.conditionDescription && (
            <div>
              <div className="text-xs text-amber-700 leading-relaxed font-medium">
                {node.conditionDescription}
              </div>
            </div>
          )}

          {/* Knowledge Access for Agents */}
          {node.type === 'agent' && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                Knowledge Base
              </div>
              <button
                className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded transition-colors ${
                  node.hasKnowledgeAccess !== false
                    ? 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100'
                    : 'bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleKnowledge?.(node.id);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <LucideIcons.Database className="w-3 h-3" />
                  <span>
                    {node.hasKnowledgeAccess !== false ? 'Connected' : 'Isolated'}
                  </span>
                </div>
                {node.hasKnowledgeAccess !== false && knowledgeItemCount > 0 && (
                  <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">
                    {knowledgeItemCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Workflow Steps Toggle for Agents */}
          {node.type === 'agent' && node.steps && node.steps.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                Workflow Steps
              </div>
              <button
                className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded transition-colors ${
                  node.showSteps !== false
                    ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSteps?.(node.id);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <LucideIcons.ListOrdered className="w-3 h-3" />
                  <span>
                    {node.showSteps !== false ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">
                  {node.steps.length}
                </span>
              </button>
            </div>
          )}

          {/* Sub-Agents for Agents */}
          {node.type === 'agent' && node.subAgents && node.subAgents.length > 0 && (
            <div className="relative">
              {/* Connection point on the left */}
              <div
                className="absolute -left-[24px] top-3 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-full cursor-pointer z-10 transition-all hover:scale-110"
                onMouseDown={handleOutputMouseDown}
                title="Connect sub-agents"
              />
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Sub-Agents ({node.subAgents.length})
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeUpdate?.(node.id, { showSubAgents: !node.showSubAgents });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={node.showSubAgents !== false ? 'Hide sub-agent nodes' : 'Show sub-agent nodes'}
                >
                  {node.showSubAgents !== false ? (
                    <LucideIcons.EyeOff className="w-3 h-3" />
                  ) : (
                    <LucideIcons.Eye className="w-3 h-3" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <LucideIcons.Users className="w-3 h-3" />
                  {node.subAgents.length} agent{node.subAgents.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Connected Tools for Agents */}
          {node.type === 'agent' && node.toolsets && node.toolsets.length > 0 && (() => {
            // Separate into three categories:
            // 1. Regular tools with 'ref' (actual tool references)
            // 2. Built-in tools without 'ref' (think, todo, etc)
            // 3. MCP connectors (type: 'mcp')
            const toolsWithRef = node.toolsets.filter((t: any) => t.ref && t.type !== 'mcp');
            const builtInTools = node.toolsets.filter((t: any) => !t.ref && t.type !== 'mcp');
            const mcpConnectors = node.toolsets.filter((t: any) => t.type === 'mcp');

            const regularTools = [...toolsWithRef, ...builtInTools];

            // Helper function to get display name for tools
            const getToolDisplayName = (tool: any): string => {
              if (tool.ref) return tool.ref;

              // Built-in tools with friendly names
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

            return (
              <div className="space-y-2">
                {regularTools.length > 0 && (
                  <div className="relative">
                    {/* Connection point on the left */}
                    <div
                      className="absolute -left-[24px] top-3 w-3.5 h-3.5 bg-white border-2 border-green-500 rounded-full cursor-pointer z-10 transition-all hover:scale-110"
                      onMouseDown={handleOutputMouseDown}
                      title="Connect tools"
                    />
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                        Tools ({regularTools.length})
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNodeUpdate?.(node.id, { showTools: !node.showTools });
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={node.showTools ? 'Hide tool nodes' : 'Show tool nodes'}
                      >
                        {node.showTools ? (
                          <LucideIcons.EyeOff className="w-3 h-3" />
                        ) : (
                          <LucideIcons.Eye className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {regularTools.slice(0, 2).map((tool: any, idx: number) => (
                        <span key={idx} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                          {getToolDisplayName(tool)}
                        </span>
                      ))}
                      {regularTools.length > 2 && (
                        <span
                          className="text-[10px] text-gray-500 cursor-help relative group"
                          title={regularTools.slice(2).map(getToolDisplayName).join(', ')}
                        >
                          +{regularTools.length - 2}
                          <span className="invisible group-hover:visible absolute bottom-full left-0 mb-1 w-max max-w-xs bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg z-50">
                            {regularTools.slice(2).map(getToolDisplayName).join(', ')}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {mcpConnectors.length > 0 && (
                  <div className="relative">
                    {/* Connection point on the left */}
                    <div
                      className="absolute -left-[24px] top-3 w-3.5 h-3.5 bg-white border-2 border-purple-500 rounded-full cursor-pointer z-10 transition-all hover:scale-110"
                      onMouseDown={handleOutputMouseDown}
                      title="Connect MCP connectors"
                    />
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                        MCP Connectors ({mcpConnectors.length})
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNodeUpdate?.(node.id, { showConnectors: !node.showConnectors });
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={node.showConnectors ? 'Hide connector nodes' : 'Show connector nodes'}
                      >
                        {node.showConnectors ? (
                          <LucideIcons.EyeOff className="w-3 h-3" />
                        ) : (
                          <LucideIcons.Eye className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {mcpConnectors.slice(0, 2).map((tool: any, idx: number) => (
                        <span key={idx} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                          {tool.name || tool.command || 'MCP'}
                        </span>
                      ))}
                      {mcpConnectors.length > 2 && (
                        <span
                          className="text-[10px] text-gray-500 cursor-help relative group"
                          title={mcpConnectors.slice(2).map((t: any) => t.name || t.command || 'MCP').join(', ')}
                        >
                          +{mcpConnectors.length - 2}
                          <span className="invisible group-hover:visible absolute bottom-full left-0 mb-1 w-max max-w-xs bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg z-50">
                            {mcpConnectors.slice(2).map((t: any) => t.name || t.command || 'MCP').join(', ')}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tool Configuration */}
          {node.type === 'tool' && (
            <div>
              {node.data?.scope && (
                <div className="text-[10px] text-gray-600 line-clamp-2">{node.data.scope}</div>
              )}
              {connectedAgents.length > 0 && (
                <div className="text-[10px] text-gray-500">
                  Used by {connectedAgents.length} agent(s)
                </div>
              )}
            </div>
          )}

          {/* Output Status */}
          {node.type === 'output' && node.output && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                Status
              </div>
              <div className="bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
                <LucideIcons.CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-[10px] text-green-700">Output Available</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-1.5 pt-1">
            {node.type === 'output' ? (
              <button
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure(node.id);
                }}
              >
                <LucideIcons.Eye className="w-3 h-3" />
                View Output
              </button>
            ) : (
              <>
                <button
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectionClick();
                  }}
                >
                  <LucideIcons.Link className="w-3 h-3" />
                  {isConnecting ? 'Connect' : 'Connect'}
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigure(node.id);
                  }}
                >
                  <LucideIcons.Settings className="w-3 h-3" />
                  Configure
                </button>
              </>
            )}
          </div>
        </div>

        {/* Connection points */}
        {/* Left Input Circle - For sub-agents to receive connections from parent */}
        {node.type === 'agent' && node.parentAgentId && (
          <div
            className={`absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 rounded-full cursor-pointer z-10 ${
              isDraggingConnection ? 'border-blue-500 scale-110' : 'border-blue-500'
            } transition-all hover:scale-110`}
            onMouseUp={handleInputMouseUp}
            title="Sub-agent connection point"
          />
        )}

        {/* Left Input Circle - For tools to receive connections from parent agent */}
        {node.type === 'tool' && node.parentAgentId && (
          <div
            className={`absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 rounded-full cursor-pointer z-10 ${
              isDraggingConnection ? 'scale-110' : ''
            } ${
              node.toolsetType === 'mcp' || node.mcpConfig ? 'border-purple-500' : 'border-green-500'
            } transition-all hover:scale-110`}
            onMouseUp={handleInputMouseUp}
            title={node.toolsetType === 'mcp' ? 'MCP connector connection point' : 'Tool connection point'}
          />
        )}

        {/* Left Input - hide for Input and Tool nodes, and for sub-agents (they use blue circle above) */}
        {node.type !== 'input' && node.type !== 'tool' && !(node.type === 'agent' && node.parentAgentId) && (
          <div
            className={`absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 rounded-full cursor-pointer z-10 ${
              isDraggingConnection ? 'border-blue-500 scale-110' : 'border-gray-400'
            } transition-all hover:scale-110 hover:border-blue-500`}
            onMouseUp={handleInputMouseUp}
          />
        )}

        {/* Right Output - hide for Output nodes */}
        {node.type !== 'output' && (
          <div
            className={`absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-gray-400 rounded-full cursor-pointer z-10 ${
              isDraggingConnection ? 'pointer-events-none' : ''
            } transition-all hover:scale-110 hover:border-blue-500`}
            onMouseDown={handleOutputMouseDown}
          />
        )}

        {/* Top and Bottom for Agents and Steps (vertical flow connections) */}
        {(node.type === 'agent' || node.type === 'step') && (
          <>
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-2 w-3.5 h-3.5 bg-white border-2 rounded-full cursor-pointer z-10 ${
                isDraggingConnection ? 'border-blue-500 scale-110' : 'border-gray-400'
              } transition-all hover:scale-110 hover:border-blue-500`}
              onMouseUp={handleInputMouseUp}
            />
            <div
              className={`absolute left-1/2 -translate-x-1/2 -bottom-2 w-3.5 h-3.5 bg-white border-2 rounded-full cursor-pointer z-10 ${
                isDraggingConnection ? 'border-blue-500 scale-110' : 'border-gray-400'
              } transition-all hover:scale-110 hover:border-blue-500`}
              onMouseDown={handleOutputMouseDown}
            />
          </>
        )}
      </div>
    </div>
  );
}
