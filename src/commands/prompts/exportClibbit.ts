import * as vscode from "vscode";
import * as path from "path";
import { ClibbitsStorage } from "../../utils/clibbitsStorage";

export class ExportClibbitCommand {
  public static readonly commandName = "clibbits.exportClibbit";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Get all clibbits in the workspace
        const clibbits = await ClibbitsStorage.getWorkspaceClibbits();

        if (clibbits.length === 0) {
          vscode.window.showInformationMessage(
            "No clibbits found in this workspace. Create a clibbit first."
          );
          return;
        }

        // Ask the user to select a clibbit to export
        const clibbitItems = clibbits.map((file) => ({
          label: path.basename(file),
          description: file,
        }));

        const selectedClibbit = await vscode.window.showQuickPick(clibbitItems, {
          placeHolder: "Select a clibbit to export to shared location",
        });

        if (!selectedClibbit) {
          return; // User cancelled
        }

        // Check if the clibbit already exists in the shared location
        const fileName = path.basename(selectedClibbit.description);
        const sharedPath = path.join(
          ClibbitsStorage.getSharedStoragePath(),
          fileName
        );

        let shouldExport = true;

        // Check if a clibbit with the same name already exists in the shared location
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(sharedPath));
          // File exists, confirm overwrite
          const overwrite = "Overwrite";
          const response = await vscode.window.showInformationMessage(
            `A clibbit with the name '${fileName}' already exists in the shared location. Do you want to overwrite it?`,
            overwrite,
            "Cancel"
          );

          if (response !== overwrite) {
            shouldExport = false;
          }
        } catch (error) {
          // File doesn't exist, proceed with export
        }

        if (shouldExport) {
          const exportedPath = await ClibbitsStorage.exportClibbit(
            selectedClibbit.description
          );

          if (exportedPath) {
            vscode.window.showInformationMessage(
              `Successfully exported '${fileName}' to shared location`
            );
          } else {
            vscode.window.showErrorMessage(
              `Failed to export '${fileName}' to shared location`
            );
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to export clibbit: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
