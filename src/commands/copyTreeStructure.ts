import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class CopyTreeStructureCommand {
    public static readonly commandName = 'clibbits.copyTreeStructure';

    private static async generateTree(
        folderPath: string, 
        indent: string = '', 
        isLast: boolean = true,
        excludePatterns: RegExp[] = []
    ): Promise<string> {
        const baseName = path.basename(folderPath);
        
        // Skip excluded patterns
        if (excludePatterns.some(pattern => pattern.test(folderPath))) {
            return '';
        }

        let tree = '';

        try {
            const stats = await fs.promises.stat(folderPath);

            if (stats.isFile()) {
                // For files, just add the name
                tree = `${indent}${isLast ? '└── ' : '├── '}${baseName}\n`;
            } else if (stats.isDirectory()) {
                // For directories, add the name and process contents
                tree = `${indent}${isLast ? '└── ' : '├── '}${baseName}/\n`;

                // Read directory contents
                const files = await fs.promises.readdir(folderPath);
                const validFiles = files.filter(file => !excludePatterns.some(pattern => 
                    pattern.test(path.join(folderPath, file))
                ));

                // Sort directories first, then files
                const sortedFiles = await Promise.all(validFiles.map(async file => {
                    const fullPath = path.join(folderPath, file);
                    const stats = await fs.promises.stat(fullPath);
                    return {
                        name: file,
                        isDirectory: stats.isDirectory()
                    };
                }));

                sortedFiles.sort((a, b) => {
                    if (a.isDirectory === b.isDirectory) {
                        return a.name.localeCompare(b.name);
                    }
                    return b.isDirectory ? 1 : -1;
                });

                // Process each item
                for (let i = 0; i < sortedFiles.length; i++) {
                    const file = sortedFiles[i];
                    const fullPath = path.join(folderPath, file.name);
                    const newIndent = indent + (isLast ? '    ' : '│   ');
                    const isLastItem = i === sortedFiles.length - 1;

                    tree += await this.generateTree(fullPath, newIndent, isLastItem, excludePatterns);
                }
            }
        } catch (error) {
            console.error(`Error processing ${folderPath}:`, error);
        }

        return tree;
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
                    if (!stats.isDirectory() && !stats.isFile()) {
                        vscode.window.showInformationMessage('Selected item is neither a folder nor a file.');
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
                        title: "Generating tree structure...",
                        cancellable: false
                    }, async (progress) => {
                        const tree = await this.generateTree(uri.fsPath, '', true, excludePatterns);
                        
                        if (!tree) {
                            vscode.window.showInformationMessage('No structure to copy.');
                            return;
                        }

                        // Add a header with the root folder/file name
                        const header = `Structure of ${path.basename(uri.fsPath)}:\n`;
                        const fullTree = header + tree;

                        await vscode.env.clipboard.writeText(fullTree);
                        vscode.window.showInformationMessage(
                            `Successfully copied tree structure of ${path.basename(uri.fsPath)}`
                        );
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to copy tree structure: ${
                            error instanceof Error ? error.message : 'Unknown error'
                        }`
                    );
                }
            }
        );
    }
}