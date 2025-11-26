# CLAUDE.md - AI Assistant Guide for Narwhal Agent Builder

## Project Overview

**Narwhal Agent Builder** is a visual workflow builder for creating AI-powered workflows with React Flow. It provides a drag-and-drop interface for designing complex agent-based workflows with tools, connections, and configurations.

**Key Capabilities:**
- Visual workflow designer with drag-and-drop nodes
- Agent and tool management
- Connection-based workflow orchestration
- Real-time configuration and execution
- YAML import/export for workflows
- MCP (Model Context Protocol) connector integration

---

## Quick Reference

### Technology Stack
- **Framework:** React 19.2.0 with TypeScript 5.9.3
- **Build Tool:** Vite 7.1.9
- **Styling:** Tailwind CSS 3.4.18
- **UI Components:** Radix UI primitives
- **Drag & Drop:** React DnD 16.0.1
- **Icons:** Lucide React 0.545.0
- **State Management:** React useState (centralized in WorkflowCanvas)

### Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Type check + production build
npm run preview      # Preview production build
```

### Project Structure
```
/home/user/Narwhal/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Radix UI primitives (Button, Input, etc.)
│   │   ├── WorkflowCanvas.tsx    # Main canvas component (1,970 lines)
│   │   ├── WorkflowNode.tsx      # Node rendering component
│   │   ├── WorkflowSidebar.tsx   # Left sidebar with draggable items
│   │   ├── ConfigPanel.tsx       # Node configuration panel
│   │   ├── OutputPanel.tsx       # Workflow execution results
│   │   ├── KnowledgeNode.tsx     # Knowledge base node
│   │   └── AgentDropZone.tsx     # Initial agent drop zone
│   ├── types/
│   │   └── workflow.ts     # TypeScript type definitions
│   ├── data/
│   │   └── toolDefinitions.ts    # Tool catalog (211 lines)
│   ├── styles/
│   │   └── globals.css     # Global styles & CSS variables
│   ├── assets/             # Images and static resources
│   ├── App.tsx             # Root component
│   └── main.tsx            # Application entry point
├── index.html              # HTML shell
├── package.json            # Dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── postcss.config.js      # PostCSS configuration
```

---

## Core Architecture

### 1. Component Hierarchy

```
App (Root with layout)
└── DndProvider (React DnD context)
    └── MainLayout
        ├── WorkflowSidebar
        │   ├── Search & Filters
        │   ├── Agent List (from API)
        │   ├── Core Tools (from toolDefinitions)
        │   └── MCP Connectors
        └── WorkflowCanvas
            ├── SVG Layer (connections)
            ├── AgentDropZone (initial)
            ├── WorkflowNode (multiple instances)
            ├── KnowledgeNode (single fixed)
            ├── ConfigPanel (Sheet)
            ├── OutputPanel (Sheet)
            └── ToolConfigPanel
```

### 2. State Management

**Architecture:** Centralized state in `WorkflowCanvas.tsx` using React useState hooks. No external state management library.

**Key State Variables:**
```typescript
// Core workflow state
nodes: WorkflowNode[]           // All nodes on canvas
connections: Connection[]       // All connections between nodes

// UI state
configDialogOpen: boolean       // Configuration panel visibility
outputPanelOpen: boolean        // Output panel visibility
toolConfigDialogOpen: boolean   // Tool config dialog visibility

// Canvas interaction
zoom: number                    // Canvas zoom level
panOffset: { x, y }            // Canvas pan position
isPanning: boolean              // Pan interaction state

// Connection drawing
connectingFrom: string | null   // Source node ID during connection
tempConnection: object | null   // Temporary connection while dragging

