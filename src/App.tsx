import { useState, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { WorkflowSidebar } from './components/WorkflowSidebar';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { Button } from './components/ui/button';
import * as LucideIcons from 'lucide-react';

export default function App() {
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);

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
      <div className="h-screen flex bg-background relative">
        {/* Collapsed sidebar header floating over canvas */}
        {isSidebarCollapsed && (
          <div className="absolute left-0 top-0 z-50">
            <WorkflowSidebar
              isCollapsed={isSidebarCollapsed}
              onCollapseChange={setIsSidebarCollapsed}
              onCreateAgent={() => canvasRef.current?.createEmptyAgent()}
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {!isSidebarCollapsed && (
            <div style={{ width: `${sidebarWidth}px` }} className="relative flex-shrink-0">
              <WorkflowSidebar
                isCollapsed={isSidebarCollapsed}
                onCollapseChange={setIsSidebarCollapsed}
                onCreateAgent={() => canvasRef.current?.createEmptyAgent()}
              />
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
          )}
          <WorkflowCanvas ref={canvasRef} />
        </div>
      </div>
    </DndProvider>
  );
}
