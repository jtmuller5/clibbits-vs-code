import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";

export class InitializeClibbitConfigCommand {
  static readonly commandName = "clibbits.initializeClibbitConfig";

  static register(): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!rootUri) {
        vscode.window.showErrorMessage(
          "No workspace folder open. Open a folder first."
        );
        return;
      }

      const configFileName = vscode.workspace
        .getConfiguration("clibbits")
        .get<string>("configFileName", ".clibbits");

      const configPath = path.join(rootUri.fsPath, configFileName);

      // Check if file exists
      if (fs.existsSync(configPath)) {
        const overwrite = await vscode.window.showWarningMessage(
          `${configFileName} already exists. Overwrite?`,
          "Overwrite",
          "Cancel"
        );
        if (overwrite !== "Overwrite") {
          return;
        }
      }

      // Build template with auto-detected info
      const workspaceName =
        vscode.workspace.name ?? path.basename(rootUri.fsPath);

      const files: Record<string, string> = {};

      // Auto-detect common files
      const commonFiles = [
        "package.json",
        "tsconfig.json",
        "README.md",
        ".gitignore",
      ];
      for (const file of commonFiles) {
        const filePath = path.join(rootUri.fsPath, file);
        if (fs.existsSync(filePath)) {
          const alias = path.basename(file, path.extname(file)).toLowerCase();
          files[alias] = file;
        }
      }

      // Add currently open files
      const openTabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
      for (const tab of openTabs) {
        if (tab.input instanceof vscode.TabInputText) {
          const relPath = path.relative(
            rootUri.fsPath,
            tab.input.uri.fsPath
          );
          if (!relPath.startsWith("..") && !path.isAbsolute(relPath)) {
            const alias = path
              .basename(relPath, path.extname(relPath))
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "-");
            if (!files[alias]) {
              files[alias] = relPath;
            }
          }
        }
      }

      const config = {
        project: workspaceName,
        vocabulary: [workspaceName],
        files: Object.keys(files).length > 0 ? files : undefined,
        directories: ["src"],
        commands: {
          build: "npm run build",
          test: "npm test",
        },
      };

      const yamlContent =
        "# Clibbits project configuration\n" +
        "# This file helps the Clibbits voice transcription pipeline understand your project\n\n" +
        YAML.stringify(config);

      fs.writeFileSync(configPath, yamlContent, "utf-8");

      // Open the file
      const doc = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(doc);

      vscode.window.showInformationMessage(
        `Created ${configFileName} in workspace root`
      );
    });
  }
}
