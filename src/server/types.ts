/** Parsed shape of a .clibbits YAML config file */
export interface ClibbitConfigFile {
  project?: string;
  vocabulary?: string[];
  files?: Record<string, string>; // alias → relative path
  directories?: string[];
  commands?: Record<string, string>; // alias → shell command
}

/** A single command execution captured via Shell Integration */
export interface TerminalCommandRecord {
  command: string;
  cwd: string | undefined;
  startedAt: number;
  endedAt: number | undefined;
  exitCode: number | undefined;
  output: string;
}

/** Per-terminal state exposed by the context server */
export interface TrackedTerminal {
  name: string;
  pid: number | undefined;
  cwd: string | undefined;
  isActive: boolean;
  history: TerminalCommandRecord[];
}

/** GET /context — full workspace context */
export interface FullContextResponse {
  workspace: WorkspaceInfo;
  activeEditor: ActiveEditorInfo | null;
  openFiles: string[];
  recentFiles: string[];
  git: GitInfo | null;
  projectConfig: ClibbitConfigFile | null;
  activeTerminal: TrackedTerminal | null;
  terminals: TrackedTerminal[];
  vocabulary: string[];
  symbols: SymbolInfo[];
}

/** GET /context/light — minimal context for fast polling */
export interface LightContextResponse {
  workspace: string | undefined;
  activeFile: string | null;
  activeLanguage: string | null;
  vocabulary: string[];
}

/** GET /context/terminal — terminal-focused context */
export interface TerminalContextResponse {
  activeTerminal: TrackedTerminal | null;
  terminals: TrackedTerminal[];
}

export interface WorkspaceInfo {
  name: string | undefined;
  rootPath: string | undefined;
  workspaceFolders: string[];
}

export interface ActiveEditorInfo {
  filePath: string;
  relativePath: string;
  languageId: string;
  lineCount: number;
  cursorLine: number;
  cursorColumn: number;
  selectedText: string | null;
  visibleRange: { startLine: number; endLine: number } | null;
  isDirty: boolean;
}

export interface GitInfo {
  branch: string | null;
  changedFiles: string[];
}

export interface SymbolInfo {
  name: string;
  kind: string;
  range: { startLine: number; endLine: number };
}

/** POST /command/* request bodies */
export interface OpenCommandBody {
  file?: string; // alias, path, or fuzzy match
}

export interface NavigateCommandBody {
  line?: number;
  symbol?: string;
  relative?: "up" | "down";
  lines?: number;
}

export interface InsertCommandBody {
  text: string;
  position?: "cursor" | "above" | "below" | "replace";
}

export interface TerminalCommandBody {
  text: string;
  terminal?: string; // terminal name
}

export interface ExecuteCommandBody {
  command: string;
  args?: unknown[];
}

export interface EditorCommandBody {
  action: "save" | "close" | "split" | "format" | "undo" | "redo";
}

export interface SearchCommandBody {
  query: string;
  type?: "text" | "symbol" | "file";
}
