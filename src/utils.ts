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
  contentBuilder.push(extractTextExcludingXclibbits(document));
  /* if (languageId !== "plaintext" && languageId !== "markdown") {
    contentBuilder.push("\n```\n");
  } */
  contentBuilder.push("\n\n");

  return contentBuilder.join("");
}

/**
 * Extracts text from a document, omitting all content between lines containing "xclibbits".
 * If there is an odd number of "xclibbits" lines, ignores everything after the last one.
 */
export function extractTextExcludingXclibbits(
  document: vscode.TextDocument
): string {
  const lines = document.getText().split(/\r?\n/);
  const result: string[] = [];
  let skipping = false;
  let xclibbitsCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("xclibbits")) {
      skipping = !skipping;
      xclibbitsCount++;
      continue;
    }
    if (!skipping) {
      result.push(lines[i]);
    }
  }

  // If odd number of xclibbits, remove everything after the last xclibbits line
  if (xclibbitsCount % 2 !== 0) {
    // Find the index of the last xclibbits line
    let lastXclibbitsIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes("xclibbits")) {
        lastXclibbitsIndex = i;
        break;
      }
    }
    // Only keep lines before the last xclibbits line
    return lines
      .slice(0, lastXclibbitsIndex)
      .filter((line) => !line.includes("xclibbits"))
      .join("\n");
  }

  return result.join("\n");
}
