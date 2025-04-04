import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class AddToPromptFileCommand {
  public static readonly commandName = "clibbits.addToPromptFile";

  private static async getPromptFiles(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    const rootFolder = workspaceFolders[0].uri.fsPath;
    const promptsFolder = path.join(
      rootFolder,
      ".github",
      "prompts",
      "clibbits"
    );

    try {
      await fs.promises.mkdir(promptsFolder, { recursive: true });
      const files = await fs.promises.readdir(promptsFolder);
      return files
        .filter((file) => file.endsWith(".prompt.md"))
        .map((file) => path.join(promptsFolder, file));
    } catch (error) {
      console.error("Error reading prompt files:", error);
      return [];
    }
  }

  private static async addToPromptFile(
    content: string,
    promptFilePath: string,
    section: string
  ): Promise<void> {
    // Read the current content of the prompt file
    const promptContent = await fs.promises.readFile(promptFilePath, "utf8");

    // Find where to insert the content
    // Look for the specified section, or add one if it doesn't exist
    let newContent: string;

    if (promptContent.includes(`## ${section}`)) {
      // Find where to insert the content in the specified section
      const sectionIndex = promptContent.indexOf(`## ${section}`);
      // Find the next section after the specified section, if any
      const nextSectionMatch = promptContent
        .slice(sectionIndex + `## ${section}`.length)
        .match(/^##\s/m);

      console.log("Section Index:", sectionIndex);
      console.log("Next Section Match:", nextSectionMatch);

      if (nextSectionMatch && nextSectionMatch.length > 0) {
        const matchIndex = promptContent
          .slice(sectionIndex)
          .indexOf(nextSectionMatch[0]);

        console.log("Match Index:", matchIndex);
        if (matchIndex >= 0) {
          const nextSectionIndex = sectionIndex + (`## ${section}`.length);
          newContent =
            promptContent.slice(0, sectionIndex + `## ${section}`.length) +
            "\n" +
            content +
            promptContent.slice(nextSectionIndex);
        } else {
          // No valid next section found, just append to the end
          newContent = promptContent + "\n\n" + content;
        }
      } else {
        // No next section, just append to the end of the section
        newContent = promptContent + "\n\n" + content;
      }
    } else {
      // Add a new section
      newContent = promptContent + `\n\n## ${section}\n\n` + content;
    }

    // Write the new content back to the file
    await fs.promises.writeFile(promptFilePath, newContent);
  }

  private static async collectFiles(
    folderPath: string,
    maxDepth: number = 3,
    excludePatterns: RegExp[] = [
      /[\\/]node_modules[\\/]/,
      /[\\/]\.git[\\/]/,
      /[\\/]\.vscode[\\/]/,
    ]
  ): Promise<string[]> {
    if (maxDepth <= 0) {
      return [];
    }

    const results: string[] = [];

    try {
      const files = await fs.promises.readdir(folderPath);

      for (const file of files) {
        const fullPath = path.join(folderPath, file);

        // Skip files/folders that match exclude patterns
        if (excludePatterns.some((pattern) => pattern.test(fullPath))) {
          continue;
        }

        const stats = await fs.promises.stat(fullPath);

        if (stats.isDirectory()) {
          // Recursively process subdirectories with reduced depth
          const subFiles = await this.collectFiles(
            fullPath,
            maxDepth - 1,
            excludePatterns
          );
          results.push(...subFiles);
        } else {
          // Only include text files
          const ext = path.extname(file).toLowerCase();
          const isTextFile = ![
            ".exe",
            ".dll",
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".ico",
            ".bin",
          ].includes(ext);

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

  // Command handler for files from explorer
  private static async handleFileFromExplorer(uri: vscode.Uri): Promise<void> {
    try {
      const stats = await fs.promises.stat(uri.fsPath);
      let filesToProcess: string[] = [];

      if (stats.isDirectory()) {
        // This is a folder, collect all text files
        filesToProcess = await this.collectFiles(uri.fsPath);
        if (filesToProcess.length === 0) {
          vscode.window.showInformationMessage(
            "No text files found in the selected folder."
          );
          return;
        }
      } else {
        // This is a single file
        filesToProcess = [uri.fsPath];
      }

      // Get all available prompt files
      const promptFiles = await this.getPromptFiles();

      if (promptFiles.length === 0) {
        const createNew = "Create New Prompt File";
        const response = await vscode.window.showInformationMessage(
          "No prompt files found. Would you like to create one?",
          createNew
        );

        if (response === createNew) {
          await vscode.commands.executeCommand("clibbits.createPromptFile");
          // After creating a file, try again
          return this.handleFileFromExplorer(uri);
        }
        return;
      }

      // Ask the user which prompt file to use
      const promptFileItems = promptFiles.map((file) => ({
        label: path.basename(file),
        description: file,
      }));

      const selectedPromptFile = await vscode.window.showQuickPick(
        promptFileItems,
        {
          placeHolder: "Select a prompt file to add the files to",
        }
      );

      if (!selectedPromptFile) {
        return; // User cancelled
      }

      const promptFilePath = selectedPromptFile.description;

      // Show progress indicator for multiple files
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Adding files to prompt file...",
          cancellable: false,
        },
        async (progress) => {
          let fileLinks = "";

          for (let i = 0; i < filesToProcess.length; i++) {
            const filePath = filesToProcess[i];
            try {
              const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
              const relativePath = workspaceFolder
                ? path.relative(workspaceFolder.uri.fsPath, filePath)
                : path.basename(filePath);

              // Create a relative path for the markdown link
              // Count the number of directories in the prompt file path from workspace root
              const promptRelativePath = path.relative(
                workspaceFolder
                  ? workspaceFolder.uri.fsPath
                  : path.dirname(promptFilePath),
                promptFilePath
              );

              const directoryCount =
                promptRelativePath.split(path.sep).length - 1;
              const backPath = "../".repeat(directoryCount);

              // Create the file link in markdown format
              fileLinks += `- [${relativePath}](${backPath}${relativePath})`;

              progress.report({
                message: `Processing file ${i + 1} of ${filesToProcess.length}`,
                increment: 100 / filesToProcess.length,
              });
            } catch (error) {
              vscode.window.showWarningMessage(
                `Failed to process ${path.basename(filePath)}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }

          if (fileLinks) {
            // Add file links to the Files section
            await this.addToPromptFile(fileLinks, promptFilePath, "Files");

            // Show success message
            const message =
              filesToProcess.length === 1
                ? `Added link to ${path.basename(
                    filesToProcess[0]
                  )} in ${path.basename(promptFilePath)}`
                : `Added links to ${
                    filesToProcess.length
                  } files in ${path.basename(promptFilePath)}`;

            vscode.window.showInformationMessage(message);

            // Open the prompt file to show the changes
            const document = await vscode.workspace.openTextDocument(
              promptFilePath
            );
            await vscode.window.showTextDocument(document);
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to add to prompt file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Command handler for text selection from editor
  private static async handleSelectionFromEditor(
    textEditor: vscode.TextEditor
  ): Promise<void> {
    try {
      // Check if there's a selection
      if (textEditor.selection.isEmpty) {
        vscode.window.showInformationMessage("Please select some code first.");
        return;
      }

      // Get the selected text
      const selectedText = textEditor.document.getText(textEditor.selection);

      // Get the language ID for proper syntax highlighting
      const languageId = textEditor.document.languageId;

      // Get the current file name for reference
      const currentFileName = path.basename(textEditor.document.fileName);

      // Get all available prompt files
      const promptFiles = await this.getPromptFiles();

      if (promptFiles.length === 0) {
        const createNew = "Create New Prompt File";
        const response = await vscode.window.showInformationMessage(
          "No prompt files found. Would you like to create one?",
          createNew
        );

        if (response === createNew) {
          await vscode.commands.executeCommand("clibbits.createPromptFile");
          // After creating a file, try again
          return await vscode.commands.executeCommand(this.commandName);
        }
        return;
      }

      // Ask the user which prompt file to use
      const promptFileItems = promptFiles.map((file) => ({
        label: path.basename(file),
        description: file,
      }));

      const selectedPromptFile = await vscode.window.showQuickPick(
        promptFileItems,
        {
          placeHolder: "Select a prompt file to add the code snippet to",
        }
      );

      if (!selectedPromptFile) {
        return; // User cancelled
      }

      // Format the code snippet with Markdown code block
      const codeSnippet = `\`\`\`${languageId}
// From ${currentFileName}
${selectedText}
\`\`\``;

      // Add to prompt file
      await this.addToPromptFile(
        codeSnippet,
        selectedPromptFile.description,
        "Context"
      );

      // Show success message
      vscode.window.showInformationMessage(
        `Code snippet added to ${path.basename(selectedPromptFile.description)}`
      );

      // Open the prompt file to show the changes
      const document = await vscode.workspace.openTextDocument(
        selectedPromptFile.description
      );
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to add code to prompt file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Register both command handlers
  public static register(
    context: vscode.ExtensionContext
  ): vscode.Disposable[] {
    // Command for file explorer context menu
    const fileCommand = vscode.commands.registerCommand(
      `${this.commandName}.file`,
      async (uri: vscode.Uri) => {
        await this.handleFileFromExplorer(uri);
      }
    );

    // Command for editor context menu (with text selection)
    const editorCommand = vscode.commands.registerTextEditorCommand(
      this.commandName,
      async (textEditor: vscode.TextEditor) => {
        await this.handleSelectionFromEditor(textEditor);
      }
    );

    return [fileCommand, editorCommand];
  }
}
