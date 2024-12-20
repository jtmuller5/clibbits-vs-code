import * as vscode from "vscode";
import {
  CopyAllFilesCommand,
  CopyCodeBlockCommand,
  CopyFileCommand,
  CopyFolderRecursiveCommand,
  CopyWithoutCommentsCommand,
} from "./commands";
import { CopyAllFilesWithoutCommentsCommand } from "./commands/copyAllFilesWithoutComments";

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating Clibbits extension");

  context.subscriptions.push(
    CopyAllFilesCommand.register(context),
    CopyFileCommand.register(context),
    CopyCodeBlockCommand.register(context),
    CopyFolderRecursiveCommand.register(context),
    CopyWithoutCommentsCommand.register(context),
    CopyAllFilesWithoutCommentsCommand.register(context)
  );
}

export function deactivate() {}
