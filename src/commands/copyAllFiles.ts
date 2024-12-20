import * as vscode from 'vscode';
import * as path from 'path';
import { FILE_HEADER_DECORATION } from '../utils';

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
                const contentBuilder: string[] = [];

                for (const uri of openEditors) {
                    const document = await vscode.workspace.openTextDocument(uri);
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                    const rootPath = workspaceFolder ? workspaceFolder.uri.fsPath : '';
                    const relativePath = rootPath ? path.relative(rootPath, document.fileName) : path.basename(document.fileName);

                    // Use relativePath instead of just fileName
                    contentBuilder.push(FILE_HEADER_DECORATION);
                    contentBuilder.push(`File: ${relativePath}\n`);
                    contentBuilder.push(FILE_HEADER_DECORATION);
                    contentBuilder.push("\n");
                    contentBuilder.push(document.getText());
                    contentBuilder.push('\n\n');
                }

                const combinedContent = contentBuilder.join('');

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
