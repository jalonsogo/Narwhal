# Workflow Node Editor

A visual workflow builder for creating AI-powered workflows with React Flow. This project implements a drag-and-drop interface for designing complex workflows with agents and tools.

## Features

- **Visual Workflow Designer**: Drag and drop agents and tools onto a canvas
- **Node Types**:
  - **Agents**: AI-powered nodes (AI Assistant, Data Analyzer, Content Writer, etc.)
  - **Tools**: Capability nodes that can be connected to agents (Web Search, HTTP Request, Database Query, etc.)
  - **Input/Output**: Fixed nodes representing workflow entry and exit points
- **Connection Types**:
  - **Flow connections**: Define the execution flow between nodes
  - **Tool connections**: Attach tools to agents to give them capabilities
- **Configuration Panel**: Configure tool functions and agent capabilities
- **Interactive Canvas**: Zoom, pan, and organize your workflow visually
- **Real-time Updates**: See connections and node states update live

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type-safe development
- **React DnD** - Drag and drop functionality
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible UI components
- **Lucide React** - Icon library

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (buttons, cards, etc.)
│   ├── AgentDropZone.tsx
│   ├── ConfigPanel.tsx
│   ├── WorkflowCanvas.tsx
│   ├── WorkflowNode.tsx
│   └── WorkflowSidebar.tsx
├── types/
│   └── workflow.ts      # TypeScript type definitions
├── styles/
│   └── globals.css      # Global styles and Tailwind config
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```

## Usage

1. **Add Agents**: Drag agent nodes from the sidebar to the canvas
2. **Add Tools**: Drag tool nodes to the canvas and connect them to agents
3. **Connect Nodes**: Click the connection points on nodes to create connections
4. **Configure**: Click the "Configure" button on any node to set its properties
5. **Build Workflows**: Create complex workflows by chaining agents and tools together

## License

ISC

## Acknowledgments

- Design based on the Figma Workflow Node Editor UI
- Built with modern React practices and TypeScript
