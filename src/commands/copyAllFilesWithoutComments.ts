import * as vscode from 'vscode';
import * as path from 'path';

export class CopyAllFilesWithoutCommentsCommand {
    public static readonly commandName = 'clibbits.copyAllFilesWithoutComments';

    /**
     * Removes comments from the given text content
     * Handles single-line comments, multi-line comments, and preserves strings
     */
    private static removeComments(text: string): string {
        // Preserve strings by temporarily replacing them
        const stringPlaceholders: string[] = [];
        const textWithoutStrings = text.replace(/(['"`])((?:\\.|[^\\])*?)\1/g, (match) => {
            stringPlaceholders.push(match);
            return `__STRING_${stringPlaceholders.length - 1}__`;
        });

        // Remove multi-line comments
        let withoutMultiLineComments = textWithoutStrings.replace(/\/\*[\s\S]*?\*\//g, '');

        // Remove single-line comments
        let withoutComments = withoutMultiLineComments.replace(/\/\/.*/g, '');

        // Restore strings
        withoutComments = withoutComments.replace(/__STRING_(\d+)__/g, (_, index) =>
            stringPlaceholders[parseInt(index)]
        );

        // Remove empty lines and normalize whitespace
        return withoutComments
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
    }

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
                let processedFiles = 0;
                let totalSize = 0;

                for (const uri of openEditors) {
                    try {
                        const document = await vscode.workspace.openTextDocument(uri);
                        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                        const rootPath = workspaceFolder ? workspaceFolder.uri.fsPath : '';
                        const relativePath = rootPath ? path.relative(rootPath, document.fileName) : path.basename(document.fileName);
                        const contentWithoutComments = this.removeComments(document.getText());

                        // Skip files that become empty after removing comments
                        if (!contentWithoutComments.trim()) {
                            continue;
                        }

                        // Add separator between files
                        if (processedFiles > 0) {
                            combinedContent += '\n\n';
                        }

                        combinedContent += `${'='.repeat(80)}\n`;
                        combinedContent += `File: ${relativePath}\n`;
                        combinedContent += `${'='.repeat(80)}\n\n`;
                        combinedContent += contentWithoutComments;

                        processedFiles++;
                        totalSize += contentWithoutComments.length;

                        // Check size limit (5MB)
                        if (totalSize > 5 * 1024 * 1024) {
                            throw new Error('Combined file size exceeds 5MB limit');
                        }
                    } catch (error) {
                        vscode.window.showWarningMessage(
                            `Failed to process ${path.basename(uri.fsPath)}: ${
                                error instanceof Error ? error.message : 'Unknown error'
                            }`
                        );
                    }
                }

                if (processedFiles > 0) {
                    await vscode.env.clipboard.writeText(combinedContent);
                    vscode.window.showInformationMessage(
                        `Successfully copied content from ${processedFiles} file(s) to clipboard (comments removed).`
                    );
                } else {
                    vscode.window.showInformationMessage('No content to copy after removing comments.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to copy files: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        });
    }
}