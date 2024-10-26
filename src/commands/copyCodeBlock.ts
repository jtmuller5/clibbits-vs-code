import * as vscode from 'vscode';

export class CopyCodeBlockCommand {
    public static readonly commandName = 'clibbits.copyCodeBlock';

    private static findBlockBoundaries(document: vscode.TextDocument, lineNumber: number): { startLine: number; endLine: number } | undefined {
        // First, find the line containing the opening brace
        let startLine = lineNumber;
        let foundOpenBrace = false;
        
        // Search up until we find a line with an opening brace
        while (startLine >= 0) {
            const line = document.lineAt(startLine).text;
            if (line.includes('{')) {
                foundOpenBrace = true;
                break;
            }
            // Stop if we hit a closing brace while searching up
            if (line.includes('}')) {
                return undefined;
            }
            startLine--;
        }

        if (!foundOpenBrace) {
            return undefined;
        }

        // Now search for the matching closing brace
        let endLine = startLine;
        let braceCount = 0;
        const maxLines = document.lineCount - 1;

        while (endLine <= maxLines) {
            const lineText = document.lineAt(endLine).text;
            
            // Count braces on this line
            const openBraces = (lineText.match(/{/g) || []).length;
            const closeBraces = (lineText.match(/}/g) || []).length;
            
            braceCount += openBraces;
            braceCount -= closeBraces;

            // If we've found the matching closing brace
            if (braceCount === 0 && closeBraces > 0) {
                break;
            }

            // Prevent infinite loops in malformed files
            if (endLine - startLine > 1000) {
                return undefined;
            }

            endLine++;
        }

        // If we couldn't find a matching closing brace
        if (endLine > maxLines || braceCount !== 0) {
            return undefined;
        }

        // Find the real start of the block (including function declaration)
        while (startLine > 0) {
            const previousLine = document.lineAt(startLine - 1).text.trim();
            // Stop if we hit an empty line or another closing brace
            if (previousLine === '' || previousLine.includes('}')) {
                break;
            }
            startLine--;
        }

        return { startLine, endLine };
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerTextEditorCommand(
            this.commandName,
            async (textEditor: vscode.TextEditor) => {
                try {
                    const document = textEditor.document;
                    const position = textEditor.selection.active;
                    
                    // Find the block boundaries
                    const boundaries = this.findBlockBoundaries(document, position.line);
                    
                    if (!boundaries) {
                        vscode.window.showInformationMessage('No code block detected at cursor position.');
                        return;
                    }

                    // Extract the text from the detected block
                    const startPos = new vscode.Position(boundaries.startLine, 0);
                    const endPos = new vscode.Position(
                        boundaries.endLine, 
                        document.lineAt(boundaries.endLine).text.length
                    );
                    const blockText = document.getText(new vscode.Range(startPos, endPos));

                    if (!blockText.trim()) {
                        vscode.window.showInformationMessage('No code block detected at cursor position.');
                        return;
                    }

                    // Copy to clipboard
                    await vscode.env.clipboard.writeText(blockText);
                    
                    // Show success message with the first line of the copied block
                    const firstLine = blockText.split('\n')[0].trim();
                    const previewText = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
                    vscode.window.showInformationMessage(`Copied block: ${previewText}`);

                    // Briefly highlight the copied block for visual feedback
                    const decoration = vscode.window.createTextEditorDecorationType({
                        backgroundColor: new vscode.ThemeColor('editor.selectionHighlightBackground'),
                    });
                    
                    textEditor.setDecorations(decoration, [new vscode.Range(startPos, endPos)]);
                    
                    // Remove the highlight after a short delay
                    setTimeout(() => {
                        decoration.dispose();
                    }, 500);

                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to copy code block: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }
        );
    }
}