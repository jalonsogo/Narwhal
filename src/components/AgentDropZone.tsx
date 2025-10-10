import { useDrop } from 'react-dnd';
import * as LucideIcons from 'lucide-react';
import { NodeTemplate } from '../types/workflow';

interface AgentDropZoneProps {
  position: { x: number; y: number };
  onDrop: (template: NodeTemplate) => void;
}

export function AgentDropZone({ position, onDrop }: AgentDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'node',
    drop: (item: NodeTemplate) => {
      if (item.type === 'agent') {
        onDrop(item);
      }
    },
    canDrop: (item: NodeTemplate) => item.type === 'agent',
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop as any}
      className="absolute"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div
        className={`w-[200px] h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all relative ${
          isOver && canDrop
            ? 'border-blue-500 bg-blue-50'
            : canDrop
            ? 'border-blue-300 bg-blue-50/30'
            : 'border-gray-300 bg-gray-50/50'
        }`}
      >
        {/* Connection points - matching node connection points */}
        <div
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-gray-300 border-dashed rounded-full"
        />
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-gray-300 border-dashed rounded-full"
        />

        <LucideIcons.Bot className={`w-8 h-8 mb-2 ${isOver && canDrop ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className={`text-sm ${isOver && canDrop ? 'text-blue-600' : 'text-gray-500'}`}>
          {isOver && canDrop ? 'Drop agent here' : 'Drop your agent here'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Agents only</p>
      </div>
    </div>
  );
}
