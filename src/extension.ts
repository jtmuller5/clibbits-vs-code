import * as vscode from 'vscode';

interface Snippet {
    name: string;
    snippet: string;
    usageCount: number;
    lastUsed?: number;
    isFromConfig?: boolean; // Flag to indicate if the snippet is from config
}

let snippets: Snippet[] = [];

function log(message: string) {
    console.log(`[Clibbits] ${message}`);
}

function loadSnippets(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('clibbits');
    const configSnippets: { name: string; snippet: string }[] = config.get('snippets') || [];
    
    // Load snippets from configuration
    const configSnippetsWithCount: Snippet[] = configSnippets.map(s => ({
        ...s,
        usageCount: 0,
        isFromConfig: true
    }));

    // Load dynamically added snippets and their usage counts
    const dynamicSnippets: Snippet[] = context.globalState.get('clibbitsSnippets', []);

    // Merge configuration snippets and dynamic snippets
    snippets = [
        ...configSnippetsWithCount,
        ...dynamicSnippets.filter(s => !s.isFromConfig) // Only keep dynamic snippets that aren't from config
    ].reduce((acc, curr) => {
        const index = acc.findIndex(s => s.name === curr.name);
        if (index >= 0) {
            // If the snippet exists, update it but keep the usage count and last used time
            acc[index] = {
                ...curr,
                usageCount: acc[index].usageCount,
                lastUsed: acc[index].lastUsed
            };
        } else {
            acc.push(curr);
        }
        return acc;
    }, [] as Snippet[]);

    // Update the global state with the new set of snippets
    context.globalState.update('clibbitsSnippets', snippets.filter(s => !s.isFromConfig));

    log('Snippets reloaded');
}

export function activate(context: vscode.ExtensionContext) {
    log('Clibbits extension is now active!');

    loadSnippets(context);

    // Watch for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('clibbits.snippets')) {
            loadSnippets(context);
            vscode.window.showInformationMessage('Clibbits snippets have been updated from settings.');
        }
    }));

    let disposable = vscode.commands.registerCommand('clibbits.openSnippetMenu', async () => {
        try {
            if (snippets.length === 0) {
                vscode.window.showInformationMessage('No snippets available. Add some in the extension settings or use the "Add New Snippet" command!');
                return;
            }

            // Sort snippets by usage count
            snippets.sort((a, b) => b.usageCount - a.usageCount);

            const snippetOptions = snippets.map(s => s.name);
            const selected = await vscode.window.showQuickPick(snippetOptions, {
                placeHolder: 'Select a snippet to copy'
            });

            if (selected) {
                const snippet = snippets.find(s => s.name === selected);
                if (snippet) {
                    await vscode.env.clipboard.writeText(snippet.snippet);
                    vscode.window.showInformationMessage(`Copied "${selected}" snippet to clipboard.`);
                    log(`Snippet "${selected}" copied to clipboard.`);

                    // Increment usage count and update last used time
                    snippet.usageCount++;
                    snippet.lastUsed = Date.now();
                    await context.globalState.update('clibbitsSnippets', snippets.filter(s => !s.isFromConfig));
                }
            }
        } catch (error) {
            log(`Error in openSnippetMenu command: ${error}`);
            vscode.window.showErrorMessage(`Error copying snippet: ${error}`);
        }
    });

    context.subscriptions.push(disposable);

    // Register a command to add new snippets
    let addSnippetCommand = vscode.commands.registerCommand('clibbits.addSnippet', async () => {
        const name = await vscode.window.showInputBox({ prompt: 'Enter snippet name' });
        if (!name) return;

        const snippet = await vscode.window.showInputBox({ prompt: 'Enter snippet content' });
        if (!snippet) return;

        const newSnippet: Snippet = { name, snippet, usageCount: 0, isFromConfig: false };
        snippets.push(newSnippet);
        await context.globalState.update('clibbitsSnippets', snippets.filter(s => !s.isFromConfig));
        vscode.window.showInformationMessage(`Snippet "${name}" added successfully.`);
    });

    context.subscriptions.push(addSnippetCommand);

    // Register a command to show snippet statistics
    let showStatsCommand = vscode.commands.registerCommand('clibbits.showStats', async () => {
        const panel = vscode.window.createWebviewPanel(
            'clibbitsStats',
            'Clibbits Snippet Statistics',
            vscode.ViewColumn.One,
            {}
        );

        const statsHtml = getStatsHtml(snippets);
        panel.webview.html = statsHtml;
    });

    context.subscriptions.push(showStatsCommand);

    log('Clibbits extension activation completed.');
}

function getStatsHtml(snippets: Snippet[]): string {
    const sortedSnippets = [...snippets].sort((a, b) => b.usageCount - a.usageCount);
    const snippetRows = sortedSnippets.map(s => `
        <tr>
            <td>${s.name}</td>
            <td>${s.usageCount}</td>
            <td>${s.lastUsed ? new Date(s.lastUsed).toLocaleString() : 'Never'}</td>
            <td>${s.isFromConfig ? 'Config' : 'Dynamic'}</td>
        </tr>
    `).join('');

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
                tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <h1>Clibbits Snippet Statistics</h1>
            <table>
                <tr>
                    <th>Snippet Name</th>
                    <th>Usage Count</th>
                    <th>Last Used</th>
                    <th>Source</th>
                </tr>
                ${snippetRows}
            </table>
        </body>
        </html>
    `;
}

export function deactivate() {
    log('Clibbits extension is being deactivated.');
}