import * as vscode from "vscode";
import { supabaseClient } from "../supabase/client";
import { SupabaseStatusBar } from "../supabase/statusBar";

export class SignInCommand {
  public static readonly commandName = "clibbits.signIn";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Get user email
        const email = await vscode.window.showInputBox({
          prompt: "Enter your email address",
          placeHolder: "email@example.com",
          validateInput: (value) => {
            return value && value.includes("@") ? null : "Please enter a valid email address";
          }
        });

        if (!email) {
          return; // User cancelled
        }

        // Get user password
        const password = await vscode.window.showInputBox({
          prompt: "Enter your password",
          password: true,
          validateInput: (value) => {
            return value && value.length >= 6 ? null : "Password must be at least 6 characters";
          }
        });

        if (!password) {
          return; // User cancelled
        }

        // Show progress notification
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Signing in...",
            cancellable: false,
          },
          async () => {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              throw new Error(error.message);
            }

            // Store the session in extension storage
            await context.secrets.store('supabase.session', JSON.stringify(data.session));
            
            // Update status bar
            const statusBar = new SupabaseStatusBar(context);
            statusBar.update();
            
            // Refresh code lens to update button states
            try {
              await vscode.commands.executeCommand('clibbits.refreshCodeLens');
            } catch (err) {
              console.error('Error refreshing code lens:', err);
            }
            
            vscode.window.showInformationMessage(`Successfully signed in as ${email}`);
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Sign in failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  }
}
