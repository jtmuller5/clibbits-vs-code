import * as vscode from "vscode";
import {
  CopyAllFilesCommand,
  CopyCodeBlockCommand,
  CopyFileCommand,
  CopyFolderRecursiveCommand,
  CopyTreeStructureCommand,
  CopyWithoutCommentsCommand,
  PasteAsFilesCommand,
  CopyFileHighlightsCommand,
  ShowContextServerStatusCommand,
  InitializeClibbitConfigCommand,
} from "./commands";
import { CopyAllFilesWithoutCommentsCommand } from "./commands/copyAllFilesWithoutComments";
import {
  AddToClibbitCodeLensProvider,
  PromptCodeLensProvider,
} from "./providers";
import { AddToClibbitCommand, CreateClibbitCommand, CreateClibbitFolderCommand } from "./commands/prompts";
import { CopyFolderHighlightsRecursiveCommand } from "./commands/copyFolderHighlightsRecursive";
import { ClibbitConfig } from "./server/ClibbitConfig";
import { TerminalTracker } from "./server/TerminalTracker";
import { ContextAssembler } from "./server/ContextAssembler";
import { ContextServer } from "./server/ContextServer";
import { ServerStatusBar } from "./server/ServerStatusBar";

let contextServer: ContextServer | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel("Clibbits");
  outputChannel.appendLine("Activating Clibbits extension");

  try {
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
      ...AddToClibbitCommand.register(context),
      PasteAsFilesCommand.register(context),
      CopyFileHighlightsCommand.register(context),
      InitializeClibbitConfigCommand.register()
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

    // Context Server setup
    const serverEnabled = vscode.workspace
      .getConfiguration("clibbits")
      .get<boolean>("contextServer.enabled", true);

    if (serverEnabled) {
      outputChannel.appendLine("Starting context server...");

      const clibbitConfig = new ClibbitConfig();
      clibbitConfig.activate(context);

      const terminalTracker = new TerminalTracker();
      terminalTracker.activate(context);

      const assembler = new ContextAssembler(terminalTracker, clibbitConfig);
      assembler.activate(context);

      contextServer = new ContextServer(assembler, outputChannel);

      const statusBar = new ServerStatusBar(contextServer);
      context.subscriptions.push({ dispose: () => statusBar.dispose() });

      context.subscriptions.push(
        ShowContextServerStatusCommand.register(contextServer)
      );

      contextServer.start().then(
        () => outputChannel.appendLine("Context server started"),
        (err) => outputChannel.appendLine(`Context server failed to start: ${err}`)
      );

      context.subscriptions.push({
        dispose: () => {
          contextServer?.stop();
          contextServer = undefined;
        },
      });
    } else {
      outputChannel.appendLine("Context server is disabled");
    }
  } catch (error) {
    outputChannel.appendLine(`Error during activation: ${error}`);
    console.error("Error activating Clibbits:", error);
  }
}

export function deactivate() {
  contextServer?.stop();
  contextServer = undefined;
}