// Execution
isExecuting: boolean           // Workflow execution state
```

### 3. Data Flow Patterns

**Primary Flow:**
```
User Action → Event Handler → setState → Re-render → UI Update
```

**Common Workflows:**

1. **Adding an Agent:**
   ```
   Drag from Sidebar → Drop on Canvas → handleAgentDropInZone()
   → Fetch agent config from API → Create agent node
   → Auto-create tool nodes → Auto-connect to Input/Output
   ```

2. **Creating Connections:**
   ```
   Click connection point → handleConnectionStart() → setConnectingFrom()
   → Drag to target → handleConnectionDrag() (visual feedback)
   → Drop on target → handleConnectionDrop() → Create Connection object
   ```

3. **Configuring Nodes:**
   ```
   Click "Configure" → handleOpenConfig() → Open ConfigPanel
   → User edits fields → handleSaveConfig() → Update node in state
   ```

4. **Executing Workflow:**
   ```
   Click "Run" → handleRunWorkflow() → POST to /api/agents/{name}/chat
   → Update Output node → Open OutputPanel with results
   ```

---

## Node Types Reference

### Node Type Enum
```typescript
type NodeType = 'input' | 'output' | 'agent' | 'tool' | 'knowledge' | 'step' | 'condition'
```

### 1. Input Node
- **Type:** `'input'`
- **Position:** Fixed at (50, 150)
- **Purpose:** Workflow entry point with user prompt
- **Color:** Emerald green (bg-emerald-500)
- **Properties:** `prompt: string`
- **Connections:** Outputs only (right connection point)

### 2. Output Node
- **Type:** `'output'`
- **Position:** Fixed at (700, 150)
- **Purpose:** Workflow results display
- **Color:** Pink (bg-pink-500)
- **Properties:** `output: WorkflowOutput`
- **Connections:** Inputs only (left connection point)

### 3. Agent Node
- **Type:** `'agent'`
- **Position:** User-defined (draggable)
- **Purpose:** AI agent with configuration and tools
- **Color:** Blue (bg-blue-500)
- **Properties:**
  - `agentConfig: AgentConfiguration` (model, description, instruction)
  - `toolsets: MCPToolset[]` (MCP toolset references)
  - `steps: WorkflowStep[]` (workflow sequences)
  - `subAgents: string[]` (nested agent IDs)
- **Connections:** All directions (left, right, top, bottom)
- **Sub-sections:** Sub-Agents, Tools, MCP Connectors, Knowledge Access

### 4. Tool Node
- **Type:** `'tool'`
- **Position:** Auto-positioned in grid layout
- **Purpose:** Capabilities attached to agents
- **Color:** Green (bg-green-500) for built-in, Purple (bg-purple-500) for MCP
- **Properties:**
  - `toolsetType: 'ref' | 'builtin' | 'mcp'`
  - `parentAgentId: string` (parent agent reference)
  - `data: ToolConfiguration` (tool functions & arguments)
  - `mcpConfig: object` (for MCP tools)
- **Connections:** Input from agent (left connection point)

### 5. Knowledge Node
- **Type:** `'knowledge'`
- **Position:** Fixed at (50, 400)
- **Purpose:** Knowledge base with files/URLs
- **Color:** Black (bg-black)
- **Properties:** `knowledgeItems: KnowledgeItem[]`
- **Accepts:** File drops (PDF, CSV, XLSX), URL inputs
- **Connections:** Can connect to agents

### 6. Step Node
- **Type:** `'step'`
- **Position:** Vertical flow layout
- **Purpose:** Sequential workflow steps
- **Color:** Purple (bg-purple-500)
- **Properties:** `stepDescription: string`, `parentAgentId: string`
- **Connections:** Vertical flow (top/bottom)

### 7. Condition Node
- **Type:** `'condition'`
- **Position:** User-defined
- **Purpose:** Conditional branching (template)
- **Color:** Amber (bg-amber-500)
- **Properties:** `conditionDescription: string`
- **Status:** Template/future feature

---

## Connection System

### Connection Types

```typescript
interface Connection {
  id: string
  sourceId: string
  targetId: string
  connectionType?: 'flow' | 'tool'
}
```

**1. Flow Connections** (`connectionType: 'flow'`)
- Main execution path between nodes
- Visual: Solid gray line with arrowhead
- Examples: Input → Agent, Agent → Output, Step → Step
- Can be replaced by dropping an agent on the connection

**2. Tool Connections** (`connectionType: 'tool'`)
- Tool/sub-agent attachment to parent agent
- Visual: Green dashed line with green arrowhead
- Examples: Tool → Agent, Sub-Agent → Agent
- Cannot be replaced (permanent attachment)

### Connection Points
- **Left circle:** Input connection point
- **Right circle:** Output connection point
- **Top circle:** Vertical flow input (steps)
- **Bottom circle:** Vertical flow output (steps)
- **Left section areas:** Parent connections (tools, sub-agents, connectors)

### Connection Creation Flow
1. Mouse down on source → `handleConnectionStart()` → Store source ID
2. Mouse move → `handleConnectionDrag()` → Update temporary connection visual
3. Mouse up on target → `handleConnectionDrop()` → Create Connection object
4. Delete: Hover connection + Click → Confirm and remove

---

## Type Definitions Reference

### Core Types (from `types/workflow.ts`)

```typescript
// Agent configuration
interface AgentConfiguration {
  name?: string
  model: string
  description: string
  instruction: string
  toolsets: MCPToolset[]
}

