import * as vscode from "vscode";

interface Snippet {
  name: string;
  snippet: string;
  usageCount: number;
  lastUsed?: number;
}

let snippets: Snippet[] = [];

function log(message: string) {
  console.log(`[Clibbits] ${message}`);
}

function loadSnippets(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("clibbits");
  const configSnippets: { name: string; snippet: string }[] = config.get("snippets") || [];

  // Load snippets from configuration (which can be workspace-specific)
  const configSnippetsWithCount: Snippet[] = configSnippets.map((s) => ({
    ...s,
    usageCount: 0,
  }));

  // Load usage statistics
  const usageStats: { [key: string]: { count: number; lastUsed?: number } } =
    context.globalState.get("clibbitsUsageStats") || {};

  // Merge configuration snippets with usage statistics
  snippets = configSnippetsWithCount.map((s) => ({
    ...s,
    usageCount: usageStats[s.name]?.count || 0,
    lastUsed: usageStats[s.name]?.lastUsed,
  }));

  log("Snippets reloaded");
}

async function addSnippet(context: vscode.ExtensionContext, name: string, snippet: string) {
  const config = vscode.workspace.getConfiguration("clibbits");
  const currentSnippets: { name: string; snippet: string }[] = config.get("snippets") || [];
  currentSnippets.push({ name, snippet });

  await config.update("snippets", currentSnippets, vscode.ConfigurationTarget.Workspace);
  vscode.window.showInformationMessage(
    `Snippet "${name}" added successfully to workspace settings.`
  );

  loadSnippets(context);
}

export function activate(context: vscode.ExtensionContext) {
  log("Clibbits extension is now active!");

  loadSnippets(context);

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("clibbits.snippets")) {
        loadSnippets(context);
        vscode.window.showInformationMessage(
          "Clibbits snippets have been updated from settings."
        );
      }
    })
  );

  // Helper function to register a command only if it doesn't already exist
  async function registerCommandOnce(commandId: string, callback: (...args: any[]) => any) {
    if (await vscode.commands.getCommands().then(commands => !commands.includes(commandId))) {
      let disposable = vscode.commands.registerCommand(commandId, callback);
      context.subscriptions.push(disposable);
    } else {
      log(`Command ${commandId} already registered, skipping.`);
    }
  }

  // Register commands using the helper function
  registerCommandOnce("clibbits.openSnippetMenu", async () => {
    try {
      if (snippets.length === 0) {
        vscode.window.showInformationMessage(
          'No snippets available. Add some in the settings.json file under "clibbits.snippets"!'
        );
        return;
      }

      // Sort snippets by usage count
      snippets.sort((a, b) => b.usageCount - a.usageCount);

      const snippetOptions = snippets.map((s) => s.name);
      const selected = await vscode.window.showQuickPick(snippetOptions, {
        placeHolder: "Select a snippet to copy",
      });

      if (selected) {
        const snippet = snippets.find((s) => s.name === selected);
        if (snippet) {
          await vscode.env.clipboard.writeText(snippet.snippet);
          vscode.window.showInformationMessage(
            `Copied "${selected}" snippet to clipboard.`
          );
          log(`Snippet "${selected}" copied to clipboard.`);

          // Update usage statistics
          snippet.usageCount++;
          snippet.lastUsed = Date.now();

          const usageStats: { [key: string]: { count: number; lastUsed?: number } } =
            context.globalState.get("clibbitsUsageStats") || {};
          usageStats[snippet.name] = {
            count: snippet.usageCount,
            lastUsed: snippet.lastUsed,
          };
          await context.globalState.update("clibbitsUsageStats", usageStats);
        }
      }
    } catch (error) {
      log(`Error in openSnippetMenu command: ${error}`);
      vscode.window.showErrorMessage(`Error copying snippet: ${error}`);
    }
  });

  registerCommandOnce("clibbits.addSnippet", async () => {
    const name = await vscode.window.showInputBox({
      prompt: "Enter snippet name",
    });
    if (!name) return;

    const snippet = await vscode.window.showInputBox({
      prompt: "Enter snippet content",
    });
    if (!snippet) return;

    await addSnippet(context, name, snippet);
  });

  registerCommandOnce("clibbits.saveAsSnippet", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active text editor found.");
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      vscode.window.showErrorMessage("No text selected.");
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: "Enter a name for this snippet",
    });

    if (!name) return;

    await addSnippet(context, name, selectedText);
  });

  registerCommandOnce("clibbits.showStats", async () => {
    const panel = vscode.window.createWebviewPanel(
      "clibbitsStats",
      "Clibbits Snippet Statistics",
      vscode.ViewColumn.One,
      {}
    );

    const statsHtml = getStatsHtml(snippets);
    panel.webview.html = statsHtml;
  });

  log("Clibbits extension activation completed.");
}

function getStatsHtml(snippets: Snippet[]): string {
  const sortedSnippets = [...snippets].sort(
    (a, b) => b.usageCount - a.usageCount
  );
  const snippetRows = sortedSnippets
    .map(
      (s) => `
        <tr>
            <td>${s.name}</td>
            <td>${s.usageCount}</td>
            <td>${
              s.lastUsed ? new Date(s.lastUsed).toLocaleString() : "Never"
            }</td>
        </tr>
    `
    )
    .join("");

  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Clibbits Snippet Statistics</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                tr:nth-child(even) { background-color: #AEAEAE; }
            </style>
        </head>
        <body>
            <h1>Clibbits Snippet Statistics</h1>
            <table>
                <tr>
                    <th>Snippet Name</th>
                    <th>Usage Count</th>
                    <th>Last Used</th>
                </tr>
                ${snippetRows}
            </table>
        </body>
        </html>
    `;
}

export function deactivate() {
  log("Clibbits extension is being deactivated.");
}