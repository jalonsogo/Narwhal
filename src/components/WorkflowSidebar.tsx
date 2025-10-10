import { useDrag } from 'react-dnd';
import { ScrollArea } from './ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { NodeTemplate } from '../types/workflow';
import { useState, useEffect, useRef } from 'react';
import { toolCategories } from '../data/toolDefinitions';
import { ToolPreviewDialog } from './ToolPreviewDialog';
import { Button } from './ui/button';
import narwhalLogo from '../assets/images/logo.svg';

const toolTemplates: NodeTemplate[] = Object.values(toolCategories).map(category => ({
  type: 'tool' as const,
  name: category.name,
  icon: category.name === 'Filesystem' ? 'FolderOpen' :
        category.name === 'Memory' ? 'Brain' :
        category.name === 'Shell' ? 'Terminal' :
        category.name === 'Fetch' ? 'Download' :
        category.name === 'Think' ? 'Lightbulb' :
        category.name === 'Todo' ? 'CheckSquare' :
        category.name === 'Transfer' ? 'Send' :
        'Code',
  description: category.description,
  color: 'bg-green-500'
}));

const connectorTemplates: NodeTemplate[] = [
  {
    type: 'tool' as const,
    name: 'Salesforce MCP',
    icon: 'Cloud',
    description: 'Connect to Salesforce CRM with MCP server',
    color: 'bg-purple-500',
    mcpConfig: {
      type: 'mcp',
      command: 'uv',
      args: ['run', 'salesforce-mcp.py']
    }
  },
  {
    type: 'tool' as const,
    name: 'GitHub MCP',
    icon: 'Github',
    description: 'Access GitHub repositories and issues',
    color: 'bg-purple-500',
    mcpConfig: {
      type: 'mcp',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github']
    }
  },
  {
    type: 'tool' as const,
    name: 'Postgres MCP',
    icon: 'Database',
    description: 'Connect to PostgreSQL databases',
    color: 'bg-purple-500',
    mcpConfig: {
      type: 'mcp',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres']
    }
  },
  {
    type: 'tool' as const,
    name: 'Google Drive MCP',
    icon: 'HardDrive',
    description: 'Access and manage Google Drive files',
    color: 'bg-purple-500',
    mcpConfig: {
      type: 'mcp',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gdrive']
    }
  },
  {
    type: 'tool' as const,
    name: 'Slack MCP',
    icon: 'MessageSquare',
    description: 'Send messages and manage Slack channels',
    color: 'bg-purple-500',
    mcpConfig: {
      type: 'mcp',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack']
    }
  },
  {
    type: 'tool' as const,
    name: 'Puppeteer MCP',
    icon: 'Globe',
    description: 'Browser automation with Puppeteer',
    color: 'bg-purple-500',
    mcpConfig: {
      type: 'mcp',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer']
    }
  }
];

interface DraggableNodeProps {
  template: NodeTemplate;
  onPreview?: (toolName: string) => void;
}