// Tool configuration
interface ToolConfiguration {
  scope?: string
  functions?: ToolFunction[]
  customConfig?: Record<string, any>
}

interface ToolFunction {
  name: string
  description: string
  arguments: Record<string, any>
}

// MCP toolset
interface MCPToolset {
  type: 'mcp'
  ref?: string
  command?: string
  args?: string[]
  tools?: string[]
  env?: string[]
}

// Knowledge items
interface KnowledgeItem {
  id: string
  type: 'pdf' | 'csv' | 'xlsx' | 'url' | 'file'
  name: string
  content?: string
  url?: string
  size?: number
  uploadedAt: Date
}

// Workflow output
interface WorkflowOutput {
  response: string
  generatedFiles: GeneratedFile[]
  executionTime?: number
  timestamp: Date
}

// Main node interface
interface WorkflowNode {
  id: string
  type: NodeType
  name: string
  icon: string
  position: { x: number; y: number }
  data?: ToolConfiguration
  agentConfig?: AgentConfiguration
  knowledgeItems?: KnowledgeItem[]
  hasKnowledgeAccess?: boolean
  output?: WorkflowOutput
  prompt?: string
  stepDescription?: string
  conditionDescription?: string
  steps?: WorkflowStep[]
  toolFunction?: string
  showSteps?: boolean
  showTools?: boolean
  showConnectors?: boolean
  parentAgentId?: string
  memoryEntries?: MemoryEntry[]
  mcpConfig?: object
  toolsets?: any[]
  toolsetType?: 'ref' | 'builtin' | 'mcp'
  subAgents?: string[]
  showSubAgents?: boolean
}
```

---

## API Integration

### Backend Service
- **Base URL:** `http://localhost:8080`
- **Framework:** Assumed to be running separately (cagent service)

### Endpoints

**1. GET /api/agents**
- Fetches list of available agents for sidebar
- Returns: Array of agent metadata

**2. GET /api/agents/{name}**
- Fetches specific agent configuration
- Used when dropping agent on canvas
- Returns: Agent config with tools and settings

**3. POST /api/agents/{name}/chat**
- Executes workflow with given agent
- Body: `{ message: string }` (from Input node prompt)
- Returns: `{ response: string }` (displayed in Output node)

---

## Styling System

### Tailwind CSS Configuration

**CSS Variables (defined in `globals.css`):**
```css
--background: 0 0% 100%        /* White */
--foreground: 0 0% 10%         /* Dark gray */
--primary: 0 0% 10%            /* Primary color */
--border: 0 0% 90%             /* Light gray border */
--radius: 0.5rem               /* Default border radius */
```

