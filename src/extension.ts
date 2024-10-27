import * as vscode from "vscode";
import {
  CopyAllFilesCommand,
  CopyCodeBlockCommand,
  CopyFileCommand,
  CopyFolderRecursiveCommand,
} from "./commands";

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating Clibbits extension");

  context.subscriptions.push(
    CopyAllFilesCommand.register(context),
    CopyFileCommand.register(context),
    CopyCodeBlockCommand.register(context),
    CopyFolderRecursiveCommand.register(context)  // Add this line
  );
}

export function deactivate() {}
