import * as vscode from "vscode";
import * as path from "path";
import { ClibbitsStorage } from "../../utils/clibbitsStorage";

export class ImportClibbitCommand {
  public static readonly commandName = "clibbits.importClibbit";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Check if a workspace is open
        if (!vscode.workspace.workspaceFolders?.length) {
          vscode.window.showErrorMessage(
            "Please open a workspace folder first."
          );
          return;
        }

        // Get all clibbits in the shared location
        const sharedClibbits = await ClibbitsStorage.getSharedClibbits();

        if (sharedClibbits.length === 0) {
          vscode.window.showInformationMessage(
            "No clibbits found in the shared location. Export a clibbit first."
          );
          return;
        }

        // Ask the user to select a clibbit to import
        const clibbitItems = sharedClibbits.map((file) => ({
          label: path.basename(file),
          description: file,
        }));

        const selectedClibbit = await vscode.window.showQuickPick(clibbitItems, {
          placeHolder: "Select a clibbit to import to this workspace",
        });

        if (!selectedClibbit) {
          return; // User cancelled
        }

        // Check if the clibbit already exists in the workspace
        const fileName = path.basename(selectedClibbit.description);
        const workspacePath = ClibbitsStorage.getWorkspaceClibbitsPath();
        
        if (!workspacePath) {
          vscode.window.showErrorMessage("Could not determine workspace path.");
          return;
        }

        const destinationPath = path.join(workspacePath, fileName);
        let shouldImport = true;

        // Check if a clibbit with the same name already exists in the workspace
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(destinationPath));
          // File exists, confirm overwrite
          const overwrite = "Overwrite";
          const response = await vscode.window.showInformationMessage(
            `A clibbit with the name '${fileName}' already exists in this workspace. Do you want to overwrite it?`,
            overwrite,
            "Cancel"
          );

          if (response !== overwrite) {
            shouldImport = false;
          }
        } catch (error) {
          // File doesn't exist, proceed with import
        }

        if (shouldImport) {
          const importedPath = await ClibbitsStorage.importClibbit(
            selectedClibbit.description
          );

          if (importedPath) {
            vscode.window.showInformationMessage(
              `Successfully imported '${fileName}' to this workspace`
            );
            
            // Open the imported file
            const document = await vscode.workspace.openTextDocument(importedPath);
            await vscode.window.showTextDocument(document);
          } else {
            vscode.window.showErrorMessage(
              `Failed to import '${fileName}' to this workspace`
            );
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to import clibbit: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