### Color System by Node Type
- **Input:** `bg-emerald-500` (green)
- **Output:** `bg-pink-500` (pink)
- **Agent:** `bg-blue-500` (blue)
- **Tool (built-in):** `bg-green-500` (green)
- **Tool (MCP):** `bg-purple-500` (purple)
- **Step:** `bg-purple-500` (purple)
- **Knowledge:** `bg-black` (black)
- **Condition:** `bg-amber-500` (amber)

### Connection Line Colors
- **Flow connections:** `#94a3b8` (slate-400)
- **Tool connections:** `#10b981` (green-500, dashed)
- **Hover state:** `#3b82f6` (blue-500)

### Common Patterns
```tsx
// Node card
className="w-[230px] bg-white rounded-lg shadow-md border border-gray-200"

// Node header
className="px-3 py-2 bg-blue-500 text-white rounded-t-lg flex items-center justify-between"

// Connection point
className="w-3 h-3 bg-white border-2 border-gray-400 rounded-full hover:border-blue-500"

// Button variants
<Button variant="default" size="sm">
<Button variant="outline" size="sm">
<Button variant="ghost" size="sm">
```

---

## Development Guidelines

### 1. Adding New Node Types

**Steps:**
1. Add new type to `NodeType` enum in `types/workflow.ts`
2. Create node template in `WorkflowSidebar.tsx` or `data/toolDefinitions.ts`
3. Add rendering logic in `WorkflowNode.tsx`
4. Define color scheme and icon
5. Update connection logic if needed in `WorkflowCanvas.tsx`

**Example:**
```typescript
// 1. Add to NodeType
type NodeType = 'input' | 'output' | 'agent' | 'tool' | 'knowledge' | 'step' | 'condition' | 'newtype'

// 2. Create template
const newNodeTemplate: NodeTemplate = {
  type: 'newtype',
  name: 'New Node',
  icon: 'FileText',
  description: 'Description here',
  color: 'bg-indigo-500'
}

// 3. Add rendering in WorkflowNode.tsx
{node.type === 'newtype' && (
  <div className="px-3 py-2">
    {/* Node content */}
  </div>
)}
```

### 2. Adding New Tools

**Location:** `src/data/toolDefinitions.ts`

**Structure:**
```typescript
export const toolDefinitions: ToolCategory[] = [
  {
    category: "CategoryName",
    icon: "IconName",
    tools: [
      {
        name: "tool-name",
        displayName: "Tool Display Name",
        description: "Tool description",
        icon: "IconName",
        color: "bg-color-class",
        functions: [
          {
            name: "function_name",
            description: "What this function does",
            arguments: {
              arg1: { type: "string", description: "Argument description" },
              arg2: { type: "boolean", description: "Another argument" }
            }
          }
        ]
      }
    ]
  }
]
```

### 3. State Updates

**Important Rules:**
- Always use functional updates for state that depends on previous state
- Never mutate state directly
- Use spread operators for immutable updates

**Examples:**
```typescript
// Good: Functional update
setNodes(prevNodes => prevNodes.map(n =>
  n.id === nodeId ? { ...n, name: newName } : n
))

// Bad: Direct mutation
const node = nodes.find(n => n.id === nodeId)
node.name = newName  // Don't do this!

// Good: Array operations
setConnections(prev => [...prev, newConnection])  // Add
setConnections(prev => prev.filter(c => c.id !== id))  // Remove
```

### 4. Connection Validation

**When creating connections, validate:**
- Source and target exist
- Connection type is appropriate
- No duplicate connections
- Node types support the connection

**Example:**
```typescript
const validateConnection = (sourceId: string, targetId: string) => {
  const source = nodes.find(n => n.id === sourceId)
  const target = nodes.find(n => n.id === targetId)

  if (!source || !target) return false

  // Add type-specific validation
  if (source.type === 'output') return false  // Output can't be source
  if (target.type === 'input') return false   // Input can't be target

  return true
}
```

### 5. Working with WorkflowCanvas

