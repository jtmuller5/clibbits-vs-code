import * as vscode from "vscode";

/**
 * CodeLensProvider that adds a "New" button to all files
 */
export class PromptCodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // Watch for changes to prompt files
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });

    // Listen for the refreshCodeLens command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('clibbits.refreshCodeLens', () => {
        this._onDidChangeCodeLenses.fire();
      })
    );
  }

  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    this.codeLenses = [];
    const firstLine = document.lineAt(0);
    const range = new vscode.Range(firstLine.range.start, firstLine.range.end);

    // Add "New" button to all files
    const newLens = new vscode.CodeLens(range);
    newLens.command = {
      title: "✨ New",
      tooltip: "Create a new Clibbit",
      command: "clibbits.createClibbit",
      arguments: [],
    };
    this.codeLenses.push(newLens);

    return this.codeLenses;
  }
}
