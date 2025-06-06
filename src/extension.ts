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
  RequestLibraryCommand,
  PasteAsFilesCommand,
  CopyFileHighlightsCommand,
} from "./commands";
import { AddToStackCommand } from "./commands/addToStack";
import { AddComponentsCommand } from "./commands/addComponents";
import { CopyAllFilesWithoutCommentsCommand } from "./commands/copyAllFilesWithoutComments";
import {
  AddToClibbitCodeLensProvider,
  PromptCodeLensProvider,
} from "./providers";
import { initializeSupabaseWithSession } from "./supabase/client";
import { SupabaseStatusBar } from "./supabase/statusBar";
import { AddToClibbitCommand, CreateClibbitCommand, CreateClibbitFolderCommand } from "./commands/prompts";
import { CopyFolderHighlightsRecursiveCommand } from "./commands/copyFolderHighlightsRecursive";

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel("Clibbits");
  outputChannel.appendLine("Activating Clibbits extension");

  // Create a status bar item for Supabase authentication
  const statusBar = new SupabaseStatusBar(context);
  context.subscriptions.push(statusBar);

  try {
    // Initialize Supabase with existing session if available
    outputChannel.appendLine("Initializing Supabase client...");
    context.secrets.get("supabase.session").then((sessionString) => {
      if (sessionString) {
        initializeSupabaseWithSession(sessionString);
        outputChannel.appendLine("Supabase session restored");
      } else {
        outputChannel.appendLine("No Supabase session found");
      }
    });

    // Register commands
    outputChannel.appendLine("Registering commands...");
    context.subscriptions.push(
      CopyAllFilesCommand.register(context),
      CopyFileCommand.register(context),
      CopyCodeBlockCommand.register(context),
      CopyFolderRecursiveCommand.register(context),
      CopyFolderHighlightsRecursiveCommand.register(context),
      CopyWithoutCommentsCommand.register(context),
      CopyAllFilesWithoutCommentsCommand.register(context),
      CopyTreeStructureCommand.register(context),
      CreateClibbitFolderCommand.register(context),
      CreateClibbitCommand.register(context),
      SignInCommand.register(context),
      SignOutCommand.register(context),
      ...AddToClibbitCommand.register(context),
      AddToStackCommand.register(context),
      AddComponentsCommand.register(context),
      RequestLibraryCommand.register(context),
      PasteAsFilesCommand.register(context),
      CopyFileHighlightsCommand.register(context)
    );
    outputChannel.appendLine("Commands registered successfully");

    // Register code lens providers
    outputChannel.appendLine("Registering code lens providers...");
    const addToClibbitCodeLensProvider = new AddToClibbitCodeLensProvider();
    const promptCodeLensProvider = new PromptCodeLensProvider(context);

    /* context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        ["*"], // Apply to all files
        addToClibbitCodeLensProvider
      )
       vscode.languages.registerCodeLensProvider(
        '*', // Apply to all files
        promptCodeLensProvider
      ) 
    ); */
    outputChannel.appendLine("Code lens providers registered successfully");
  } catch (error) {
    outputChannel.appendLine(`Error during activation: ${error}`);
    console.error("Error activating Clibbits:", error);
  }
}

export function deactivate() {}
