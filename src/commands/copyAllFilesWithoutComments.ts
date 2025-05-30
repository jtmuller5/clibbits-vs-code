import * as vscode from "vscode";
import * as path from "path";
import { FILE_HEADER_DECORATION } from "../utils";

export class CopyAllFilesWithoutCommentsCommand {
  public static readonly commandName = "clibbits.copyAllFilesWithoutComments";

  /**
   * Removes comments from the given text content
   * Handles single-line comments, multi-line comments, and preserves strings
   */
  private static removeComments(text: string): string {
    // Preserve strings by temporarily replacing them
    const stringPlaceholders: string[] = [];
    const textWithoutStrings = text.replace(
      /(['"`])((?:\\.|[^\\])*?)\1/g,
      (match) => {
        stringPlaceholders.push(match);
        return `__STRING_${stringPlaceholders.length - 1}__`;
      }
    );

    // Remove multi-line comments
    let withoutMultiLineComments = textWithoutStrings.replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    );

    // Remove single-line comments
    let withoutComments = withoutMultiLineComments.replace(/\/\/.*/g, "");

    // Restore strings
    withoutComments = withoutComments.replace(
      /__STRING_(\d+)__/g,
      (_, index) => stringPlaceholders[parseInt(index)]
    );

    // Remove empty lines and normalize whitespace
    return withoutComments
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      const openEditors = vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .filter((tab) => tab.input instanceof vscode.TabInputText)
        .map((tab) => (tab.input as vscode.TabInputText).uri);

      if (openEditors.length === 0) {
        vscode.window.showInformationMessage("No files are currently open.");
        return;
      }

      try {
        const contentBuilder: string[] = [];
        let processedFiles = 0;
        let totalSize = 0;

        for (const uri of openEditors) {
          try {
            const document = await vscode.workspace.openTextDocument(uri);
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(
              document.uri
            );
            const rootPath = workspaceFolder ? workspaceFolder.uri.fsPath : "";
            const relativePath = rootPath
              ? path.relative(rootPath, document.fileName)
              : path.basename(document.fileName);
            const contentWithoutComments = this.removeComments(
              document.getText()
            );

            // Skip files that become empty after removing comments
            if (!contentWithoutComments.trim()) {
              continue;
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
            contentBuilder.push("\n\n");

            processedFiles++;
            totalSize += contentWithoutComments.length;

            // Check size limit (5MB)
            if (totalSize > 5 * 1024 * 1024) {
              throw new Error("Combined file size exceeds 5MB limit");
            }
          } catch (error) {
            vscode.window.showWarningMessage(
              `Failed to process ${path.basename(uri.fsPath)}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }

        if (processedFiles > 0) {
          const combinedContent = contentBuilder.join("");
          await vscode.env.clipboard.writeText(combinedContent);
          vscode.window.showInformationMessage(
            `Successfully copied content from ${processedFiles} file(s) to clipboard (comments removed).`
          );
        } else {
          vscode.window.showInformationMessage(
            "No content to copy after removing comments."
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to copy files: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