function DraggableNode({ template, onPreview }: DraggableNodeProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'node',
    item: template,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const Icon = LucideIcons[template.icon as keyof typeof LucideIcons] as any;

  const handleClick = (e: React.MouseEvent) => {
    // Only show preview for tool nodes
    if (template.type === 'tool' && onPreview) {
      e.preventDefault();
      e.stopPropagation();
      onPreview(template.name);
    }
  };

  return (
    <div
      ref={drag as any}
      onClick={handleClick}
      className={`cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50' : 'opacity-100'}
        bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm p-3 mb-2 ${
          template.type === 'tool' ? 'hover:border-green-400' : ''
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`${template.color} p-2 rounded-md shrink-0`}>
          {Icon && <Icon className="w-4 h-4 text-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">{template.name}</div>
          <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
        </div>
        {template.type === 'tool' && (
          <LucideIcons.Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

interface WorkflowSidebarProps {
  isCollapsed: boolean;
  onCollapseChange?: (isCollapsed: boolean) => void;
  onCreateAgent?: () => void;
}

export function WorkflowSidebar({ isCollapsed, onCollapseChange, onCreateAgent }: WorkflowSidebarProps) {
  const [agentTemplates, setAgentTemplates] = useState<NodeTemplate[]>([]);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedToolForPreview, setSelectedToolForPreview] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'agents' | 'tools' | 'connectors'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const handleCollapseToggle = () => {
    onCollapseChange?.(!isCollapsed);
  };

  // Fetch agents from cagent API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/agents');
        if (response.ok) {
          const data = await response.json();
          const agents: NodeTemplate[] = data.map((agent: {name: string; description: string; multi: boolean}) => ({
            type: 'agent' as const,
            name: agent.name.replace(/_/g, ' ').replace(/\.yaml$|\.yml$/i, ''),
            icon: 'Bot',
            description: agent.description,
            color: 'bg-blue-500'
          }));
          setAgentTemplates(agents);
          console.log('Loaded agents for sidebar:', agents);
        }
      } catch (error) {
        console.error('Failed to fetch agents from API:', error);
      }
    };

    fetchAgents();
  }, []);

  const handleToolPreview = (toolName: string) => {
    setSelectedToolForPreview(toolName);
    setPreviewDialogOpen(true);
  };

  const handleAddToolToCanvas = (toolName: string) => {
    // This will be handled by the parent component (App.tsx) via context or props
    // For now, just close the dialog - the user can drag and drop
    console.log('Add tool to canvas:', toolName);
  };

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterMenu]);

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Filter templates based on search query and filter
  const filterTemplates = (templates: NodeTemplate[], category: string) => {
    // Check if this category should be filtered by the active filter
    if (searchFilter === 'agents' && category !== 'Agents') return [];
    if (searchFilter === 'tools' && category !== 'Core Tools') return [];
    if (searchFilter === 'connectors' && category !== 'Connectors') return [];

    if (!searchQuery) return templates;

    return templates.filter(template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const groupedTemplates = {
    'Agents': agentTemplates,
    'Core Tools': toolTemplates,
    'Connectors': connectorTemplates,
  };

  return (
    <div className={`flex flex-col h-full transition-all ${isCollapsed ? 'w-auto' : 'w-full border-r border-gray-200 bg-gray-50/50'}`}>
      {isCollapsed ? (
        <div className="flex items-center gap-2 px-3 py-3">
          <img src={narwhalLogo} alt="Narwhal" className="w-8 h-8" />
          <span className="text-lg font-semibold mr-2">Narwhal</span>
          <button
            className="p-1 hover:bg-gray-100/80 rounded transition-colors bg-white/50"
            onClick={handleCollapseToggle}
          >
            <LucideIcons.PanelLeftOpen className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      ) : (
        <>
          {/* Narwhal Header */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <img src={narwhalLogo} alt="Narwhal" className="w-8 h-8" />
                <h1 className="text-lg font-semibold">Narwhal</h1>
              </div>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                onClick={handleCollapseToggle}
              >
                <LucideIcons.PanelLeftClose className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200 bg-white">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-md border border-gray-200 px-2 py-1.5">
            <LucideIcons.Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-xs bg-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <LucideIcons.X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <div className="relative" ref={filterMenuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="h-7 px-2"
            >
              <LucideIcons.Filter className="w-3.5 h-3.5" />
            </Button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => {
                    setSearchFilter('all');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    searchFilter === 'all' ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setSearchFilter('agents');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    searchFilter === 'agents' ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  Agents
                </button>
                <button
                  onClick={() => {
                    setSearchFilter('tools');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    searchFilter === 'tools' ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  Core Tools
                </button>
                <button
                  onClick={() => {
                    setSearchFilter('connectors');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    searchFilter === 'connectors' ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  Connectors
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(groupedTemplates).map(([category, templates]) => {
            const filteredTemplates = filterTemplates(templates, category);

            // Hide category if no templates match the filter
            if (filteredTemplates.length === 0) return null;

            const isCollapsed = collapsedSections[category] || false;
            const ChevronIcon = isCollapsed ? LucideIcons.ChevronRight : LucideIcons.ChevronDown;

            return (
              <div key={category}>
                <button
                  onClick={() => toggleSection(category)}
                  className="w-full flex items-center justify-between mb-3 hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                >
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {category}
                    <span className="ml-2 text-gray-400">({filteredTemplates.length})</span>
                  </h3>
                  <ChevronIcon className="w-4 h-4 text-gray-400" />
                </button>

                {!isCollapsed && (
                  <div>
                    {/* Add "Create Agent" button at the top of Agents section */}
                    {category === 'Agents' && (
                      <button
                        onClick={() => onCreateAgent?.()}
                        className="w-full mb-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg border border-blue-600 p-3 flex items-center justify-center gap-2 transition-colors"
                      >
                        <LucideIcons.Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Create Agent</span>
                      </button>
                    )}

                    {filteredTemplates.map((template) => (
                      <DraggableNode
                        key={template.name}
                        template={template}
                        onPreview={handleToolPreview}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
        </>
      )}

      {/* Tool Preview Dialog */}
      {selectedToolForPreview && (
        <ToolPreviewDialog
          isOpen={previewDialogOpen}
          onClose={() => {
            setPreviewDialogOpen(false);
            setSelectedToolForPreview(null);
          }}
          toolName={selectedToolForPreview}
          onAddToCanvas={handleAddToolToCanvas}
        />
      )}
    </div>
  );
}
