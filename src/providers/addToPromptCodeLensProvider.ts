import * as vscode from 'vscode';

export class AddToClibbitCodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
  private outputChannel: vscode.OutputChannel;

  constructor() {
    // Create output channel for logging
    this.outputChannel = vscode.window.createOutputChannel('Clibbits: Code Lens');
    this.outputChannel.appendLine('Code lens provider initialized');
    
    // Refresh code lenses when text selection changes
    vscode.window.onDidChangeTextEditorSelection(this._onSelectionChanged, this);
    
    // Also refresh when configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('clibbits.enableCodeLens')) {
        this.outputChannel.appendLine('Configuration changed for clibbits.enableCodeLens');
        this._onDidChangeCodeLenses.fire();
      }
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    this.outputChannel.appendLine(`Providing code lenses for ${document.fileName}`);
    
    // Check if code lens is enabled in configuration
    const config = vscode.workspace.getConfiguration('clibbits');
    const isEnabled = config.get<boolean>('enableCodeLens', true);
    
    if (!isEnabled) {
      this.outputChannel.appendLine('Code lens disabled in configuration');
      return [];
    }
    
    if (vscode.window.activeTextEditor?.document !== document) {
      this.outputChannel.appendLine('Document is not active editor');
      return [];
    }

    this.codeLenses = [];
    const selection = vscode.window.activeTextEditor.selection;

    // Only provide code lens if there's a non-empty selection
    if (selection && !selection.isEmpty) {
      this.outputChannel.appendLine(`Selection found: Line ${selection.start.line}-${selection.end.line}`);
      
      // Create a code lens at the start of the selection line
      const startLine = selection.start.line;
      const position = new vscode.Position(startLine, 0);
      const codeLensRange = new vscode.Range(position, position);

      // Create the code lens with a command to add the selection to a prompt file
      const codeLens = new vscode.CodeLens(codeLensRange, {
        title: "Add selection to Clibbit",
        command: "clibbits.addToClibbit",
        tooltip: "Add this selection to a Clibbits clibbit"
      });

      this.codeLenses.push(codeLens);
      this.outputChannel.appendLine(`Added code lens at line ${startLine}`);
    } else {
      this.outputChannel.appendLine('No selection or empty selection');
    }

    return this.codeLenses;
  }

  private _onSelectionChanged(e: vscode.TextEditorSelectionChangeEvent): void {
    const hasSelection = e.selections.some(sel => !sel.isEmpty);
    this.outputChannel.appendLine(`Selection changed, has non-empty selection: ${hasSelection}`);
    
    if (hasSelection) {
      // Notify that code lenses should be refreshed when selection changes
      this._onDidChangeCodeLenses.fire();
      this.outputChannel.appendLine('Fired onDidChangeCodeLenses event');
    }
  }
}
