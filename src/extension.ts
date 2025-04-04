import * as vscode from "vscode";
import {
  CopyAllFilesCommand,
  CopyCodeBlockCommand,
  CopyFileCommand,
  CopyFolderRecursiveCommand,
  CopyTreeStructureCommand,
  CopyWithoutCommentsCommand,
  CreateClibbitFolderCommand,
  CreateClibbitCommand,
  AddToClibbitCommand,
} from "./commands";
import { CopyAllFilesWithoutCommentsCommand } from "./commands/copyAllFilesWithoutComments";
import { AddToClibbitCodeLensProvider } from "./providers";

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('Clibbits');
  outputChannel.appendLine('Activating Clibbits extension');
  
  try {
    // Register commands
    outputChannel.appendLine('Registering commands...');
    context.subscriptions.push(
      CopyAllFilesCommand.register(context),
      CopyFileCommand.register(context),
      CopyCodeBlockCommand.register(context),
      CopyFolderRecursiveCommand.register(context),
      CopyWithoutCommentsCommand.register(context),
      CopyAllFilesWithoutCommentsCommand.register(context),
      CopyTreeStructureCommand.register(context),
      CreateClibbitFolderCommand.register(context),
      CreateClibbitCommand.register(context),
      ...AddToClibbitCommand.register(context)
    );
    outputChannel.appendLine('Commands registered successfully');
  
    // Register code lens provider
    outputChannel.appendLine('Registering code lens provider...');
    const codeLensProvider = new AddToClibbitCodeLensProvider();
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        ['*'], // Apply to all files
        codeLensProvider
      )
    );
    outputChannel.appendLine('Code lens provider registered successfully');
    
    // Show a notification that code lens is available
    vscode.window.showInformationMessage('Clibbits: Select code to see the "Add to Clibbit" action');
  } catch (error) {
    outputChannel.appendLine(`Error during activation: ${error}`);
    console.error('Error activating Clibbits:', error);
  }
}

export function deactivate() {}

