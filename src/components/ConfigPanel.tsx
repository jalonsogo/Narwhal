import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { WorkflowNode, ToolConfiguration, AgentConfiguration, MCPToolset, MemoryEntry } from '../types/workflow';
import { toolCategories } from '../data/toolDefinitions';

interface ConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: WorkflowNode | null;
  onSave: (nodeId: string, config: any) => void;
  connectedTools?: WorkflowNode[];
  connectedAgents?: WorkflowNode[];
}

const commonFunctions: Record<string, string[]> = {
  'Web Search': ['search_web', 'get_page_content', 'extract_links'],
  'HTTP Request': ['get', 'post', 'put', 'delete', 'patch'],
  'Database Query': ['select', 'insert', 'update', 'delete', 'execute_raw'],
  'Calculator': ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt'],
  'File Reader': ['read_text', 'read_json', 'read_csv', 'list_files'],
  'JSON Parser': ['parse', 'stringify', 'validate', 'query'],
};

export function ConfigPanel({
  open,
  onOpenChange,
  node,
  onSave,
  connectedTools = [],
  connectedAgents = [],
}: ConfigPanelProps) {
  const [scope, setScope] = useState('');
  const [enabledFunctions, setEnabledFunctions] = useState<Record<string, boolean>>({});

  // Agent configuration state
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [description, setDescription] = useState('');
  const [instruction, setInstruction] = useState('');
  const [toolsets, setToolsets] = useState<MCPToolset[]>([]);
  const [editingYaml, setEditingYaml] = useState(false);
  const [yamlText, setYamlText] = useState('');
  const [fullscreenYaml, setFullscreenYaml] = useState(false);
  const [fullscreenInstruction, setFullscreenInstruction] = useState(false);

  useEffect(() => {
    if (node) {
      if (node.type === 'tool' && node.data) {
        setScope(node.data.scope || '');

        // Initialize enabled functions from node data
        const enabled: Record<string, boolean> = {};
        if (node.data.functions) {
          node.data.functions.forEach((func: string) => {
            enabled[func] = true;
          });
        }
        setEnabledFunctions(enabled);
      } else {
        setScope('');
        setEnabledFunctions({});
      }

      if (node.type === 'agent') {
        if (node.agentConfig) {
          setModel(node.agentConfig.model);
          setDescription(node.agentConfig.description);
          setInstruction(node.agentConfig.instruction);
          setToolsets(node.agentConfig.toolsets || []);
        } else {
          // Default agent config
          setModel('openai/gpt-4o-mini');
          setDescription('A helpful AI assistant');
          setInstruction('You are a knowledgeable assistant that helps users with various tasks.\nBe helpful, accurate, and concise in your responses.');
          setToolsets([]);
        }
      }
    }
  }, [node, open]);

  if (!node) return null;

  const Icon = LucideIcons[node.icon as keyof typeof LucideIcons] as any;

  // Get tool category from toolDefinitions
  const toolCategory = node.type === 'tool'
    ? Object.values(toolCategories).find(
        cat => cat.name.toLowerCase() === node.name.toLowerCase()
      )
    : null;

  const toggleFunction = (funcName: string) => {
    setEnabledFunctions(prev => ({
      ...prev,
      [funcName]: !prev[funcName],
    }));
  };

  const enableAll = () => {
    if (!toolCategory) return;
    const enabled: Record<string, boolean> = {};
    toolCategory.functions.forEach(func => {
      enabled[func.name] = true;
    });
    setEnabledFunctions(enabled);
  };

  const disableAll = () => {
    setEnabledFunctions({});
  };

  const invertSelection = () => {
    if (!toolCategory) return;
    const inverted: Record<string, boolean> = {};
    toolCategory.functions.forEach(func => {
      inverted[func.name] = !enabledFunctions[func.name];
    });
    setEnabledFunctions(inverted);
  };

  const generateYaml = (): string => {
    let yaml = 'version: "2"\n\nagents:\n  root:\n';
    yaml += `    model: ${model}\n`;
    yaml += `    description: ${description}\n`;
    yaml += `    instruction: |\n`;
    instruction.split('\n').forEach(line => {
      yaml += `      ${line}\n`;
    });

    if (toolsets.length > 0) {
      yaml += `    toolsets:\n`;
      toolsets.forEach(toolset => {
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

  const addToolset = () => {
    setToolsets([...toolsets, {
      type: 'mcp',
      ref: '',
      command: '',
      args: [],
      tools: [],
      env: [],
    }]);
  };

  const removeToolset = (index: number) => {
    setToolsets(toolsets.filter((_, i) => i !== index));
  };

  const updateToolset = (index: number, updates: Partial<MCPToolset>) => {
    setToolsets(toolsets.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const handleSave = () => {
    if (node.type === 'tool') {
      // Get list of enabled function names
      const functions = Object.entries(enabledFunctions)
        .filter(([_, enabled]) => enabled)
        .map(([name, _]) => name);

      const config: ToolConfiguration = {
        scope: scope.trim() || undefined,
        functions: functions.length > 0 ? functions : undefined,
      };
      onSave(node.id, config);
    } else if (node.type === 'agent') {
      const config: AgentConfiguration = {
        model,
        description,
        instruction,
        toolsets,
      };
      onSave(node.id, config);
    }
    onOpenChange(false);
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'input': return 'text-emerald-500';
      case 'output': return 'text-pink-500';
      case 'agent': return 'text-blue-500';
      case 'tool': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent resizable side="right" className="w-[30vw] sm:w-[30vw] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${getNodeColor()}`} />}
            {node.name}
          </SheetTitle>
          <SheetDescription>
            Configure this {node.type} node
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* Tool-specific configuration */}
            {node.type === 'tool' && toolCategory && (
              <>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Functions</Label>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enableAll}
                        title="Enable all functions"
                      >
                        <LucideIcons.CheckSquare className="w-3 h-3 mr-1" />
                        All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disableAll}
                        title="Disable all functions"
                      >
                        <LucideIcons.Square className="w-3 h-3 mr-1" />
                        None
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={invertSelection}
                        title="Invert selection"
                      >
                        <LucideIcons.Repeat className="w-3 h-3 mr-1" />
                        Invert
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {toolCategory.functions.map((func, index) => {
                      const isEnabled = enabledFunctions[func.name] || false;
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border transition-colors ${
                            isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-semibold text-gray-900">
                                  {func.name}
                                </code>
                                {isEnabled && (
                                  <Badge variant="default" className="text-xs">
                                    Enabled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {func.description}
                              </p>
                              {Object.keys(func.arguments).length > 0 && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Arguments: </span>
                                  <code className="text-xs bg-white px-1.5 py-0.5 rounded border">
                                    {Object.entries(func.arguments)
                                      .map(([name, type]) => `${name}: ${type}`)
                                      .join(', ')}
                                  </code>
                                </div>
                              )}
                            </div>
                            <Switch.Root
                              checked={isEnabled}
                              onCheckedChange={() => toggleFunction(func.name)}
                              className={`w-11 h-6 rounded-full transition-colors ${
                                isEnabled ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                            </Switch.Root>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {Object.values(enabledFunctions).filter(Boolean).length} of {toolCategory.functions.length} functions enabled
                  </div>
                </div>

                {connectedAgents.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Connected Agents ({connectedAgents.length})</Label>
                      <div className="space-y-2">
                        {connectedAgents.map((agent) => {
                          const AgentIcon = LucideIcons[agent.icon as keyof typeof LucideIcons] as any;
                          return (
                            <div key={agent.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                              {AgentIcon && <AgentIcon className="w-4 h-4 text-blue-500" />}
                              <span className="text-sm">{agent.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Memory Inspector for Memory tool */}
                {node.name.toLowerCase() === 'memory' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Memory Contents</Label>
                        <Badge variant="outline">
                          {node.memoryEntries?.length || 0} entries
                        </Badge>
                      </div>

                      {!node.memoryEntries || node.memoryEntries.length === 0 ? (
                        <div className="bg-muted rounded-lg p-4 text-center">
                          <LucideIcons.Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No memories stored yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {node.memoryEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <code className="text-xs font-mono text-gray-500">
                                  ID: {entry.id}
                                </code>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                {entry.memory}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Agent-specific configuration */}
            {node.type === 'agent' && (
              <>
                <Separator />

                <div className="flex items-center justify-between">
                  <Label>Agent Configuration</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">YAML</span>
                    <Switch.Root
                      checked={editingYaml}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setYamlText(generateYaml());
                        }
                        setEditingYaml(checked);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors ${
                        editingYaml ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                    </Switch.Root>
                  </div>
                </div>

                {editingYaml ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>cagent YAML Configuration</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFullscreenYaml(true)}
                      >
                        <LucideIcons.Maximize2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={yamlText}
                      onChange={(e) => setYamlText(e.target.value)}
                      className="font-mono text-xs resize-y"
                      style={{ minHeight: '400px' }}
                      placeholder="version: &quot;2&quot;&#10;&#10;agents:&#10;  root:&#10;    model: openai/gpt-4o-mini&#10;    ..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Edit the raw YAML configuration for cagent
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="openai/gpt-4o-mini"
                      />
                      <p className="text-xs text-muted-foreground">
                        Model identifier (e.g., openai/gpt-4o-mini, anthropic/claude-3-5-sonnet)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A helpful AI assistant"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="instruction">System Instruction</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFullscreenInstruction(true)}
                        >
                          <LucideIcons.Maximize2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Textarea
                        id="instruction"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className="font-mono text-sm resize-y"
                        style={{ minHeight: '120px' }}
                        placeholder="You are a knowledgeable assistant..."
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>MCP Toolsets</Label>
                        <Button variant="outline" size="sm" onClick={addToolset}>
                          <LucideIcons.Plus className="w-3 h-3 mr-1" />
                          Add Toolset
                        </Button>
                      </div>

                      {toolsets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No toolsets configured. Add one to enable MCP tools.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {toolsets.map((toolset, index) => (
                            <div key={index} className="p-3 bg-muted rounded space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Toolset {index + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeToolset(index)}
                                >
                                  <LucideIcons.X className="w-3 h-3" />
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Ref</Label>
                                    <Input
                                      value={toolset.ref || ''}
                                      onChange={(e) => updateToolset(index, { ref: e.target.value })}
                                      placeholder="docker:duckduckgo"
                                      className="text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Command</Label>
                                    <Input
                                      value={toolset.command || ''}
                                      onChange={(e) => updateToolset(index, { command: e.target.value })}
                                      placeholder="rust-mcp-filesystem"
                                      className="text-xs"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs">Args (comma-separated)</Label>
                                  <Input
                                    value={toolset.args?.join(', ') || ''}
                                    onChange={(e) => updateToolset(index, {
                                      args: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    })}
                                    placeholder="--allow-write, ."
                                    className="text-xs"
                                  />
                                </div>

                                <div>
                                  <Label className="text-xs">Tools (comma-separated)</Label>
                                  <Input
                                    value={toolset.tools?.join(', ') || ''}
                                    onChange={(e) => updateToolset(index, {
                                      tools: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    })}
                                    placeholder="read_file, write_file"
                                    className="text-xs"
                                  />
                                </div>

                                <div>
                                  <Label className="text-xs">Env Variables (comma-separated)</Label>
                                  <Input
                                    value={toolset.env?.join(', ') || ''}
                                    onChange={(e) => updateToolset(index, {
                                      env: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    })}
                                    placeholder="RUST_LOG=debug"
                                    className="text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {connectedTools.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Connected Tools ({connectedTools.length})</Label>
                      <div className="space-y-2">
                        {connectedTools.map((tool) => {
                          const ToolIcon = LucideIcons[tool.icon as keyof typeof LucideIcons] as any;
                          return (
                            <div key={tool.id} className="p-3 bg-muted rounded space-y-1">
                              <div className="flex items-center gap-2">
                                {ToolIcon && <ToolIcon className="w-4 h-4 text-green-500" />}
                                <span className="text-sm">{tool.name}</span>
                              </div>
                              {tool.data?.scope && (
                                <p className="text-xs text-muted-foreground">{tool.data.scope}</p>
                              )}
                              {tool.data?.functions && tool.data.functions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tool.data.functions.map((func) => (
                                    <code key={func} className="text-[10px] bg-background px-1.5 py-0.5 rounded">
                                      {func}
                                    </code>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Input node - Full Prompt Display */}
            {node.type === 'input' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">
                    This node represents the initial prompt or data that starts the workflow execution.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="full-prompt">Full Prompt</Label>
                  <Textarea
                    id="full-prompt"
                    value={node.prompt || ''}
                    readOnly
                    className="min-h-[200px] font-mono text-sm bg-muted"
                    placeholder="No prompt entered yet. Edit the prompt in the Input node on the canvas."
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the complete prompt that will be sent to the agent. Edit it directly in the Input node on the canvas.
                  </p>
                </div>
              </>
            )}

            {/* Output node info */}
            {node.type === 'output' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">
                    This node represents the final output or result of the workflow.
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-6 pt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <LucideIcons.Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
        </SheetContent>
      </Sheet>

      {/* Fullscreen YAML Editor */}
      {fullscreenYaml && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFullscreenYaml(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFullscreenYaml(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">YAML Configuration</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenYaml(false);
                }}
              >
                <LucideIcons.X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <Textarea
                value={yamlText}
                onChange={(e) => setYamlText(e.target.value)}
                className="w-full h-full font-mono text-sm resize-none overflow-auto"
                placeholder="version: &quot;2&quot;&#10;&#10;agents:&#10;  root:&#10;    model: openai/gpt-4o-mini&#10;    ..."
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Instruction Editor */}
      {fullscreenInstruction && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFullscreenInstruction(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFullscreenInstruction(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">System Instruction</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenInstruction(false);
                }}
              >
                <LucideIcons.X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="w-full h-full font-mono text-sm resize-none overflow-auto"
                placeholder="You are a knowledgeable assistant..."
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
