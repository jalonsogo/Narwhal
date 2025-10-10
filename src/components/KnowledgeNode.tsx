import { useState, useRef, useEffect } from 'react';
import { WorkflowNode, KnowledgeItem } from '../types/workflow';
import * as LucideIcons from 'lucide-react';
import { Button } from './ui/button';

interface KnowledgeNodeProps {
  node: WorkflowNode;
  onItemAdd: (nodeId: string, item: KnowledgeItem) => void;
  onItemRemove: (nodeId: string, itemId: string) => void;
  onPositionChange: (nodeId: string, x: number, y: number) => void;
}

export function KnowledgeNode({ node, onItemAdd, onItemRemove, onPositionChange }: KnowledgeNodeProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      const fileType = getFileType(file.name);
      const item: KnowledgeItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        type: fileType,
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
      };
      onItemAdd(node.id, item);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const fileType = getFileType(file.name);
      const item: KnowledgeItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        type: fileType,
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
      };
      onItemAdd(node.id, item);
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      const item: KnowledgeItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        type: 'url',
        name: extractDomainFromUrl(urlInput),
        url: urlInput,
        uploadedAt: new Date(),
      };
      onItemAdd(node.id, item);
      setUrlInput('');
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (isValidUrl(pastedText)) {
      setTimeout(() => {
        setUrlInput(pastedText);
      }, 0);
    }
  };

  const getFileType = (filename: string): 'pdf' | 'csv' | 'xlsx' | 'file' => {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    return 'file';
  };

  const isValidUrl = (str: string): boolean => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const extractDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const getItemIcon = (type: KnowledgeItem['type']) => {
    switch (type) {
      case 'pdf':
        return <LucideIcons.FileText className="w-4 h-4 text-red-600" />;
      case 'csv':
        return <LucideIcons.FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case 'xlsx':
        return <LucideIcons.FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'url':
        return <LucideIcons.Link className="w-4 h-4 text-blue-600" />;
      default:
        return <LucideIcons.File className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header
    if ((e.target as HTMLElement).closest('.knowledge-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onPositionChange(node.id, newX, newY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const items = node.knowledgeItems || [];

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg border-2 border-purple-200"
      style={{
        left: node.position.x,
        top: node.position.y,
        width: '320px',
        minHeight: '200px',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="knowledge-header bg-purple-500 px-4 py-2 rounded-t-lg flex items-center gap-2 cursor-grab active:cursor-grabbing">
        <LucideIcons.Database className="w-5 h-5 text-white" />
        <span className="text-white font-medium text-sm">Knowledge Base</span>
      </div>

      {/* Drop Zone */}
      <div
        className={`m-3 border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDraggingOver
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <LucideIcons.Upload className="w-6 h-6 text-gray-400" />
          <p className="text-xs text-gray-600">
            Drag & drop files here
          </p>
          <p className="text-xs text-gray-400">
            PDF, CSV, XLSX supported
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs"
          >
            <LucideIcons.FolderOpen className="w-3 h-3 mr-1" />
            Browse Files
          </Button>
        </div>
      </div>

      {/* URL Input */}
      <div className="mx-3 mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onPaste={handleUrlPaste}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="Paste URL here..."
            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || !isValidUrl(urlInput)}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <LucideIcons.Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="mx-3 mb-3 max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-2 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getItemIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    {item.url && (
                      <p className="text-xs text-gray-500 truncate">
                        {item.url}
                      </p>
                    )}
                    {item.size && (
                      <p className="text-xs text-gray-400">
                        {formatFileSize(item.size)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onItemRemove(node.id, item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <LucideIcons.X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">
          {items.length} {items.length === 1 ? 'item' : 'items'} • Shared with all nodes
        </p>
      </div>
    </div>
  );
}
