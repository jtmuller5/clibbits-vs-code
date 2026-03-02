import * as http from "http";
import * as vscode from "vscode";
import * as path from "path";
import { ContextAssembler } from "./ContextAssembler";
import {
  OpenCommandBody,
  NavigateCommandBody,
  InsertCommandBody,
  TerminalCommandBody,
  ExecuteCommandBody,
  EditorCommandBody,
  SearchCommandBody,
} from "./types";

export class ContextServer {
  private server: http.Server | null = null;
  private _port: number;
  private _running = false;

  /** Fires when server starts, stops, or encounters an error */
  readonly onStatusChange: vscode.Event<boolean>;
  private statusChangeEmitter = new vscode.EventEmitter<boolean>();

  constructor(
    private assembler: ContextAssembler,
    private outputChannel: vscode.OutputChannel
  ) {
    this._port = vscode.workspace
      .getConfiguration("clibbits")
      .get<number>("contextServer.port", 24891);
    this.onStatusChange = this.statusChangeEmitter.event;
  }

  get port(): number {
    return this._port;
  }

  isRunning(): boolean {
    return this._running;
  }

  async start(): Promise<void> {
    if (this._running) {
      return;
    }

    this._port = vscode.workspace
      .getConfiguration("clibbits")
      .get<number>("contextServer.port", 24891);

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    return new Promise<void>((resolve, reject) => {
      this.server!.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          this.outputChannel.appendLine(
            `Port ${this._port} is already in use. Context server not started.`
          );
          vscode.window.showWarningMessage(
            `Clibbits: Port ${this._port} is already in use. Change clibbits.contextServer.port in settings.`
          );
          this._running = false;
          this.statusChangeEmitter.fire(false);
          reject(err);
        } else {
          this.outputChannel.appendLine(`Server error: ${err.message}`);
          this._running = false;
          this.statusChangeEmitter.fire(false);
          reject(err);
        }
      });

      this.server!.listen(this._port, "127.0.0.1", () => {
        this._running = true;
        this.outputChannel.appendLine(
          `Context server listening on http://127.0.0.1:${this._port}`
        );
        this.statusChangeEmitter.fire(true);
        resolve();
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this._running = false;
      this.statusChangeEmitter.fire(false);
      this.outputChannel.appendLine("Context server stopped");
    }
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // CORS headers for local tool access
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    this.outputChannel.appendLine(`${method} ${url}`);

    if (method === "GET") {
      this.handleGet(url, res);
    } else if (method === "POST") {
      this.readBody(req).then(
        (body) => this.handlePost(url, body, res),
        () => this.sendError(res, 400, "Invalid request body")
      );
    } else {
      this.sendError(res, 405, "Method not allowed");
    }
  }

