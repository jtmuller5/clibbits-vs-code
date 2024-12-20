import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { FILE_HEADER_DECORATION } from "../utils";

export class CopyWithImportsCommand {
  public static readonly commandName = "clibbits.copyWithImports";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
      this.commandName,
      async (uri: vscode.Uri, selectedFiles: vscode.Uri[]) => {
        try {
          let urisToProcess: vscode.Uri[] = [];

          // Handle different command invocation contexts
          if (selectedFiles && Array.isArray(selectedFiles)) {
            // Multi-selection in explorer
            urisToProcess = selectedFiles;
          } else if (uri) {
            // Single file from explorer context menu
            urisToProcess = [uri];
          } else if (vscode.window.activeTextEditor) {
            // Called from command palette - use active editor
            urisToProcess = [vscode.window.activeTextEditor.document.uri];
          }

          if (urisToProcess.length === 0) {
            vscode.window.showInformationMessage("No files selected.");
            return;
          }

          // Show progress indicator
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Collecting files with imports...",
              cancellable: false,
            },
            async (progress) => {
              let totalProcessed = 0;
              const contentBuilder: string[] = [];
              let totalSize = 0;

              for (const fileUri of urisToProcess) {
                try {
                  const files = await this.processFileWithImports(
                    fileUri.fsPath
                  );

                  for (const file of files) {
                    const relativePath = path.relative(
                      vscode.workspace.getWorkspaceFolder(fileUri)?.uri
                        .fsPath || "",
                      file.path
                    );

                    // Add separator between files
                    if (totalProcessed > 0) {
                      contentBuilder.push("\n");
                    }

                    contentBuilder.push(FILE_HEADER_DECORATION);
                    contentBuilder.push(`File: ${relativePath}\n`);
                    contentBuilder.push(FILE_HEADER_DECORATION);
                    contentBuilder.push("\n");
                    contentBuilder.push(file.content);

                    totalProcessed++;
                    totalSize += file.content.length;

                    // Check size limit (5MB)
                    if (totalSize > 5 * 1024 * 1024) {
                      throw new Error("Combined file size exceeds 5MB limit");
                    }

                    progress.report({
                      message: `Processed ${totalProcessed} files`,
                      increment: (1 / files.length) * 100,
                    });
                  }
                } catch (error) {
                  vscode.window.showWarningMessage(
                    `Failed to process ${path.basename(fileUri.fsPath)}: ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`
                  );
                }
              }

              if (totalProcessed > 0) {
                const combinedContent = contentBuilder.join("");
                await vscode.env.clipboard.writeText(combinedContent);

                const message =
                  totalProcessed === 1
                    ? `Successfully copied file with its imports to clipboard.`
                    : `Successfully copied ${totalProcessed} files with their imports to clipboard.`;

                vscode.window.showInformationMessage(message);
              }
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to copy files: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  }

  private static outputChannel: vscode.OutputChannel =
    vscode.window.createOutputChannel("Clibbits Debug");

  private static log(message: string) {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  private static async findPubspecYaml(
    startPath: string
  ): Promise<{ projectRoot: string; projectName: string } | null> {
    this.log(`Looking for pubspec.yaml starting from: ${startPath}`);

    let currentPath = startPath;
    while (currentPath !== path.dirname(currentPath)) {
      const pubspecPath = path.join(currentPath, "pubspec.yaml");
      this.log(`Checking for pubspec at: ${pubspecPath}`);

      if (fs.existsSync(pubspecPath)) {
        try {
          const pubspecContent = fs.readFileSync(pubspecPath, "utf8");
          const nameMatch = pubspecContent.match(/^name:\s*(.+)$/m);
          if (nameMatch) {
            const projectName = nameMatch[1].trim();
            this.log(`Found project name: ${projectName} at ${currentPath}`);
            return {
              projectRoot: currentPath,
              projectName: projectName,
            };
          }
        } catch (error) {
          this.log(`Error reading pubspec.yaml: ${error}`);
        }
      }
      currentPath = path.dirname(currentPath);
    }

    this.log("No pubspec.yaml found");
    return null;
  }

  private static async resolvePackageImport(
    packageImport: string,
    currentFilePath: string
  ): Promise<string | null> {
    this.log(`\nResolving package import: ${packageImport}`);
    this.log(`Current file: ${currentFilePath}`);

    // Find the project root containing pubspec.yaml and get project name
    const projectInfo = await this.findPubspecYaml(
      path.dirname(currentFilePath)
    );
    if (!projectInfo) {
      this.log("Could not find project info");
      return null;
    }

    // Extract package name and relative path from import
    const match = packageImport.match(/^package:([^\/]+)\/(.+)$/);
    if (!match) {
      this.log("Invalid package import format");
      return null;
    }

    const [_, packageName, relativePath] = match;
    this.log(`Package name: ${packageName}`);
    this.log(`Relative path: ${relativePath}`);

    // For local package imports (matching project name)
    if (packageName === projectInfo.projectName) {
      const localPath = path.join(projectInfo.projectRoot, "lib", relativePath);
      this.log(`Checking local path: ${localPath}`);

      if (fs.existsSync(localPath)) {
        this.log(`Found local file at: ${localPath}`);
        return localPath;
      }
      this.log("Local file not found");
    }

    // Check package_config.json
    const packageConfigPath = path.join(
      projectInfo.projectRoot,
      ".dart_tool",
      "package_config.json"
    );
    this.log(`Checking for package_config.json at: ${packageConfigPath}`);

    if (fs.existsSync(packageConfigPath)) {
      try {
        const packageConfig = JSON.parse(
          fs.readFileSync(packageConfigPath, "utf8")
        );
        this.log("Found package_config.json");

        const packageEntry = packageConfig.packages.find(
          (p: any) => p.name === packageName
        );
        if (packageEntry) {
          this.log(`Found package entry: ${JSON.stringify(packageEntry)}`);

          let packagePath = packageEntry.rootUri;
          if (packagePath.startsWith("file://")) {
            packagePath = packagePath.substring(7);
          }

          // Try different possible paths
          const possiblePaths = [
            path.join(packagePath, relativePath),
            path.join(packagePath, "lib", relativePath),
          ];

          for (const tryPath of possiblePaths) {
            this.log(`Trying path: ${tryPath}`);
            if (fs.existsSync(tryPath)) {
              this.log(`Found file at: ${tryPath}`);
              return tryPath;
            }
          }

          this.log("No valid paths found");
        } else {
          this.log(`Package ${packageName} not found in package_config.json`);
        }
      } catch (error) {
        this.log(`Error reading package_config.json: ${error}`);
      }
    } else {
      this.log("package_config.json not found");
    }

    this.log("Failed to resolve package import");
    return null;
  }

  private static async findImports(
    document: vscode.TextDocument
  ): Promise<Set<string>> {
    this.log(`\nFinding imports in file: ${document.uri.fsPath}`);
    const imports = new Set<string>();
    const text = document.getText();

    const importPatterns = [
      { pattern: /import\s+['"]package:([^'"]+)['"]/g, type: "package import" },
      {
        pattern: /import\s+['"](\.{1,2}\/[^'"]+)['"]/g,
        type: "relative import",
      },
      { pattern: /export\s+['"]package:([^'"]+)['"]/g, type: "package export" },
      {
        pattern: /export\s+['"](\.{1,2}\/[^'"]+)['"]/g,
        type: "relative export",
      },
      { pattern: /part\s+['"]([^'"]+)['"]/g, type: "part" },
    ];

    for (const { pattern, type } of importPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const importPath = match[1];
        this.log(`\nFound ${type}: ${importPath}`);

        let resolvedPath: string | null = null;

        if (importPath.startsWith("package:")) {
          resolvedPath = await this.resolvePackageImport(
            importPath,
            document.uri.fsPath
          );
        } else if (importPath.startsWith(".")) {
          const currentDir = path.dirname(document.uri.fsPath);
          resolvedPath = path.resolve(currentDir, importPath);

          if (!resolvedPath.endsWith(".dart")) {
            resolvedPath += ".dart";
          }

          this.log(`Resolved relative path to: ${resolvedPath}`);
        }

        if (resolvedPath && fs.existsSync(resolvedPath)) {
          this.log(`Successfully resolved to: ${resolvedPath}`);
          imports.add(resolvedPath);
        } else {
          this.log(`Failed to resolve path: ${importPath}`);
        }
      }
    }

    this.log(`Found ${imports.size} valid imports`);
    return imports;
  }

  private static async processFileWithImports(
    filePath: string,
    processedFiles: Set<string> = new Set()
  ): Promise<{ path: string; content: string }[]> {
    if (processedFiles.has(filePath)) {
      return [];
    }

    processedFiles.add(filePath);
    const results: { path: string; content: string }[] = [];

    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      results.push({
        path: filePath,
        content: document.getText(),
      });

      // Find and process imports recursively
      const imports = await this.findImports(document);
      for (const importPath of imports) {
        const importedFiles = await this.processFileWithImports(
          importPath,
          processedFiles
        );
        results.push(...importedFiles);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }

    return results;
  }

  // ... rest of the class implementation remains the same ...
}
