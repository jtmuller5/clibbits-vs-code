import * as path from "path";
import * as vscode from "vscode";

export const FILE_HEADER_DECORATION = "=================\n";

export function formatDocumentContent(
  document: vscode.TextDocument,
  workspaceFolder: vscode.WorkspaceFolder | undefined
): string {
  const contentBuilder: string[] = [];
  const rootPath = workspaceFolder ? workspaceFolder.uri.fsPath : "";
  const relativePath = rootPath
    ? path.relative(rootPath, document.fileName)
    : path.basename(document.fileName);

  const languageId = document.languageId;

  contentBuilder.push(FILE_HEADER_DECORATION);
  contentBuilder.push(`File: ${relativePath}\n`);
  contentBuilder.push(FILE_HEADER_DECORATION);
  contentBuilder.push("\n");
  /* if (languageId !== "plaintext" && languageId !== "markdown") {
    contentBuilder.push(`\`\`\`${languageId}\n`);
  } */
  contentBuilder.push(document.getText());
  /* if (languageId !== "plaintext" && languageId !== "markdown") {
    contentBuilder.push("\n```\n");
  } */
  contentBuilder.push("\n\n");

  return contentBuilder.join("");
}
