import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class CreateClibbitCommand {
  public static readonly commandName = "clibbits.createClibbit";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Get workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage(
            "Please open a workspace folder first."
          );
          return;
        }

        // Use the first workspace folder
        const rootFolder = workspaceFolders[0].uri.fsPath;
        const promptsFolder = path.join(
          rootFolder,
          ".github",
          "prompts",
          "clibbits"
        );

        // Ensure the prompts folder exists
        try {
          await fs.promises.mkdir(promptsFolder, { recursive: true });
        } catch (error) {
          console.error("Error creating prompt folder:", error);
          vscode.window.showErrorMessage(
            `Failed to create prompt folder: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          return;
        }

        // Ask for the prompt file name
        const promptName = await vscode.window.showInputBox({
          prompt: "Enter a name for your clibbit (without extension)",
          placeHolder: "example-clibbit",
          validateInput: (input) => {
            if (!input) {
              return "Please enter a name for your clibbit.";
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
              return "Prompt name can only contain letters, numbers, underscores, and hyphens.";
            }
            return null;
          },
        });

        if (!promptName) {
          return; // User cancelled
        }

        // Create the prompt file
        const promptFilePath = path.join(
          promptsFolder,
          `${promptName}.prompt.md`
        );

        // Check if the file already exists
        try {
          await fs.promises.access(promptFilePath);
          const overwrite = "Overwrite";
          const response = await vscode.window.showInformationMessage(
            `A clibbit with the name '${promptName}' already exists. Do you want to overwrite it?`,
            overwrite,
            "Cancel"
          );

          if (response !== overwrite) {
            return;
          }
        } catch (error) {
          // File doesn't exist, continue
        }

        // Create the prompt file with a template
        const templateContent = `---
title: ${promptName}
id: 
tags: []       
---        
# ${promptName}

## Instructions
Instructions for how to use this prompt file.

## Content
\`\`\`
// Code snippets will be added here
\`\`\`

## Files

`;

        await fs.promises.writeFile(promptFilePath, templateContent);

        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(
          promptFilePath
        );
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(
          `Successfully created clibbit: ${promptName}.prompt.md`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create prompt file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
