import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import * as LucideIcons from 'lucide-react';
import { WorkflowOutput } from '../types/workflow';

interface OutputPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  output: WorkflowOutput | null;
}

export function OutputPanel({ open, onOpenChange, output }: OutputPanelProps) {
  if (!output) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent resizable side="right" className="w-[40vw] sm:w-[40vw] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <LucideIcons.FileOutput className="w-5 h-5 text-pink-500" />
              Workflow Output
            </SheetTitle>
            <SheetDescription>
              No output available yet. Run the workflow to see results.
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <LucideIcons.PlayCircle className="w-16 h-16 text-gray-300 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Execute the workflow to see output here
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const formatExecutionTime = (ms?: number): string => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(output.response);
  };

  const handleDownloadResponse = () => {
    const blob = new Blob([output.response], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-output-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent resizable side="right" className="w-[40vw] sm:w-[40vw] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <LucideIcons.FileOutput className="w-5 h-5 text-pink-500" />
            Workflow Output
          </SheetTitle>
          <SheetDescription>
            Results from the workflow execution
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* Execution Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LucideIcons.Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Execution Time</span>
                </div>
                <Badge variant="outline">{formatExecutionTime(output.executionTime)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LucideIcons.Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Timestamp</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatTimestamp(output.timestamp)}</span>
              </div>
            </div>

            <Separator />

            {/* Response */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <LucideIcons.MessageSquare className="w-4 h-4 text-pink-500" />
                  Model Response
                </Label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyResponse}
                    title="Copy to clipboard"
                  >
                    <LucideIcons.Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadResponse}
                    title="Download as text file"
                  >
                    <LucideIcons.Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">{output.response}</pre>
              </div>
            </div>

            <Separator />

            {/* Generated Files */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <LucideIcons.Files className="w-4 h-4 text-blue-500" />
                  Generated Files ({output.generatedFiles.length})
                </Label>
              </div>

              {output.generatedFiles.length === 0 ? (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <LucideIcons.FileX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No files generated</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {output.generatedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {file.path.endsWith('.pdf') ? (
                            <LucideIcons.FileText className="w-5 h-5 text-red-600" />
                          ) : file.path.endsWith('.csv') ? (
                            <LucideIcons.FileSpreadsheet className="w-5 h-5 text-green-600" />
                          ) : file.path.endsWith('.json') ? (
                            <LucideIcons.FileJson className="w-5 h-5 text-yellow-600" />
                          ) : file.path.endsWith('.txt') ? (
                            <LucideIcons.FileText className="w-5 h-5 text-gray-600" />
                          ) : (
                            <LucideIcons.File className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate font-mono">
                            {file.path}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {file.size && (
                              <span className="text-xs text-gray-400">
                                {formatFileSize(file.size)}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(file.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(file.path);
                            }}
                            title="Copy path"
                          >
                            <LucideIcons.Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Open file location"
                          >
                            <LucideIcons.ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-6 pt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
          <Button className="flex-1">
            <LucideIcons.RefreshCw className="w-4 h-4 mr-2" />
            Run Again
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className}`}>{children}</div>;
}
