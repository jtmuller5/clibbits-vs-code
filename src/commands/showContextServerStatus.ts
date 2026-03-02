import * as vscode from "vscode";
import { ContextServer } from "../server/ContextServer";

export class ShowContextServerStatusCommand {
  static readonly commandName = "clibbits.showContextServerStatus";

  static register(server: ContextServer): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      if (server.isRunning()) {
        const url = `http://127.0.0.1:${server.port}`;
        const action = await vscode.window.showInformationMessage(
          `Clibbits Context Server running at ${url}`,
          "Copy URL"
        );
        if (action === "Copy URL") {
          await vscode.env.clipboard.writeText(url);
          vscode.window.showInformationMessage("Server URL copied to clipboard");
        }
      } else {
        vscode.window.showWarningMessage(
          "Clibbits Context Server is not running. Check output for errors."
        );
      }
    });
  }
}
