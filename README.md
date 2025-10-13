# Narwhal Agent Builder 
A visual workflow builder for creating AI-powered workflows with React Flow. This project implements a drag-and-drop interface for designing complex workflows with agents and tools.

<img width="300" height="830" alt="BD37DF9B-7188-4886-A305-F6AD39051B9D" src="https://github.com/user-attachments/assets/cadfbda1-b12a-49af-9d4e-fc8c32053340" />


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

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

## 🔘 Usage

1. **Add Agents**: Drag agent nodes from the sidebar to the canvas
2. **Add Tools**: Drag tool nodes to the canvas and connect them to agents
3. **Connect Nodes**: Click the connection points on nodes to create connections
4. **Configure**: Click the "Configure" button on any node to set its properties
5. **Build Workflows**: Create complex workflows by chaining agents and tools together

## 📜 LOLcense
For {root} sake I'm a designer. Mostly all the code has been writen by chatGPT and ad latere.

## Acknowledgments

- Design based on the Figma Workflow Node Editor UI
- Built with modern React practices and TypeScript
