import * as vscode from 'vscode';
import * as path from 'path';

/**
 * CodeLensProvider that adds buttons to files:
 * - "New" and "Search" buttons to all files
 * - "Share" and "Save" buttons only to prompt files in the .github/prompts/clibbits directory
 */
export class PromptCodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    // Watch for changes to prompt files
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  /**
   * Determine if a document is a prompt file in the correct directory
   */
  private isPromptFile(document: vscode.TextDocument): boolean {
    if (!document.uri.fsPath) {
      return false;
    }

    const filePath = document.uri.fsPath;
    return filePath.includes(path.join('.github', 'prompts', 'clibbits')) && 
           (filePath.endsWith('.md') || filePath.endsWith('.prompt.md'));
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    this.codeLenses = [];
    const firstLine = document.lineAt(0);
    const range = new vscode.Range(firstLine.range.start, firstLine.range.end);
    
    // Add "New" and "Search" buttons to all files

    // Add "New" button to all files
    const newLens = new vscode.CodeLens(range);
    newLens.command = {
      title: "✨ New",
      tooltip: "Create a new Clibbit",
      command: "clibbits.createClibbit",
      arguments: []
    };
    this.codeLenses.push(newLens);
    
    // Add "Search" button to all files
    const searchLens = new vscode.CodeLens(range);
    searchLens.command = {
      title: "🔍 Search",
      tooltip: "Search for Clibbits",
      command: "clibbits.searchClibbits",
      arguments: []
    };
    this.codeLenses.push(searchLens);

    // Add "Share" and "Save" buttons only to prompt files in the .github/prompts/clibbits directory
    if (this.isPromptFile(document)) {
      // Add "Share" button
      const shareLens = new vscode.CodeLens(range);
      shareLens.command = {
        title: "📤 Share",
        tooltip: "Share this prompt",
        command: "clibbits.shareClibbit",
        arguments: [document.uri]
      };
      this.codeLenses.push(shareLens);

      // Add "Save" button
      const saveLens = new vscode.CodeLens(range);
      saveLens.command = {
        title: "💾 Save",
        tooltip: "Export this prompt",
        command: "clibbits.exportPrompt",
        arguments: [document.uri]
      };
      this.codeLenses.push(saveLens);
    }

    return this.codeLenses;
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.CodeLens | Thenable<vscode.CodeLens> {
    return codeLens;
  }
}
