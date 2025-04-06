import * as vscode from "vscode";
import {
  CopyAllFilesCommand,
  CopyCodeBlockCommand,
  CopyFileCommand,
  CopyFolderRecursiveCommand,
  CopyTreeStructureCommand,
  CopyWithoutCommentsCommand,
  SignInCommand,
  SignOutCommand,
} from "./commands";
import { CopyAllFilesWithoutCommentsCommand } from "./commands/copyAllFilesWithoutComments";
import { AddToClibbitCodeLensProvider } from "./providers";
import { initializeSupabaseWithSession } from "./supabase/client";
import { SupabaseStatusBar } from "./supabase/statusBar";
import { CreateClibbitFolderCommand, CreateClibbitCommand, ExportClibbitCommand, ImportClibbitCommand, AddToClibbitCommand } from "./commands/prompts";

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('Clibbits');
  outputChannel.appendLine('Activating Clibbits extension');
  
  // Create a status bar item for Supabase authentication
  const statusBar = new SupabaseStatusBar(context);
  context.subscriptions.push(statusBar);
  
  try {
    // Initialize Supabase with existing session if available
    outputChannel.appendLine('Initializing Supabase client...');
    context.secrets.get('supabase.session').then(sessionString => {
      if (sessionString) {
        initializeSupabaseWithSession(sessionString);
        outputChannel.appendLine('Supabase session restored');
      } else {
        outputChannel.appendLine('No Supabase session found');
      }
    });
    
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
      ExportClibbitCommand.register(context),
      ImportClibbitCommand.register(context),
      SignInCommand.register(context),
      SignOutCommand.register(context),
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
  } catch (error) {
    outputChannel.appendLine(`Error during activation: ${error}`);
    console.error('Error activating Clibbits:', error);
  }
}

export function deactivate() {}

