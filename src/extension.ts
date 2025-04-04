import * as vscode from "vscode";
import {
  CopyAllFilesCommand,
  CopyCodeBlockCommand,
  CopyFileCommand,
  CopyFolderRecursiveCommand,
  CopyTreeStructureCommand,
  CopyWithoutCommentsCommand,
  CreatePromptFolderCommand,
  CreatePromptFileCommand,
  AddToPromptFileCommand,
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
    CopyAllFilesWithoutCommentsCommand.register(context),
    CopyTreeStructureCommand.register(context),
    CreatePromptFolderCommand.register(context),
    CreatePromptFileCommand.register(context),
    ...AddToPromptFileCommand.register(context)
  );
}

export function deactivate() {}
