import * as vscode from "vscode";
import * as path from "path";
import { isAuthenticated } from "../utils/authUtils";

/**
 * CodeLensProvider that adds buttons to files:
 * - "New" and "Search" buttons to all files
 * - If logged in: "Share" and "Save" buttons to prompt files
 * - If logged out: "Sign In" and "Save" buttons to prompt files
 */
export class PromptCodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;
  private context: vscode.ExtensionContext;

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.context = context; // Assign context to the instance variable first

    // Watch for changes to prompt files
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });

    // Listen for the refreshCodeLens command
    // Use this.context instead of the parameter 'context'
     this.context.subscriptions.push(
      vscode.commands.registerCommand('clibbits.refreshCodeLens', () => {
        this._onDidChangeCodeLenses.fire();
      })
    ); 
  }

  /**
   * Determine if a document is a prompt file in the correct directory
   */
  private isPromptFile(document: vscode.TextDocument): boolean {
    if (!document.uri.fsPath) {
      return false;
    }

    const filePath = document.uri.fsPath;
    return (
      filePath.includes(path.join(".github", "prompts", "clibbits")) &&
      (filePath.endsWith(".md") || filePath.endsWith(".prompt.md"))
    );
  }

  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
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
      arguments: [],
    };
    this.codeLenses.push(newLens);

    // Add "Search" button to all files
    const searchLens = new vscode.CodeLens(range);
    searchLens.command = {
      title: "🔍 Search",
      tooltip: "Search for Clibbits",
      command: "clibbits.searchClibbits",
      arguments: [],
    };
    this.codeLenses.push(searchLens);

    // Add "Share/Sign In" and "Save" buttons only to prompt files in the .github/prompts/clibbits directory
    if (this.isPromptFile(document)) {
      // Check authentication state
      const isUserAuthenticated = await isAuthenticated(this.context);

      // Add either "Share" or "Sign In" button based on authentication state
      const shareLens = new vscode.CodeLens(range);
      if (isUserAuthenticated) {
        // User is authenticated, show "Share" button
        shareLens.command = {
          title: "📤 Share",
          tooltip: "Share this prompt",
          command: "clibbits.shareClibbit",
          arguments: [document.uri],
        };
      } else {
        // User is not authenticated, show "Sign In" button
        shareLens.command = {
          title: "🔑 Sign In",
          tooltip: "Sign in to share prompts",
          command: "clibbits.signIn",
          arguments: [],
        };
      }
      this.codeLenses.push(shareLens);

      // Add "Save" button
      const saveLens = new vscode.CodeLens(range);
      saveLens.command = {
        title: "💾 Save",
        tooltip: "Export this prompt",
        command: "clibbits.exportPrompt",
        arguments: [document.uri],
      };
      this.codeLenses.push(saveLens);
    }

    return this.codeLenses;
  }
}