  private async handleGet(
    url: string,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      switch (url) {
        case "/health":
          this.sendJson(res, {
            status: "ok",
            port: this._port,
            workspace: vscode.workspace.name,
          });
          break;

        case "/context":
          this.sendJson(res, await this.assembler.buildFullContext());
          break;

        case "/context/light":
          this.sendJson(res, this.assembler.buildLightContext());
          break;

        case "/context/terminal":
          this.sendJson(res, this.assembler.buildTerminalContext());
          break;

        case "/vocabulary":
          this.sendJson(res, await this.assembler.buildVocabulary());
          break;

        case "/files":
          this.sendJson(res, await this.assembler.buildFileList());
          break;

        default:
          this.sendError(res, 404, "Not found");
      }
    } catch (err) {
      this.outputChannel.appendLine(`Error handling GET ${url}: ${err}`);
      this.sendError(res, 500, "Internal server error");
    }
  }

  private async handlePost(
    url: string,
    body: Record<string, unknown>,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      switch (url) {
        case "/command/open":
          await this.handleOpenCommand(body as unknown as OpenCommandBody, res);
          break;

        case "/command/navigate":
          await this.handleNavigateCommand(
            body as unknown as NavigateCommandBody,
            res
          );
          break;

        case "/command/insert":
          await this.handleInsertCommand(
            body as unknown as InsertCommandBody,
            res
          );
          break;

        case "/command/terminal":
          await this.handleTerminalCommand(
            body as unknown as TerminalCommandBody,
            res
          );
          break;

        case "/command/execute":
          await this.handleExecuteCommand(
            body as unknown as ExecuteCommandBody,
            res
          );
          break;

        case "/command/editor":
          await this.handleEditorCommand(
            body as unknown as EditorCommandBody,
            res
          );
          break;

        case "/command/search":
          await this.handleSearchCommand(
            body as unknown as SearchCommandBody,
            res
          );
          break;

        default:
          this.sendError(res, 404, "Not found");
      }
    } catch (err) {
      this.outputChannel.appendLine(`Error handling POST ${url}: ${err}`);
      this.sendError(res, 500, "Internal server error");
    }
  }

  // --- POST command handlers ---

  private async handleOpenCommand(
    body: OpenCommandBody,
    res: http.ServerResponse
  ): Promise<void> {
    if (!body.file) {
      this.sendError(res, 400, "Missing 'file' field");
      return;
    }

    const uri = await this.resolveFile(body.file);
    if (!uri) {
      this.sendError(res, 404, `File not found: ${body.file}`);
      return;
    }

    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    this.sendJson(res, { ok: true, opened: uri.fsPath });
  }

  private async handleNavigateCommand(
    body: NavigateCommandBody,
    res: http.ServerResponse
  ): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.sendError(res, 400, "No active editor");
      return;
    }

    if (body.line !== undefined) {
      const pos = new vscode.Position(body.line, 0);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos));
      this.sendJson(res, { ok: true, line: body.line });
    } else if (body.symbol) {
      const symbols = await vscode.commands.executeCommand<
        vscode.DocumentSymbol[]
      >("vscode.executeDocumentSymbolProvider", editor.document.uri);

      const target = this.findSymbol(symbols ?? [], body.symbol);
      if (target) {
        editor.selection = new vscode.Selection(
          target.range.start,
          target.range.start
        );
        editor.revealRange(target.range);
        this.sendJson(res, {
          ok: true,
          symbol: target.name,
          line: target.range.start.line,
        });
      } else {
        this.sendError(res, 404, `Symbol not found: ${body.symbol}`);
      }
    } else if (body.relative) {
      const lines = body.lines ?? 10;
      const currentLine = editor.selection.active.line;
      const newLine =
        body.relative === "up"
          ? Math.max(0, currentLine - lines)
          : Math.min(editor.document.lineCount - 1, currentLine + lines);
      const pos = new vscode.Position(newLine, 0);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos));
      this.sendJson(res, { ok: true, line: newLine });
    } else {
      this.sendError(
        res,
        400,
        "Provide 'line', 'symbol', or 'relative' field"
      );
    }
  }

  private async handleInsertCommand(
    body: InsertCommandBody,
    res: http.ServerResponse
  ): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.sendError(res, 400, "No active editor");
      return;
    }

    if (!body.text) {
      this.sendError(res, 400, "Missing 'text' field");
      return;
    }

    const position = body.position ?? "cursor";

    await editor.edit((editBuilder) => {
      switch (position) {
        case "cursor":
          editBuilder.insert(editor.selection.active, body.text);
          break;
        case "above": {
          const line = editor.selection.active.line;
          editBuilder.insert(new vscode.Position(line, 0), body.text + "\n");
          break;
        }
        case "below": {
          const lineEnd = editor.document.lineAt(
            editor.selection.active.line
          ).range.end;
          editBuilder.insert(lineEnd, "\n" + body.text);
          break;
        }
        case "replace":
          if (!editor.selection.isEmpty) {
            editBuilder.replace(editor.selection, body.text);
          } else {
            editBuilder.insert(editor.selection.active, body.text);
          }
          break;
      }
    });

    this.sendJson(res, { ok: true, position });
  }

  private async handleTerminalCommand(
    body: TerminalCommandBody,
    res: http.ServerResponse
  ): Promise<void> {
    if (!body.text) {
      this.sendError(res, 400, "Missing 'text' field");
      return;
    }

    let terminal: vscode.Terminal | undefined;

    if (body.terminal) {
      terminal = vscode.window.terminals.find(
        (t) => t.name === body.terminal
      );
      if (!terminal) {
        this.sendError(res, 404, `Terminal not found: ${body.terminal}`);
        return;
      }
    } else {
      terminal = vscode.window.activeTerminal;
      if (!terminal) {
        terminal = vscode.window.createTerminal();
      }
    }

    terminal.sendText(body.text);
    terminal.show();
    this.sendJson(res, { ok: true, terminal: terminal.name });
  }

  private async handleExecuteCommand(
    body: ExecuteCommandBody,
    res: http.ServerResponse
  ): Promise<void> {
    if (!body.command) {
      this.sendError(res, 400, "Missing 'command' field");
      return;
    }

    const result = await vscode.commands.executeCommand(
      body.command,
      ...(body.args ?? [])
    );
    this.sendJson(res, { ok: true, result: result ?? null });
  }

  private async handleEditorCommand(
    body: EditorCommandBody,
    res: http.ServerResponse
  ): Promise<void> {
    if (!body.action) {
      this.sendError(res, 400, "Missing 'action' field");
      return;
    }

    const commandMap: Record<string, string> = {
      save: "workbench.action.files.save",
      close: "workbench.action.closeActiveEditor",
      split: "workbench.action.splitEditor",
      format: "editor.action.formatDocument",
      undo: "undo",
      redo: "redo",
    };

    const commandId = commandMap[body.action];
    if (!commandId) {
      this.sendError(res, 400, `Unknown action: ${body.action}`);
      return;
    }

    await vscode.commands.executeCommand(commandId);
    this.sendJson(res, { ok: true, action: body.action });
  }

  private async handleSearchCommand(
    body: SearchCommandBody,
    res: http.ServerResponse
  ): Promise<void> {
    if (!body.query) {
      this.sendError(res, 400, "Missing 'query' field");
      return;
    }

    const type = body.type ?? "text";

    switch (type) {
      case "text":
        await vscode.commands.executeCommand(
          "workbench.action.findInFiles",
          { query: body.query }
        );
        this.sendJson(res, { ok: true, type: "text", query: body.query });
        break;

      case "symbol":
        await vscode.commands.executeCommand(
          "workbench.action.showAllSymbols",
          body.query
        );
        this.sendJson(res, { ok: true, type: "symbol", query: body.query });
        break;

      case "file":
        await vscode.commands.executeCommand(
          "workbench.action.quickOpen",
          body.query
        );
        this.sendJson(res, { ok: true, type: "file", query: body.query });
        break;

      default:
        this.sendError(res, 400, `Unknown search type: ${type}`);
    }
  }

  // --- Helpers ---

  private async resolveFile(fileRef: string): Promise<vscode.Uri | null> {
    const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;

    // Check .clibbits aliases first (done via assembler's file list)
    const files = await this.assembler.buildFileList();
    const byAlias = files.find(
      (f) => f.alias?.toLowerCase() === fileRef.toLowerCase()
    );
    if (byAlias) {
      return vscode.Uri.file(byAlias.path);
    }

    // Try as absolute path
    if (path.isAbsolute(fileRef)) {
      return vscode.Uri.file(fileRef);
    }

    // Try as relative path from workspace root
    if (rootUri) {
      const absPath = path.join(rootUri.fsPath, fileRef);
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(absPath));
        return vscode.Uri.file(absPath);
      } catch {
        // not found, try fuzzy
      }
    }

    // Fuzzy match: find files matching the name
    if (rootUri) {
      const results = await vscode.workspace.findFiles(
        `**/${fileRef}*`,
        "**/node_modules/**",
        1
      );
      if (results.length > 0) {
        return results[0];
      }
    }

    return null;
  }

  private findSymbol(
    symbols: vscode.DocumentSymbol[],
    name: string
  ): vscode.DocumentSymbol | null {
    for (const sym of symbols) {
      if (sym.name.toLowerCase() === name.toLowerCase()) {
        return sym;
      }
      const child = this.findSymbol(sym.children, name);
      if (child) {
        return child;
      }
    }
    return null;
  }

  private readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const text = Buffer.concat(chunks).toString("utf-8");
          resolve(text ? JSON.parse(text) : {});
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
      req.on("error", reject);
    });
  }

  private sendJson(res: http.ServerResponse, data: unknown): void {
    res.writeHead(200);
    res.end(JSON.stringify(data));
  }

  private sendError(
    res: http.ServerResponse,
    status: number,
    message: string
  ): void {
    res.writeHead(status);
    res.end(JSON.stringify({ error: message }));
  }
}
