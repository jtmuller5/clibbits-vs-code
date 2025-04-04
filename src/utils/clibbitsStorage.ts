import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Utility class to handle the shared storage location for clibbits
 */
export class ClibbitsStorage {
  /**
   * Get the path to the shared clibbits storage location
   */
  public static getSharedStoragePath(): string {
    // Use a folder in the user's home directory to store shared clibbits
    const homeDir = os.homedir();
    const storagePath = path.join(homeDir, ".clibbits", "shared");
    
    // Create the storage directory if it doesn't exist
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    
    return storagePath;
  }

  /**
   * Get a list of all stored clibbits in the shared location
   */
  public static async getSharedClibbits(): Promise<string[]> {
    const storagePath = this.getSharedStoragePath();
    
    try {
      const files = await fs.promises.readdir(storagePath);
      return files
        .filter(file => file.endsWith(".prompt.md"))
        .map(file => path.join(storagePath, file));
    } catch (error) {
      console.error("Error reading shared clibbits:", error);
      return [];
    }
  }

  /**
   * Get the workspace clibbits directory
   */
  public static getWorkspaceClibbitsPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    const rootFolder = workspaceFolders[0].uri.fsPath;
    return path.join(rootFolder, ".github", "prompts", "clibbits");
  }

  /**
   * Get a list of all clibbits in the current workspace
   */
  public static async getWorkspaceClibbits(): Promise<string[]> {
    const clibbitsPath = this.getWorkspaceClibbitsPath();
    if (!clibbitsPath) {
      return [];
    }
    
    try {
      // Ensure the directory exists
      await fs.promises.mkdir(clibbitsPath, { recursive: true });
      
      const files = await fs.promises.readdir(clibbitsPath);
      return files
        .filter(file => file.endsWith(".prompt.md"))
        .map(file => path.join(clibbitsPath, file));
    } catch (error) {
      console.error("Error reading workspace clibbits:", error);
      return [];
    }
  }

  /**
   * Export a clibbit from the workspace to the shared storage location
   * @param clibbitPath Path to the clibbit file in the workspace
   * @returns The path to the exported clibbit or undefined if the operation failed
   */
  public static async exportClibbit(clibbitPath: string): Promise<string | undefined> {
    try {
      const storagePath = this.getSharedStoragePath();
      const fileName = path.basename(clibbitPath);
      const destinationPath = path.join(storagePath, fileName);
      
      // Read the source file
      const content = await fs.promises.readFile(clibbitPath, "utf8");
      
      // Write to the destination
      await fs.promises.writeFile(destinationPath, content, "utf8");
      
      return destinationPath;
    } catch (error) {
      console.error(`Error exporting clibbit ${clibbitPath}:`, error);
      return undefined;
    }
  }

  /**
   * Import a clibbit from the shared storage to the workspace
   * @param clibbitPath Path to the clibbit file in the shared storage
   * @returns The path to the imported clibbit or undefined if the operation failed
   */
  public static async importClibbit(clibbitPath: string): Promise<string | undefined> {
    try {
      const workspacePath = this.getWorkspaceClibbitsPath();
      if (!workspacePath) {
        throw new Error("No workspace folder is open");
      }
      
      // Ensure the workspace clibbits directory exists
      await fs.promises.mkdir(workspacePath, { recursive: true });
      
      const fileName = path.basename(clibbitPath);
      const destinationPath = path.join(workspacePath, fileName);
      
      // Read the source file
      const content = await fs.promises.readFile(clibbitPath, "utf8");
      
      // Write to the destination
      await fs.promises.writeFile(destinationPath, content, "utf8");
      
      return destinationPath;
    } catch (error) {
      console.error(`Error importing clibbit ${clibbitPath}:`, error);
      return undefined;
    }
  }
}
