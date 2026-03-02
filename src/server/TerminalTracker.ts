import * as vscode from "vscode";
import { TerminalCommandRecord, TrackedTerminal } from "./types";

interface TrackedTerminalState {
  terminal: vscode.Terminal;
  history: TerminalCommandRecord[];
}

export class TerminalTracker {
  private terminals = new Map<vscode.Terminal, TrackedTerminalState>();

  activate(context: vscode.ExtensionContext): void {
    // Track already-open terminals
    for (const terminal of vscode.window.terminals) {
      this.trackTerminal(terminal);
    }

    context.subscriptions.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        this.trackTerminal(terminal);
      }),

      vscode.window.onDidCloseTerminal((terminal) => {
        this.terminals.delete(terminal);
      }),

      vscode.window.onDidStartTerminalShellExecution((event) => {
        this.handleExecutionStart(event);
      }),

      vscode.window.onDidEndTerminalShellExecution((event) => {
        this.handleExecutionEnd(event);
      })
    );
  }

  getActiveTerminal(): TrackedTerminal | null {
    const active = vscode.window.activeTerminal;
    if (!active) {
      return null;
    }
    return this.buildTrackedTerminal(active, true);
  }

  getAllTerminals(): TrackedTerminal[] {
    const active = vscode.window.activeTerminal;
    const result: TrackedTerminal[] = [];
    for (const [terminal] of this.terminals) {
      result.push(this.buildTrackedTerminal(terminal, terminal === active));
    }
    return result;
  }

  getTerminalByName(name: string): TrackedTerminal | null {
    for (const [terminal] of this.terminals) {
      if (terminal.name === name) {
        return this.buildTrackedTerminal(
          terminal,
          terminal === vscode.window.activeTerminal
        );
      }
    }
    return null;
  }

  private trackTerminal(terminal: vscode.Terminal): void {
    if (!this.terminals.has(terminal)) {
      this.terminals.set(terminal, { terminal, history: [] });
    }
  }

  private handleExecutionStart(
    event: vscode.TerminalShellExecutionStartEvent
  ): void {
    const state = this.terminals.get(event.terminal);
    if (!state) {
      return;
    }

    const commandLine =
      event.execution.commandLine?.value ?? "";
    const cwd = event.execution.cwd?.fsPath;

    const record: TerminalCommandRecord = {
      command: commandLine,
      cwd,
      startedAt: Date.now(),
      endedAt: undefined,
      exitCode: undefined,
      output: "",
    };

    const maxHistory = vscode.workspace
      .getConfiguration("clibbits")
      .get<number>("terminalHistorySize", 50);

    state.history.push(record);
    if (state.history.length > maxHistory) {
      state.history.shift();
    }

    // Collect output asynchronously
    this.collectOutput(event.execution, record);
  }

  private handleExecutionEnd(
    event: vscode.TerminalShellExecutionEndEvent
  ): void {
    const state = this.terminals.get(event.terminal);
    if (!state) {
      return;
    }

    // Find the most recent record matching this execution
    const commandLine =
      event.execution.commandLine?.value ?? "";
    for (let i = state.history.length - 1; i >= 0; i--) {
      const record = state.history[i];
      if (record.command === commandLine && record.endedAt === undefined) {
        record.endedAt = Date.now();
        record.exitCode = event.exitCode;
        break;
      }
    }
  }

  private async collectOutput(
    execution: vscode.TerminalShellExecution,
    record: TerminalCommandRecord
  ): Promise<void> {
    const maxBytes = vscode.workspace
      .getConfiguration("clibbits")
      .get<number>("terminalMaxOutputBytes", 50000);

    try {
      const stream = execution.read();
      let totalBytes = 0;

      for await (const data of stream) {
        const chunk = typeof data === "string" ? data : data;
        const chunkBytes = Buffer.byteLength(chunk, "utf-8");

        if (totalBytes + chunkBytes > maxBytes) {
          const remaining = maxBytes - totalBytes;
          if (remaining > 0) {
            record.output += chunk.slice(0, remaining);
          }
          record.output += "\n[output truncated]";
          break;
        }

        record.output += chunk;
        totalBytes += chunkBytes;
      }
    } catch {
      // Stream may close unexpectedly — that's fine
    }
  }

  private buildTrackedTerminal(
    terminal: vscode.Terminal,
    isActive: boolean
  ): TrackedTerminal {
    const state = this.terminals.get(terminal);
    const si = terminal.shellIntegration;

    return {
      name: terminal.name,
      pid: undefined, // processId is a Thenable, resolved separately if needed
      cwd: si?.cwd?.fsPath,
      isActive,
      history: state?.history ?? [],
    };
  }
}
