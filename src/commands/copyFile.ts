import * as vscode from "vscode";
import * as path from "path";
import {
  extractTextExcludingXclibbits,
  FILE_HEADER_DECORATION,
  formatDocumentContent,
} from "../utils";

export class CopyFileCommand {
  public static readonly commandName = "clibbits.copyFile";

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
              const content = extractTextExcludingXclibbits(document);

              // Add file separator if this isn't the first file
              if (successfulCopies > 0) {
                contentBuilder.push("\n\n");
              }

              const workspaceFolder =
                vscode.workspace.getWorkspaceFolder(fileUri);

              contentBuilder.push(
                formatDocumentContent(document, workspaceFolder)
              );

              successfulCopies++;
              totalSize += content.length;

              // Check if we're exceeding a reasonable size limit (e.g., 5MB)
              if (totalSize > 5 * 1024 * 1024) {
                throw new Error("Combined file size exceeds 5MB limit");
              }
            } catch (error) {
              vscode.window.showWarningMessage(
                `Failed to copy ${path.basename(fileUri.fsPath)}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }

          if (successfulCopies > 0) {
            await vscode.env.clipboard.writeText(contentBuilder.join(""));

            const message =
              successfulCopies === 1
                ? `Successfully copied contents of ${path.basename(
                    urisToProcess[0].fsPath
                  )} to clipboard.`
                : `Successfully copied contents of ${successfulCopies} files to clipboard.`;

            vscode.window.showInformationMessage(message);
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to copy files: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  }
}
