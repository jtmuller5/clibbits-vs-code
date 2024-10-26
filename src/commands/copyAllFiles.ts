import * as vscode from 'vscode';
import * as path from 'path';

export class CopyAllFilesCommand {
    public static readonly commandName = 'clibbits.copyAllFiles';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand(this.commandName, async () => {
            const openEditors = vscode.window.tabGroups.all
                .flatMap(group => group.tabs)
                .filter(tab => tab.input instanceof vscode.TabInputText)
                .map(tab => (tab.input as vscode.TabInputText).uri);

            if (openEditors.length === 0) {
                vscode.window.showInformationMessage('No files are currently open.');
                return;
            }

            try {
                let combinedContent = '';

                for (const uri of openEditors) {
                    const document = await vscode.workspace.openTextDocument(uri);
                    const fileName = path.basename(document.fileName);
                    
                    combinedContent += `\n=== ${fileName} ===\n\n`;
                    combinedContent += document.getText();
                    combinedContent += '\n\n';
                }

                await vscode.env.clipboard.writeText(combinedContent);
                
                vscode.window.showInformationMessage(
                    `Successfully copied content from ${openEditors.length} file(s) to clipboard.`
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to copy files: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        });
    }
}