import * as vscode from "vscode";
import { LibbitSelector } from "../addToStack/LibbitSelector";
import {
  getLibbitsByCategory,
  getClibbitsByLibbitId,
} from "../addToStack/SupabaseClient";

// Helper function to sanitize names for filesystem paths
const sanitizeName = (name: string): string => {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
};

export class AddComponentsCommand {
  public static readonly commandName = "clibbits.addComponents";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Use "Style" as the fixed category
        const selectedCategory = "Style";

        // Fetch libbits for the Style category
        const libbits = await getLibbitsByCategory(selectedCategory);

        if (libbits.length === 0) {
          vscode.window.showInformationMessage(
            `No libbits found for category: ${selectedCategory}`
          );
          return;
        }

        // Show libbit selector
        const libbitSelector = new LibbitSelector();
        const selectedLibbit = await libbitSelector.showLibbitQuickPick(
          libbits
        );

        if (!selectedLibbit) {
          // User cancelled the libbit selection
          return;
        }

        // Get all clibbits for the selected libbit
        const clibbits = await getClibbitsByLibbitId(selectedLibbit.id);

        if (clibbits.length === 0) {
          vscode.window.showInformationMessage(
            `No clibbits found for libbit: ${selectedLibbit.name}`
          );
          return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage("No workspace folder found.");
          return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const sanitizedLibbitName = sanitizeName(selectedLibbit.name);
        const categoryDir = `${workspaceRoot}/.github/prompts`; // `${workspaceRoot}/.github/prompts/clibbits/${sanitizedLibbitName}`;
        const categoryUri = vscode.Uri.file(categoryDir);

        // Create base directories and the category-specific directory
        await vscode.workspace.fs.createDirectory(
          vscode.Uri.file(`${workspaceRoot}/.github`)
        );
        await vscode.workspace.fs.createDirectory(
          vscode.Uri.file(`${workspaceRoot}/.github/prompts`)
        );
        await vscode.workspace.fs.createDirectory(
          vscode.Uri.file(`${workspaceRoot}/.github/prompts/clibbits`)
        );
        await vscode.workspace.fs.createDirectory(categoryUri);

        // Save each clibbit to its own file within the category directory
        for (let i = 0; i < clibbits.length; i++) {
          const clibbit = clibbits[i];
          // Use clibbit name if available and sanitize it, otherwise use index
          const clibbitName = clibbit.prompt_name
            ? sanitizeName(clibbit.prompt_name)
            : `clibbit_${i + 1}`;
          const fileName = `${clibbitName}.prompt.md`;
          const filePath = `${categoryDir}/${fileName}`;
          const fileUri = vscode.Uri.file(filePath);

          // Create the prompt file content (just the clibbit content)
          const promptContent = clibbit.content;

          // Write the file
          await vscode.workspace.fs.writeFile(
            fileUri,
            Buffer.from(promptContent, "utf8")
          );
        }

        vscode.window.showInformationMessage(
          `Successfully added ${clibbits.length} component(s) from ${selectedLibbit.name} to the '${selectedCategory}' collection.`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to add components: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
