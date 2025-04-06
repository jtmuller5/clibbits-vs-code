import * as vscode from "vscode";
import { supabaseClient } from "../supabase/client";
import { SupabaseStatusBar } from "../supabase/statusBar";

export class SignOutCommand {
  public static readonly commandName = "clibbits.signOut";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Show progress notification
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Signing out...",
            cancellable: false,
          },
          async () => {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
              throw new Error(error.message);
            }

            // Clear the stored session
            await context.secrets.delete('supabase.session');
            
            // Update status bar
            const statusBar = new SupabaseStatusBar(context);
            statusBar.update();
            
            vscode.window.showInformationMessage("Successfully signed out");
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Sign out failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  }
}
