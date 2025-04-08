import * as vscode from "vscode";
import { CategorySelector } from "./CategorySelector";
import { LibbitSelector } from "./LibbitSelector";
import { getLibbitsByCategory, getClibbitsByLibbitId } from "./SupabaseClient";

export class AddToStackCommand {
  public static readonly commandName = "clibbits.addToStack";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Show category selector
        const categorySelector = new CategorySelector();
        const selectedCategory = await categorySelector.showCategoryQuickPick();
        
        if (!selectedCategory) {
          // User cancelled the category selection
          return;
        }
        
        // Fetch libbits for the selected category
        const libbits = await getLibbitsByCategory(selectedCategory);
        
        if (libbits.length === 0) {
          vscode.window.showInformationMessage(`No libbits found for category: ${selectedCategory}`);
          return;
        }
        
        // Show libbit selector
        const libbitSelector = new LibbitSelector();
        const selectedLibbit = await libbitSelector.showLibbitQuickPick(libbits);
        
        if (!selectedLibbit) {
          // User cancelled the libbit selection
          return;
        }
        
        // Get all clibbits for the selected libbit
        const clibbits = await getClibbitsByLibbitId(selectedLibbit.id);
        
        if (clibbits.length === 0) {
          vscode.window.showInformationMessage(`No clibbits found for libbit: ${selectedLibbit.name}`);
          return;
        }
        
        // Combine clibbit content
        let combinedContent = "";
        for (const clibbit of clibbits) {
          combinedContent += clibbit.content + "\n\n";
        }
        
        // Save to prompt file
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage("No workspace folder found.");
          return;
        }
        
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        
        // Create .github/prompts/clibbits folder if it doesn't exist
        const promptsDir = `${workspaceRoot}/.github/prompts/clibbits`;
        
        // Use VS Code API to create directories and files
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(`${workspaceRoot}/.github`));
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(`${workspaceRoot}/.github/prompts`));
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(promptsDir));
        
        // Sanitize filename
        const sanitizedName = selectedLibbit.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = `${promptsDir}/${sanitizedName}.prompt.md`;
        
        // Create the prompt file content with metadata
        const promptContent = `# ${selectedLibbit.name}

## Category: ${selectedCategory}
${selectedLibbit.description ? `## Description: ${selectedLibbit.description}` : ''}

---

${combinedContent}`;
        
        // Write the file
        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(filePath),
          Buffer.from(promptContent, 'utf8')
        );
        
        // Open the created file
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`Successfully added ${selectedLibbit.name} to your prompt stack.`);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to add to stack: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  }
}