**Key Methods:**
- `handleAgentDropInZone()` - Drop agent on canvas
- `handleConnectionStart()` - Begin connection drawing
- `handleConnectionDrop()` - Complete connection
- `handleOpenConfig()` - Open node configuration
- `handleRunWorkflow()` - Execute workflow
- `handleDeleteNode()` - Remove node and connections

**Reference:**
All these methods are defined in `src/components/WorkflowCanvas.tsx` (lines vary, search by function name)

### 6. TypeScript Best Practices

**Type Safety:**
```typescript
// Good: Type assertions when necessary
const agentNode = nodes.find(n => n.id === id) as WorkflowNode

// Good: Type guards
if (node.type === 'agent' && node.agentConfig) {
  // TypeScript knows agentConfig exists here
}

// Good: Optional chaining
const model = node.agentConfig?.model ?? 'default-model'
```

### 7. Performance Considerations

**Optimization Tips:**
- Memoize expensive calculations with `useMemo`
- Use `useCallback` for event handlers passed as props
- Avoid inline object/array creation in render
- Use React.memo for components that render frequently

**Example:**
```typescript
// Good: Memoized calculation
const sortedNodes = useMemo(() =>
  nodes.sort((a, b) => a.position.y - b.position.y),
  [nodes]
)

// Good: Stable callback reference
const handleNodeClick = useCallback((id: string) => {
  setSelectedNode(id)
}, [])
```

---

## Testing Guidelines

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Drag agent from sidebar to canvas
- [ ] Create flow connections between nodes
- [ ] Create tool connections
- [ ] Delete connections by clicking
- [ ] Delete nodes (should remove connections)
- [ ] Configure agent settings
- [ ] Add knowledge items
- [ ] Execute workflow
- [ ] View output results

**Canvas Interactions:**
- [ ] Zoom in/out with mouse wheel
- [ ] Pan canvas by dragging
- [ ] Resize sidebar by dragging divider
- [ ] Collapse/expand sidebar

**Edge Cases:**
- [ ] Drop agent on connection (should insert)
- [ ] Prevent invalid connections
- [ ] Handle API errors gracefully
- [ ] Large workflows (50+ nodes)
- [ ] Rapid clicks/drags

### Common Issues & Solutions

**Issue:** Nodes not rendering after state update
- **Solution:** Check if state update is immutable. Use spread operator.

**Issue:** Connections not drawing correctly
- **Solution:** Verify `getConnectionPath()` calculation. Check node positions.

**Issue:** Drag and drop not working
- **Solution:** Ensure DndProvider wraps components. Check useDrop/useDrag hooks.

**Issue:** API calls failing
- **Solution:** Verify backend is running on localhost:8080. Check CORS settings.

---

## File Reference Guide

### Key Files to Understand

**1. `src/components/WorkflowCanvas.tsx` (1,970 lines)**
- **Purpose:** Main canvas component with all workflow logic
- **Key Functions:**
  - Lines 100-200: State initialization
  - Lines 300-500: Connection handling
  - Lines 600-800: Node manipulation
  - Lines 900-1100: Drop handlers
  - Lines 1200-1400: Rendering logic
- **When to Edit:** Adding canvas features, connection logic, node operations

**2. `src/types/workflow.ts` (120 lines)**
- **Purpose:** Central type definitions
- **Key Interfaces:** WorkflowNode, Connection, AgentConfiguration, ToolConfiguration
- **When to Edit:** Adding new node types, changing data structures

**3. `src/data/toolDefinitions.ts` (211 lines)**
- **Purpose:** Tool catalog with categories and functions
- **Structure:** Array of ToolCategory objects
- **When to Edit:** Adding/modifying tools

**4. `src/components/WorkflowNode.tsx`**
- **Purpose:** Individual node rendering
- **Handles:** Node display, connection points, drag behavior
- **When to Edit:** Changing node appearance, adding node sections

