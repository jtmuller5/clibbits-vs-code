import * as vscode from "vscode";
import { ContextServer } from "./ContextServer";

export class ServerStatusBar {
  private item: vscode.StatusBarItem;

  constructor(private server: ContextServer) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = "clibbits.showContextServerStatus";
    this.update();
    this.item.show();

    server.onStatusChange(() => this.update());
  }

  update(): void {
    if (this.server.isRunning()) {
      this.item.text = `$(circle-filled) :${this.server.port}`;
      this.item.tooltip = `Clibbits Context Server running on port ${this.server.port}`;
      this.item.color = new vscode.ThemeColor("testing.iconPassed");
    } else {
      this.item.text = `$(circle-filled) Clibbits`;
      this.item.tooltip = "Clibbits Context Server is not running";
      this.item.color = new vscode.ThemeColor("testing.iconFailed");
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
