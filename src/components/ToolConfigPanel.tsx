import * as Dialog from '@radix-ui/react-dialog';
import { X, Wrench, Save } from 'lucide-react';
import { WorkflowNode, ToolFunction } from '../types/workflow';
import { toolCategories } from '../data/toolDefinitions';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { useState } from 'react';
import * as Switch from '@radix-ui/react-switch';

interface ToolConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  node: WorkflowNode;
  onSave: (nodeId: string, config: any) => void;
}

export function ToolConfigPanel({ isOpen, onClose, node, onSave }: ToolConfigPanelProps) {
  // Find the category that matches the tool name
  const category = Object.values(toolCategories).find(
    cat => cat.name.toLowerCase() === node.name.toLowerCase()
  );

  // Initialize enabled functions and their configurations
  const [enabledFunctions, setEnabledFunctions] = useState<Record<string, boolean>>(
    node.data?.functions?.reduce((acc, func) => {
      acc[func.name] = true;
      return acc;
    }, {} as Record<string, boolean>) || {}
  );

  const [functionConfigs, setFunctionConfigs] = useState<Record<string, Record<string, any>>>(
    node.data?.functions?.reduce((acc, func) => {
      acc[func.name] = func.arguments;
      return acc;
    }, {} as Record<string, Record<string, any>>) || {}
  );

  if (!category) {
    return null;
  }

  const handleToggleFunction = (functionName: string) => {
    setEnabledFunctions(prev => ({
      ...prev,
      [functionName]: !prev[functionName]
    }));
  };

  const handleConfigChange = (functionName: string, argName: string, value: string) => {
    setFunctionConfigs(prev => ({
      ...prev,
      [functionName]: {
        ...(prev[functionName] || {}),
        [argName]: value
      }
    }));
  };

  const handleSave = () => {
    // Build the configuration object
    const enabledFunctionsList: ToolFunction[] = category.functions
      .filter(func => enabledFunctions[func.name])
      .map(func => ({
        name: func.name,
        description: func.description,
        arguments: functionConfigs[func.name] || func.arguments
      }));

    onSave(node.id, {
      scope: category.description,
      functions: enabledFunctionsList,
    });
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[700px] max-h-[85vh] overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Configure {category.name}
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

          {/* Functions Configuration */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Enable/Disable Functions
              </h3>
              <p className="text-xs text-gray-500">
                Toggle functions and configure their parameters
              </p>
            </div>

            <div className="space-y-4">
              {category.functions.map((func: ToolFunction, index: number) => {
                const isEnabled = enabledFunctions[func.name] || false;
                const hasArgs = Object.keys(func.arguments).length > 0;

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 transition-all ${
                      isEnabled
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Function Header with Toggle */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-green-700 font-mono text-xs font-bold">
                              {index + 1}
                            </span>
                          </span>
                          <h4 className="font-mono text-sm font-semibold text-gray-900">
                            {func.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 ml-8">{func.description}</p>
                      </div>

                      {/* Toggle Switch */}
                      <Switch.Root
                        checked={isEnabled}
                        onCheckedChange={() => handleToggleFunction(func.name)}
                        className={`w-11 h-6 rounded-full transition-colors ${
                          isEnabled ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                      </Switch.Root>
                    </div>

                    {/* Arguments Configuration (only show if enabled and has arguments) */}
                    {isEnabled && hasArgs && (
                      <div className="ml-8 mt-3 p-3 bg-white rounded border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Configure Arguments
                        </div>
                        <div className="space-y-3">
                          {Object.entries(func.arguments).map(([argName, argType]) => {
                            const currentValue = functionConfigs[func.name]?.[argName] || '';
                            const isOptional = String(argType).includes('optional');

                            return (
                              <div key={argName} className="space-y-1.5">
                                <Label htmlFor={`${func.name}-${argName}`} className="text-xs">
                                  <span className="font-mono font-semibold text-blue-600">
                                    {argName}
                                  </span>
                                  <span className="text-gray-500 ml-2">
                                    {String(argType)}
                                  </span>
                                  {isOptional && (
                                    <span className="ml-1 text-gray-400 text-[10px]">(optional)</span>
                                  )}
                                </Label>
                                <input
                                  id={`${func.name}-${argName}`}
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) => handleConfigChange(func.name, argName, e.target.value)}
                                  placeholder={`Enter ${argName}...`}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {Object.values(enabledFunctions).filter(Boolean).length} of {category.functions.length} functions enabled
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save Configuration
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
