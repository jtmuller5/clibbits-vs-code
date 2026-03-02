import * as vscode from "vscode";
import * as path from "path";
import { execFile } from "child_process";
import { TerminalTracker } from "./TerminalTracker";
import { ClibbitConfig } from "./ClibbitConfig";
import {
  FullContextResponse,
  LightContextResponse,
  TerminalContextResponse,
  WorkspaceInfo,
  ActiveEditorInfo,
  GitInfo,
  SymbolInfo,
} from "./types";

export class ContextAssembler {
  private recentFiles: string[] = [];
  private cachedSymbols: SymbolInfo[] = [];
  private cachedGit: { data: GitInfo | null; timestamp: number } | null = null;

  constructor(
    private terminalTracker: TerminalTracker,
    private clibbitConfig: ClibbitConfig
  ) {}

  activate(context: vscode.ExtensionContext): void {
    const maxRecent = vscode.workspace
      .getConfiguration("clibbits")
      .get<number>("maxRecentFiles", 10);

    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.uri.scheme !== "file") {
          return;
        }
        const filePath = doc.uri.fsPath;
        this.recentFiles = this.recentFiles.filter((f) => f !== filePath);
        this.recentFiles.unshift(filePath);
        if (this.recentFiles.length > maxRecent) {
          this.recentFiles.pop();
        }
      }),

      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateSymbols(editor.document.uri);
        }
      })
    );

    // Initialize symbols for current editor
    if (vscode.window.activeTextEditor) {
      this.updateSymbols(vscode.window.activeTextEditor.document.uri);
    }
  }

  async buildFullContext(): Promise<FullContextResponse> {
    const [git, vocabulary] = await Promise.all([
      this.buildGitInfo(),
      this.buildVocabulary(),
    ]);

    return {
      workspace: this.buildWorkspaceInfo(),
      activeEditor: this.buildActiveEditorInfo(),
      openFiles: this.getOpenFiles(),
      recentFiles: this.recentFiles,
      git,
      projectConfig: this.clibbitConfig.get(),
      activeTerminal: this.terminalTracker.getActiveTerminal(),
      terminals: this.terminalTracker.getAllTerminals(),
      vocabulary,
      symbols: this.cachedSymbols,
    };
  }

  buildLightContext(): LightContextResponse {
    const editor = vscode.window.activeTextEditor;
    return {
      workspace: vscode.workspace.name,
      activeFile: editor ? editor.document.uri.fsPath : null,
      activeLanguage: editor ? editor.document.languageId : null,
      vocabulary: this.buildSyncVocabulary(),
    };
  }

  buildTerminalContext(): TerminalContextResponse {
    return {
      activeTerminal: this.terminalTracker.getActiveTerminal(),
      terminals: this.terminalTracker.getAllTerminals(),
    };
  }

  async buildVocabulary(): Promise<string[]> {
    const words = new Set<string>();

    // From .clibbits config
    const config = this.clibbitConfig.get();
    if (config?.vocabulary) {
      for (const word of config.vocabulary) {
        words.add(word);
      }
    }

    // Auto-extract from symbols if enabled
    const autoVocab = vscode.workspace
      .getConfiguration("clibbits")
      .get<boolean>("autoVocabulary", true);

    if (autoVocab) {
      for (const sym of this.cachedSymbols) {
        words.add(sym.name);
      }
    }

    return Array.from(words);
  }

  async buildFileList(): Promise<
    { alias: string | null; path: string; relativePath: string }[]
  > {
    const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    const results: { alias: string | null; path: string; relativePath: string }[] =
      [];

    // From .clibbits file aliases
    const config = this.clibbitConfig.get();
    if (config?.files && rootUri) {
      for (const [alias, relPath] of Object.entries(config.files)) {
        results.push({
          alias,
          path: path.join(rootUri.fsPath, relPath),
          relativePath: relPath,
        });
      }
    }

    // Open editor files
    for (const filePath of this.getOpenFiles()) {
      const relativePath = rootUri
        ? path.relative(rootUri.fsPath, filePath)
        : filePath;
      if (!results.some((r) => r.path === filePath)) {
        results.push({ alias: null, path: filePath, relativePath });
      }
    }

    return results;
  }

  private buildWorkspaceInfo(): WorkspaceInfo {
    return {
      name: vscode.workspace.name,
      rootPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      workspaceFolders:
        vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [],
    };
  }

  private buildActiveEditorInfo(): ActiveEditorInfo | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const doc = editor.document;
    const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    const selection = editor.selection;
    const visibleRange = editor.visibleRanges[0];

    return {
      filePath: doc.uri.fsPath,
      relativePath: rootUri
        ? path.relative(rootUri.fsPath, doc.uri.fsPath)
        : doc.uri.fsPath,
      languageId: doc.languageId,
      lineCount: doc.lineCount,
      cursorLine: selection.active.line,
      cursorColumn: selection.active.character,
      selectedText: selection.isEmpty
        ? null
        : doc.getText(selection),
      visibleRange: visibleRange
        ? {
            startLine: visibleRange.start.line,
            endLine: visibleRange.end.line,
          }
        : null,
      isDirty: doc.isDirty,
    };
  }

  private getOpenFiles(): string[] {
    return vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .map((tab) => {
        const input = tab.input;
        if (input instanceof vscode.TabInputText) {
          return input.uri.fsPath;
        }
        return null;
      })
      .filter((f): f is string => f !== null);
  }

  private async buildGitInfo(): Promise<GitInfo | null> {
    // Return cached value if fresh (< 2 seconds)
    if (this.cachedGit && Date.now() - this.cachedGit.timestamp < 2000) {
      return this.cachedGit.data;
    }

    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) {
      return null;
    }

    try {
      const [branch, changedFiles] = await Promise.all([
        this.gitExec(["branch", "--show-current"], rootPath),
        this.gitExec(["diff", "--name-only", "HEAD"], rootPath),
      ]);

      const info: GitInfo = {
        branch: branch.trim() || null,
        changedFiles: changedFiles
          .trim()
          .split("\n")
          .filter((f) => f.length > 0),
      };

      this.cachedGit = { data: info, timestamp: Date.now() };
      return info;
    } catch {
      this.cachedGit = { data: null, timestamp: Date.now() };
      return null;
    }
  }

  private gitExec(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile("git", args, { cwd, timeout: 3000 }, (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private async updateSymbols(uri: vscode.Uri): Promise<void> {
    try {
      const symbols = await vscode.commands.executeCommand<
        vscode.DocumentSymbol[]
      >("vscode.executeDocumentSymbolProvider", uri);

      if (symbols) {
        this.cachedSymbols = this.flattenSymbols(symbols);
      } else {
        this.cachedSymbols = [];
      }
    } catch {
      this.cachedSymbols = [];
    }
  }

  private flattenSymbols(
    symbols: vscode.DocumentSymbol[],
    result: SymbolInfo[] = []
  ): SymbolInfo[] {
    for (const sym of symbols) {
      result.push({
        name: sym.name,
        kind: vscode.SymbolKind[sym.kind],
        range: {
          startLine: sym.range.start.line,
          endLine: sym.range.end.line,
        },
      });
      if (sym.children.length > 0) {
        this.flattenSymbols(sym.children, result);
      }
    }
    return result;
  }

  private buildSyncVocabulary(): string[] {
    const words = new Set<string>();
    const config = this.clibbitConfig.get();
    if (config?.vocabulary) {
      for (const word of config.vocabulary) {
        words.add(word);
      }
    }
    const autoVocab = vscode.workspace
      .getConfiguration("clibbits")
      .get<boolean>("autoVocabulary", true);
    if (autoVocab) {
      for (const sym of this.cachedSymbols) {
        words.add(sym.name);
      }
    }
    return Array.from(words);
  }
}
