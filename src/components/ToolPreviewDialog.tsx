import * as Dialog from '@radix-ui/react-dialog';
import { X, Wrench, Plus } from 'lucide-react';
import { ToolFunction } from '../types/workflow';
import { toolCategories } from '../data/toolDefinitions';
import { Button } from './ui/button';

interface ToolPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  onAddToCanvas: (toolName: string) => void;
}

export function ToolPreviewDialog({ isOpen, onClose, toolName, onAddToCanvas }: ToolPreviewDialogProps) {
  // Find the category that matches the tool name
  const category = Object.values(toolCategories).find(
    cat => cat.name.toLowerCase() === toolName.toLowerCase()
  );

  if (!category) {
    return null;
  }

  const handleAddToCanvas = () => {
    onAddToCanvas(toolName);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  {category.name}
                </Dialog.Title>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Functions List */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Available Functions ({category.functions.length})
              </h3>
              <p className="text-xs text-gray-500">
                This tool provides the following functions that can be used by agents
              </p>
            </div>

            <div className="space-y-3">
              {category.functions.map((func: ToolFunction, index: number) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-mono text-xs font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-mono text-sm font-semibold text-gray-900 mb-1">
                        {func.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">{func.description}</p>

                      {/* Arguments */}
                      {Object.keys(func.arguments).length > 0 && (
                        <div className="bg-white rounded border border-gray-200 p-2 mt-2">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Arguments
                          </div>
                          <div className="space-y-1">
                            {Object.entries(func.arguments).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-2 text-xs">
                                <span className="font-mono font-semibold text-blue-600 whitespace-nowrap">
                                  {key}:
                                </span>
                                <span className="font-mono text-gray-600">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Add this tool to the canvas to use it in your workflow
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                onClick={handleAddToCanvas}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add to Canvas
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
