import * as vscode from "vscode";
import * as path from "path";
import {
  FILE_HEADER_DECORATION,
  extractTextHighlights,
  formatHighlightedDocumentContent,
} from "../utils";

export class CopyFileHighlightsCommand {
  public static readonly commandName = "clibbits.copyFileHighlights";

  /**
   * Extracts all code blocks that are surrounded by lines containing "!clibbits"
   * Each block starts after a line with "!clibbits" and ends before the next line with "!clibbits"
   */
  private static extractHighlightedBlocks = extractTextHighlights;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
      this.commandName,
      async (uri: vscode.Uri, selectedFiles: vscode.Uri[]) => {
        try {
          let urisToProcess: vscode.Uri[] = [];

          // Check if this is a multi-selection context menu action
          if (selectedFiles && Array.isArray(selectedFiles)) {
            urisToProcess = selectedFiles;
          }
          // Single file from explorer context menu
          else if (uri) {
            urisToProcess = [uri];
          }
          // Called from command palette - use active editor
          else if (vscode.window.activeTextEditor) {
            urisToProcess = [vscode.window.activeTextEditor.document.uri];
          }

          if (urisToProcess.length === 0) {
            vscode.window.showInformationMessage("No files selected.");
            return;
          }

          const contentBuilder: string[] = [];
          let successfulCopies = 0;
          let totalSize = 0;

          for (const fileUri of urisToProcess) {
            try {
              const document = await vscode.workspace.openTextDocument(fileUri);
              const highlightedContent = extractTextHighlights(document);

              // Skip files that don't have any highlighted blocks
              if (!highlightedContent.trim()) {
                continue;
              }

              // Add file separator if this isn't the first file
              if (successfulCopies > 0) {
                contentBuilder.push("\n\n");
              }

              const workspaceFolder =
                vscode.workspace.getWorkspaceFolder(fileUri);
              contentBuilder.push(
                formatHighlightedDocumentContent(document, workspaceFolder)
              );

              successfulCopies++;
              totalSize += highlightedContent.length;

              // Check if we're exceeding a reasonable size limit (e.g., 5MB)
              if (totalSize > 5 * 1024 * 1024) {
                throw new Error("Combined file size exceeds 5MB limit");
              }
            } catch (error) {
              vscode.window.showWarningMessage(
                `Failed to copy highlights from ${path.basename(
                  fileUri.fsPath
                )}: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }
          }

          if (successfulCopies > 0) {
            await vscode.env.clipboard.writeText(contentBuilder.join(""));

            const message =
              successfulCopies === 1
                ? `Successfully copied highlights from ${path.basename(
                    urisToProcess[0].fsPath
                  )} to clipboard.`
                : `Successfully copied highlights from ${successfulCopies} files to clipboard.`;

            vscode.window.showInformationMessage(message);
          } else {
            vscode.window.showInformationMessage(
              "No highlighted blocks found in the selected file(s). Add '!clibbits' markers around code you want to highlight."
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to copy highlights: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  }
}
