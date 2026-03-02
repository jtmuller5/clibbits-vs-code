import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { ClibbitConfigFile } from "./types";

export class ClibbitConfig {
  private config: ClibbitConfigFile | null = null;
  private watcher: vscode.FileSystemWatcher | undefined;

  activate(context: vscode.ExtensionContext): void {
    this.loadConfig();

    const configFileName = vscode.workspace
      .getConfiguration("clibbits")
      .get<string>("configFileName", ".clibbits");

    this.watcher = vscode.workspace.createFileSystemWatcher(
      `**/${configFileName}`
    );

    this.watcher.onDidCreate(() => this.loadConfig());
    this.watcher.onDidChange(() => this.loadConfig());
    this.watcher.onDidDelete(() => {
      this.config = null;
    });

    context.subscriptions.push(this.watcher);
  }

  get(): ClibbitConfigFile | null {
    return this.config;
  }

  private loadConfig(): void {
    const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!rootUri) {
      this.config = null;
      return;
    }

    const configFileName = vscode.workspace
      .getConfiguration("clibbits")
      .get<string>("configFileName", ".clibbits");

    const configPath = path.join(rootUri.fsPath, configFileName);

    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      this.config = YAML.parse(raw) as ClibbitConfigFile;
    } catch {
      this.config = null;
    }
  }
}