**5. `src/components/WorkflowSidebar.tsx`**
- **Purpose:** Left sidebar with draggable items
- **Handles:** Search, filtering, agent/tool lists
- **When to Edit:** Adding sidebar sections, changing drag sources

**6. `src/components/ConfigPanel.tsx`**
- **Purpose:** Node configuration sheet
- **Handles:** Agent settings, model selection, instructions
- **When to Edit:** Adding configuration fields

---

## Common Tasks & Code Examples

### Task 1: Add a New Agent Property

**Goal:** Add a "temperature" field to agent configuration

**Steps:**
1. Update `AgentConfiguration` interface in `types/workflow.ts`:
```typescript
interface AgentConfiguration {
  name?: string
  model: string
  description: string
  instruction: string
  toolsets: MCPToolset[]
  temperature?: number  // Add this
}
```

2. Add form field in `ConfigPanel.tsx`:
```tsx
<div className="space-y-2">
  <Label htmlFor="temperature">Temperature</Label>
  <Input
    id="temperature"
    type="number"
    min="0"
    max="2"
    step="0.1"
    value={editedConfig.temperature ?? 0.7}
    onChange={(e) => setEditedConfig({
      ...editedConfig,
      temperature: parseFloat(e.target.value)
    })}
  />
</div>
```

3. Update display in `WorkflowNode.tsx`:
```tsx
{node.type === 'agent' && node.agentConfig?.temperature && (
  <div className="text-xs text-gray-500">
    Temperature: {node.agentConfig.temperature}
  </div>
)}
```

### Task 2: Create Custom Connection Validation

**Goal:** Prevent connecting tools to knowledge nodes

**Location:** `src/components/WorkflowCanvas.tsx` in `handleConnectionDrop()`

```typescript
const handleConnectionDrop = (targetId: string) => {
  if (!connectingFrom) return

  const source = nodes.find(n => n.id === connectingFrom)
  const target = nodes.find(n => n.id === targetId)

  // Custom validation
  if (source?.type === 'tool' && target?.type === 'knowledge') {
    alert('Cannot connect tools directly to knowledge nodes')
    return
  }

  // ... rest of connection logic
}
```

### Task 3: Add Node Context Menu

**Goal:** Right-click menu for node operations

**Location:** `src/components/WorkflowNode.tsx`

```tsx
const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null)

const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault()
  setContextMenu({ x: e.clientX, y: e.clientY })
}

return (
  <div onContextMenu={handleContextMenu}>
    {/* Node content */}

    {contextMenu && (
      <div
        className="fixed bg-white border shadow-lg rounded"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button onClick={() => handleDuplicate()}>Duplicate</button>
        <button onClick={() => handleDelete()}>Delete</button>
      </div>
    )}
  </div>
)
```

### Task 4: Export Workflow as JSON

**Goal:** Save entire workflow state

**Location:** `src/components/WorkflowCanvas.tsx`

```typescript
const exportWorkflow = () => {
  const workflow = {
    nodes,
    connections,
    metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    }
  }

  const blob = new Blob([JSON.stringify(workflow, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'workflow.json'
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## Code Conventions

### Naming Conventions
- **Components:** PascalCase (e.g., `WorkflowCanvas`, `ConfigPanel`)
- **Functions:** camelCase (e.g., `handleConnectionStart`, `getConnectionPath`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_ZOOM`, `MIN_NODE_WIDTH`)
- **Interfaces:** PascalCase with descriptive names (e.g., `WorkflowNode`, `AgentConfiguration`)
- **Props:** camelCase interface names ending in Props (e.g., `WorkflowNodeProps`)

### Code Organization
- **Imports:** Group by external → internal → types → styles
- **Component Structure:**
  1. Imports
  2. Type definitions
  3. Component function
  4. State declarations
  5. Effects
  6. Event handlers
  7. Helper functions
  8. Render logic
  9. Exports

### Comments
- Use JSDoc for complex functions
- Explain "why" not "what"
- Document non-obvious behavior
- Keep comments up-to-date with code

