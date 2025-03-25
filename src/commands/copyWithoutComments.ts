import * as vscode from "vscode";
import * as path from "path";
import { FILE_HEADER_DECORATION } from "../utils";

export class CopyWithoutCommentsCommand {
  public static readonly commandName = "clibbits.copyWithoutComments";

  private static removeComments(text: string): string {
    // Remove multi-line comments
    text = text.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove single-line comments, being careful not to remove URLs in strings
    const lines = text.split("\n");
    const processedLines = lines.map((line) => {
      // Skip processing if the line is within a string
      let inString = false;
      let stringChar = "";
      let result = "";

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        // Handle string boundaries
        if (
          (char === '"' || char === "'") &&
          (i === 0 || line[i - 1] !== "\\")
        ) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
        }

        // Check for comment start
        if (!inString && char === "/" && nextChar === "/") {
          break; // Rest of the line is a comment
        }

        result += char;
      }

      return result;
    });

    // Filter out empty lines and trim whitespace
    return processedLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
      this.commandName,
      async (uri: vscode.Uri, selectedFiles: vscode.Uri[]) => {
        try {
          let urisToProcess: vscode.Uri[] = [];

          // Handle different command invocation contexts
          if (selectedFiles && Array.isArray(selectedFiles)) {
            urisToProcess = selectedFiles;
          } else if (uri) {
            urisToProcess = [uri];
          } else if (vscode.window.activeTextEditor) {
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
              const contentWithoutComments = this.removeComments(
                document.getText()
              );
              const workspaceFolder = vscode.workspace.getWorkspaceFolder(
                document.uri
              );
              const rootPath = workspaceFolder
                ? workspaceFolder.uri.fsPath
                : "";
              const relativePath = rootPath
                ? path.relative(rootPath, document.fileName)
                : path.basename(document.fileName);

              // Add file separator if this isn't the first file
              if (successfulCopies > 0) {
                contentBuilder.push("\n");
              }

              const languageId = document.languageId;

              contentBuilder.push(FILE_HEADER_DECORATION);
              contentBuilder.push(`File: ${relativePath}\n`);
              contentBuilder.push(FILE_HEADER_DECORATION);
              contentBuilder.push("\n");
              if (languageId !== "plaintext" && languageId !== "markdown") {
                contentBuilder.push(`\`\`\`${languageId}\n`);
              }
              contentBuilder.push(contentWithoutComments);
              if (languageId !== "plaintext" && languageId !== "markdown") {
                contentBuilder.push("\n```\n");
              }
              successfulCopies++;
              totalSize += contentWithoutComments.length;

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
            const combinedContent = contentBuilder.join("");
            await vscode.env.clipboard.writeText(combinedContent);

            const message =
              successfulCopies === 1
                ? `Successfully copied contents of ${path.basename(
                    urisToProcess[0].fsPath
                  )} (without comments) to clipboard.`
                : `Successfully copied contents of ${successfulCopies} files (without comments) to clipboard.`;

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
