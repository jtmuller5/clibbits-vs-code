import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { FILE_HEADER_DECORATION } from "../utils";

export class PasteAsFilesCommand {
  public static readonly commandName = "clibbits.pasteAsFiles";

  private static async ensureDirectoryExists(filePath: string): Promise<void> {
    const dirPath = path.dirname(filePath);
    
    try {
      // Check if directory exists
      await fs.promises.access(dirPath);
    } catch (error) {
      // Directory doesn't exist, create it recursively
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  private static async createFileFromContent(
    basePath: string,
    relativePath: string,
    content: string
  ): Promise<string> {
    // Construct the full path
    const fullPath = path.join(basePath, relativePath);
    
    // Ensure the directory structure exists
    await this.ensureDirectoryExists(fullPath);
    
    // Write the file content
    await fs.promises.writeFile(fullPath, content, "utf8");
    
    return fullPath;
  }

  private static parseClipboardContent(
    clipboardContent: string
  ): Array<{ relativePath: string; content: string }> {
    const files: Array<{ relativePath: string; content: string }> = [];
    
    // Check if content contains the header decoration
    if (!clipboardContent.includes(FILE_HEADER_DECORATION)) {
      return [];
    }
    
    // Split content by the header decoration
    const sections = clipboardContent.split(FILE_HEADER_DECORATION);
    
    // Process sections in pairs
    for (let i = 1; i < sections.length; i += 2) {
      const fileHeaderSection = sections[i];
      let contentSection = sections[i + 1] || "";
      
      // Extract the file path from the header section
      const filePathMatch = fileHeaderSection.match(/File:\s*(.*)\n/);
      
      if (filePathMatch && filePathMatch[1]) {
        const relativePath = filePathMatch[1].trim();
        
        // Clean up the content - remove code block markdown if present
        let cleanContent = contentSection;
        
        // If content has markdown code blocks, remove them
        const languageMatch = cleanContent.match(/^```([a-zA-Z0-9+#]+)\n/);
        if (languageMatch) {
          const language = languageMatch[1];
          // Remove the opening code block marker
          cleanContent = cleanContent.replace(/^```[a-zA-Z0-9+#]+\n/, "");
          // Remove the closing code block marker
          cleanContent = cleanContent.replace(/\n```\n*$/, "");
        }
        
        files.push({
          relativePath,
          content: cleanContent.trim()
        });
      }
    }
    
    return files;
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async (uri: vscode.Uri) => {
      try {
        // Check if workspace is open
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
          vscode.window.showErrorMessage("Please open a workspace folder first.");
          return;
        }
        
        // Get target directory - use the URI from right-click or fallback to workspace root
        let targetDirectory: string;
        if (uri && fs.statSync(uri.fsPath).isDirectory()) {
          targetDirectory = uri.fsPath;
        } else {
          // No folder was right-clicked, use workspace root as fallback
          targetDirectory = vscode.workspace.workspaceFolders[0].uri.fsPath;
          vscode.window.showInformationMessage("No folder selected. Using workspace root as target directory.");
        }
        
        // Read clipboard content
        const clipboardContent = await vscode.env.clipboard.readText();
        
        if (!clipboardContent) {
          vscode.window.showInformationMessage("Clipboard is empty.");
          return;
        }
        
        // Parse the clipboard content into files
        const files = this.parseClipboardContent(clipboardContent);
        
        if (files.length === 0) {
          vscode.window.showErrorMessage(
            `Clipboard content doesn't contain the expected format with '${FILE_HEADER_DECORATION.trim()}' markers.`
          );
          return;
        }
        
        // Show progress indicator
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Creating files from clipboard...",
            cancellable: false,
          },
          async (progress) => {
            let createdFiles = 0;
            const createdPaths: string[] = [];
            
            for (let i = 0; i < files.length; i++) {
              const { relativePath, content } = files[i];
              
              try {
                const fullPath = await this.createFileFromContent(targetDirectory, relativePath, content);
                createdFiles++;
                createdPaths.push(fullPath);
                
                progress.report({
                  message: `Created ${createdFiles} of ${files.length} files`,
                  increment: (1 / files.length) * 100,
                });
              } catch (error) {
                vscode.window.showWarningMessage(
                  `Failed to create file ${relativePath}: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`
                );
              }
            }
            
            if (createdFiles > 0) {
              vscode.window.showInformationMessage(
                `Successfully created ${createdFiles} file${createdFiles > 1 ? 's' : ''} from clipboard content.`
              );
              
              // Open the first created file
              if (createdPaths.length > 0) {
                const document = await vscode.workspace.openTextDocument(createdPaths[0]);
                await vscode.window.showTextDocument(document);
              }
            } else {
              vscode.window.showErrorMessage("Failed to create any files.");
            }
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to paste files: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
