import * as vscode from "vscode";
import { supabaseClient } from "../supabase/client";

export class RequestLibraryCommand {
  public static readonly commandName = "clibbits.requestLibrary";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Ask the user for the library name they want to request
        const libraryName = await vscode.window.showInputBox({
          placeHolder: "Enter the name of the library you'd like to request",
          prompt: "Request a new library to be supported in Clibbits",
          ignoreFocusOut: true,
        });

        // If user canceled or didn't enter anything
        if (!libraryName) {
          return;
        }

        // Get VS Code version and extension version for context
        const vsCodeVersion = vscode.version;
        const extension = vscode.extensions.getExtension("codeontherocks.clibbits");
        const extensionVersion = extension ? extension.packageJSON.version : "unknown";

        // Submit the request to the Supabase database
        const { error } = await supabaseClient
          .from("library_requests")
          .insert({
            library_name: libraryName,
            vs_code_version: vsCodeVersion,
            extension_version: extensionVersion,
            status: "pending",
            requested_at: new Date().toISOString(),
          });

        if (error) {
          throw new Error(`Failed to submit request: ${error.message}`);
        }

        // Show confirmation message to the user
        vscode.window.showInformationMessage(
          `Thanks for your request! We've recorded your interest in adding support for "${libraryName}".`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to submit library request: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
