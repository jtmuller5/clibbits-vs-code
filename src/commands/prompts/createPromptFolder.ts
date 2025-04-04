import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class CreateClibbitFolderCommand {
  public static readonly commandName = "clibbits.createClibbitFolder";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Get workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage("Please open a workspace folder first.");
          return;
        }

        // Use the first workspace folder
        const rootFolder = workspaceFolders[0].uri.fsPath;
        const promptsFolder = path.join(rootFolder, ".github", "prompts", "clibbits");

        // Create directory recursively
        try {
          await fs.promises.mkdir(path.join(rootFolder, ".github"), { recursive: true });
          await fs.promises.mkdir(path.join(rootFolder, ".github", "prompts"), { recursive: true });
          await fs.promises.mkdir(promptsFolder, { recursive: true });
          
          // Create a README.md file in the prompts folder to explain the feature
          const readmePath = path.join(promptsFolder, "README.md");
          const readmeContent = `# Clibbits Files

This folder contains clibbit files created by the Clibbits extension. These files can be used with GitHub Copilot or other AI assistants to provide reusable instructions.

## How to use

1. Create a new clibbit using the "Clibbits: Create Clibbit" command.
2. Add code snippets to your clibbit using the "Clibbits: Add to Clibbit" command.
3. Use the clibbits with GitHub Copilot by attaching them to your chat requests.

## Learn more

For more information about prompt files, see the [VS Code documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_reusable-prompt-files-experimental).
`;
          
          await fs.promises.writeFile(readmePath, readmeContent);
          
          vscode.window.showInformationMessage(`Successfully created clibbits folder at ${promptsFolder}`);
          
          // Check if VS Code has the chat.promptFiles setting enabled
          // If not, suggest enabling it
          const config = vscode.workspace.getConfiguration("chat");
          const promptFilesEnabled = config.get("promptFiles");
          const promptFilesLocations = config.get("promptFilesLocations") as string[] || [];
          
          if (!promptFilesEnabled) {
            const enableSetting = "Enable chat.promptFiles";
            const response = await vscode.window.showInformationMessage(
              "Prompt files are not enabled in VS Code settings. Would you like to enable them?",
              enableSetting
            );
            
            if (response === enableSetting) {
              await config.update("promptFiles", true, vscode.ConfigurationTarget.Workspace);
            }
          }
          
          // Check if the location is already in the settings
          const relativePath = ".github/prompts";
          if (!promptFilesLocations.includes(relativePath)) {
            const addLocation = "Add to promptFilesLocations";
            const response = await vscode.window.showInformationMessage(
              "The .github/prompts folder is not in your prompt files locations. Would you like to add it?",
              addLocation
            );
            
            if (response === addLocation) {
              promptFilesLocations.push(relativePath);
              await config.update("promptFilesLocations", promptFilesLocations, vscode.ConfigurationTarget.Workspace);
            }
          }
          
          // Open the README.md file to show the user
          const doc = await vscode.workspace.openTextDocument(readmePath);
          await vscode.window.showTextDocument(doc);
          
        } catch (error) {
          console.error("Error creating prompt folder:", error);
          vscode.window.showErrorMessage(`Failed to create prompt folder: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create prompt folder: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });
  }
}
