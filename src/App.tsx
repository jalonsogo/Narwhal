import { useState, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { WorkflowSidebar } from './components/WorkflowSidebar';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { Button } from './components/ui/button';
import * as LucideIcons from 'lucide-react';

export default function App() {
  const [sidebarWidth, setSidebarWidth] = useState(230);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 500) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-white">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <LucideIcons.Workflow className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl">Workflow Builder</h1>
                <p className="text-sm text-muted-foreground">Create AI-powered workflows</p>
              </div>
            </div>

          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          <div style={{ width: `${sidebarWidth}px` }} className="relative flex-shrink-0">
            <WorkflowSidebar />
            {/* Resize handle */}
            <div
              ref={resizeRef}
              onMouseDown={handleMouseDown}
              className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors z-50"
              style={{
                backgroundColor: isResizing ? '#3b82f6' : 'transparent',
              }}
            >
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-12 bg-gray-300 rounded-l" />
            </div>
          </div>
          <WorkflowCanvas />
        </div>
      </div>
    </DndProvider>
  );
}
