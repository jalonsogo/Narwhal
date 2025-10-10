import { ToolFunction } from '../types/workflow';

// Tool definitions with descriptions extracted from cagent tool schemas
export const toolCategories = {
  filesystem: {
    name: 'Filesystem',
    description: 'File and directory operations',
    functions: [
      {
        name: 'create_directory',
        description: 'Create a new directory at the specified path',
        arguments: { path: 'string' },
      },
      {
        name: 'directory_tree',
        description: 'Get a tree view of directory structure',
        arguments: { path: 'string', max_depth: 'number (optional)' },
      },
      {
        name: 'edit_file',
        description: 'Edit a file by replacing old text with new text',
        arguments: { path: 'string', edits: 'array of {oldText, newText}' },
      },
      {
        name: 'get_file_info',
        description: 'Get metadata information about a file',
        arguments: { path: 'string' },
      },
      {
        name: 'list_allowed_directories',
        description: 'List all directories the agent has access to',
        arguments: {},
      },
      {
        name: 'add_allowed_directory',
        description: 'Add a new directory to the allowed list',
        arguments: { path: 'string', reason: 'string', confirmed: 'boolean (optional)' },
      },
      {
        name: 'list_directory',
        description: 'List files and subdirectories in a directory',
        arguments: { path: 'string' },
      },
      {
        name: 'list_directory_with_sizes',
        description: 'List directory contents with file sizes',
        arguments: { path: 'string' },
      },
      {
        name: 'move_file',
        description: 'Move or rename a file from source to destination',
        arguments: { source: 'string', destination: 'string' },
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        arguments: { path: 'string' },
      },
      {
        name: 'read_multiple_files',
        description: 'Read multiple files at once',
        arguments: { paths: 'array of strings', json: 'boolean (optional)' },
      },
      {
        name: 'search_files',
        description: 'Search for files matching a pattern',
        arguments: { path: 'string', pattern: 'string', excludePatterns: 'array of strings (optional)' },
      },
      {
        name: 'search_files_content',
        description: 'Search for content within files',
        arguments: { path: 'string', query: 'string', is_regex: 'boolean (optional)', excludePatterns: 'array of strings (optional)' },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        arguments: { path: 'string', content: 'string' },
      },
    ] as ToolFunction[],
  },
  memory: {
    name: 'Memory',
    description: 'Agent memory management',
    functions: [
      {
        name: 'add_memory',
        description: 'Add a new memory entry',
        arguments: { memory: 'string' },
      },
      {
        name: 'get_memories',
        description: 'Retrieve all stored memories',
        arguments: {},
      },
      {
        name: 'delete_memory',
        description: 'Delete a specific memory by ID',
        arguments: { id: 'string' },
      },
    ] as ToolFunction[],
  },
  shell: {
    name: 'Shell',
    description: 'Command execution',
    functions: [
      {
        name: 'shell',
        description: 'Execute a shell command',
        arguments: { cmd: 'string', cwd: 'string' },
      },
    ] as ToolFunction[],
  },
  fetch: {
    name: 'Fetch',
    description: 'Web content retrieval',
    functions: [
      {
        name: 'fetch',
        description: 'Fetch content from URLs',
        arguments: { urls: 'array of strings', format: 'text | markdown | html', timeout: 'number (optional)' },
      },
    ] as ToolFunction[],
  },
  think: {
    name: 'Think',
    description: 'Internal reasoning',
    functions: [
      {
        name: 'think',
        description: 'Record internal thoughts and reasoning',
        arguments: { thought: 'string' },
      },
    ] as ToolFunction[],
  },
  todo: {
    name: 'Todo',
    description: 'Task management',
    functions: [
      {
        name: 'create_todo',
        description: 'Create a single todo item',
        arguments: { description: 'string' },
      },
      {
        name: 'create_todos',
        description: 'Create multiple todo items at once',
        arguments: { todos: 'array of {description}' },
      },
      {
        name: 'update_todo',
        description: 'Update a todo item status',
        arguments: { id: 'string', status: 'string' },
      },
      {
        name: 'list_todos',
        description: 'List all todo items',
        arguments: {},
      },
    ] as ToolFunction[],
  },
  transfer: {
    name: 'Transfer',
    description: 'Task delegation',
    functions: [
      {
        name: 'transfer_task',
        description: 'Transfer a task to another agent',
        arguments: { agent: 'string', task: 'string', expected_output: 'string' },
      },
    ] as ToolFunction[],
  },
  script: {
    name: 'Script',
    description: 'Script execution',
    functions: [
      {
        name: 'script',
        description: 'Execute a script',
        arguments: {},
      },
    ] as ToolFunction[],
  },
};

// Helper function to get all functions for a tool category
export function getToolFunctions(toolName: string): ToolFunction[] {
  const category = Object.values(toolCategories).find(
    cat => cat.name.toLowerCase() === toolName.toLowerCase()
  );
  return category?.functions || [];
}

// Helper function to get function details
export function getToolFunctionDetails(functionName: string): ToolFunction | null {
  for (const category of Object.values(toolCategories)) {
    const func = category.functions.find(f => f.name === functionName);
    if (func) return func;
  }
  return null;
}