### Example Component Structure:
```tsx
// 1. Imports
import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import type { WorkflowNode } from '@/types/workflow'

// 2. Types
interface MyComponentProps {
  node: WorkflowNode
  onUpdate: (node: WorkflowNode) => void
}

// 3. Component
export function MyComponent({ node, onUpdate }: MyComponentProps) {
  // 4. State
  const [isEditing, setIsEditing] = useState(false)

  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies])

  // 6. Event Handlers
  const handleClick = useCallback(() => {
    setIsEditing(true)
  }, [])

  // 7. Helpers
  const formatNodeName = (name: string) => {
    return name.toUpperCase()
  }

  // 8. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

---

## Git Workflow

### Branch Strategy
- **Main branch:** Protected, production-ready code
- **Feature branches:** `claude/*` prefix for AI-generated changes
- **Format:** `claude/claude-md-{session-id}`

### Commit Messages
Follow conventional commit format:
```
type(scope): description

[optional body]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring
- `style:` Formatting changes
- `docs:` Documentation
- `test:` Testing
- `chore:` Maintenance

**Examples:**
```
feat(canvas): add context menu for nodes
fix(connections): prevent duplicate connections
refactor(state): centralize node operations
docs(readme): update installation instructions
```

### Push Protocol
Always use: `git push -u origin <branch-name>`

---

## Troubleshooting

### Build Issues

**TypeScript Errors:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

**Vite Dev Server Issues:**
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Runtime Issues

**React DnD Not Working:**
- Check DndProvider is wrapping app
- Verify HTML5Backend is imported
- Check useDrop/useDrag hook configuration

**State Not Updating:**
- Use functional state updates
- Check for direct mutations
- Verify component re-render triggers

**Connections Not Rendering:**
- Check SVG viewBox calculation
- Verify node positions are numbers
- Check z-index layering

### API Issues

**CORS Errors:**
- Ensure backend has CORS enabled
- Check API base URL (localhost:8080)
- Verify fetch credentials setting

**Agent Load Failures:**
- Check backend is running
- Verify agent exists in backend
- Check network tab for error details

---

## Resources & References

### External Documentation
- [React 19 Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [React DnD](https://react-dnd.github.io/react-dnd/)
- [Vite Guide](https://vitejs.dev/guide/)

### Important Links
- **Repository:** /home/user/Narwhal
- **Dev Server:** http://localhost:5173
- **API Server:** http://localhost:8080

### Key Keyboard Shortcuts
- **Zoom:** Mouse wheel
- **Pan:** Click and drag canvas
- **Delete:** Click connection + confirm

---

## AI Assistant Guidelines

### When Working on This Codebase:

1. **Read Before Editing:**
   - Always read files before modifying
   - Understand existing patterns
   - Maintain consistency with current code style

2. **State Management:**
   - Respect centralized state in WorkflowCanvas
   - Use immutable updates
   - Avoid prop drilling (consider lifting state)

3. **Type Safety:**
   - Add types for all new interfaces
   - Use TypeScript strict mode
   - Avoid `any` type unless necessary

4. **Testing:**
   - Test in browser after changes
   - Verify state updates work correctly
   - Check console for errors

5. **Component Changes:**
   - Keep components focused and small
   - Extract reusable logic to hooks
   - Use existing UI components from `ui/` folder

6. **Performance:**
   - Memoize expensive calculations
   - Use callback hooks for event handlers
   - Avoid unnecessary re-renders

7. **Documentation:**
   - Update this file when adding major features
   - Add inline comments for complex logic
   - Keep README.md in sync with changes

---

## Changelog

### Version 1.0.0 (2025-11-26)
- Initial CLAUDE.md creation
- Comprehensive codebase documentation
- Development guidelines and conventions
- API reference and type definitions
- Common tasks and troubleshooting guide

---

**Last Updated:** 2025-11-26
**Maintainer:** AI-assisted development team
**Status:** Active development
