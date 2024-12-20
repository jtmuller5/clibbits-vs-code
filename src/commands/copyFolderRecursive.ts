import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class CopyFolderRecursiveCommand {
    public static readonly commandName = 'clibbits.copyFolderRecursive';

    private static async collectFiles(folderPath: string, excludePatterns: RegExp[] = []): Promise<string[]> {
        const results: string[] = [];

        try {
            const files = await fs.promises.readdir(folderPath);

            for (const file of files) {
                const fullPath = path.join(folderPath, file);
                const stats = await fs.promises.stat(fullPath);

                // Skip files/folders that match exclude patterns
                if (excludePatterns.some(pattern => pattern.test(fullPath))) {
                    continue;
                }

                if (stats.isDirectory()) {
                    // Recursively process subdirectories
                    const subFiles = await this.collectFiles(fullPath, excludePatterns);
                    results.push(...subFiles);
                } else {
                    // Only include text files
                    const ext = path.extname(file).toLowerCase();
                    const isTextFile = !['.exe', '.dll', '.jpg', '.png', '.gif', '.ico', '.bin'].includes(ext);

                    if (isTextFile) {
                        results.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing ${folderPath}:`, error);
        }

        return results;
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand(
            this.commandName,
            async (uri: vscode.Uri) => {
                try {
                    if (!uri) {
                        vscode.window.showInformationMessage('No folder selected.');
                        return;
                    }

                    const stats = await fs.promises.stat(uri.fsPath);
                    if (!stats.isDirectory()) {
                        vscode.window.showInformationMessage('Selected item is not a folder.');
                        return;
                    }

                    // Default exclude patterns
                    const excludePatterns = [
                        /[\\/]node_modules[\\/]/,
                        /[\\/]\.git[\\/]/,
                        /[\\/]\.vscode[\\/]/,
                        /[\\/]out[\\/]/,
                        /[\\/]dist[\\/]/,
                        /[\\/]build[\\/]/
                    ];

                    // Show progress indicator
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: "Collecting files...",
                        cancellable: false
                    }, async (progress) => {
                        // Collect all valid file paths
                        const filePaths = await this.collectFiles(uri.fsPath, excludePatterns);

                        if (filePaths.length === 0) {
                            vscode.window.showInformationMessage('No text files found in the selected folder.');
                            return;
                        }

                        let combinedContent = '';
                        let processedFiles = 0;
                        let totalSize = 0;

                        for (const filePath of filePaths) {
                            try {
                                const content = await fs.promises.readFile(filePath, 'utf8');
                                const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                                const rootPath = workspaceFolder ? workspaceFolder.uri.fsPath : '';
                                // Derive relative path from the workspace root
                                const relativePath = rootPath ? path.relative(rootPath, filePath) : path.relative(uri.fsPath, filePath);

                                // Add separator between files
                                if (processedFiles > 0) {
                                    combinedContent += '\n';
                                }

                                combinedContent += `${'='.repeat(80)}\n`;
                                combinedContent += `File: ${relativePath}\n`;
                                combinedContent += `${'='.repeat(80)}\n\n`;
                                combinedContent += `${content}\n`;

                                processedFiles++;
                                totalSize += content.length;

                                // Check size limit (5MB)
                                if (totalSize > 5 * 1024 * 1024) {
                                    throw new Error('Combined file size exceeds 5MB limit');
                                }

                                progress.report({
                                    message: `Processed ${processedFiles} of ${filePaths.length} files`,
                                    increment: (1 / filePaths.length) * 100
                                });
                            } catch (error) {
                                vscode.window.showWarningMessage(
                                    `Failed to process ${path.basename(filePath)}: ${
                                        error instanceof Error ? error.message : 'Unknown error'
                                    }`
                                );
                            }
                        }

                        if (processedFiles > 0) {
                            await vscode.env.clipboard.writeText(combinedContent);
                            vscode.window.showInformationMessage(
                                `Successfully copied contents of ${processedFiles} files from ${path.basename(uri.fsPath)}`
                            );
                        }
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to copy folder contents: ${
                            error instanceof Error ? error.message : 'Unknown error'
                        }`
                    );
                }
            }
        );
    }
}