import * as vscode from 'vscode';
import * as path from 'path';

interface FileNote {
    id: string;
    fileName: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

let fileNotes: FileNote[] = [];

class FileNotesProvider implements vscode.TreeDataProvider<FileNote> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileNote | undefined | null | void> = new vscode.EventEmitter<FileNote | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileNote | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileNote): vscode.TreeItem {
        return {
            label: element.fileName,
            tooltip: element.content,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: 'fileNote',
            command: {
                command: 'clibbits.viewNote',
                title: 'View Note',
                arguments: [element]
            }
        };
    }

    getChildren(element?: FileNote): Thenable<FileNote[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const currentFileName = path.basename(activeEditor.document.fileName);
                return Promise.resolve(
                    fileNotes.sort((a, b) => 
                        a.fileName === currentFileName ? -1 :
                        b.fileName === currentFileName ? 1 :
                        0
                    )
                );
            }
            return Promise.resolve(fileNotes);
        }
    }
}

class FileSystemProvider implements vscode.FileSystemProvider {
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        // Not implemented for this example
        return new vscode.Disposable(() => {});
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        return {
            type: vscode.FileType.File,
            ctime: Date.now(),
            mtime: Date.now(),
            size: 0
        };
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        // Not implemented for this example
        return [];
    }

    createDirectory(uri: vscode.Uri): void {
        // Not implemented for this example
    }

    readFile(uri: vscode.Uri): Uint8Array {
        const noteId = uri.path.split('/').pop();
        const note = fileNotes.find(n => n.id === noteId);
        if (note) {
            return Buffer.from(`File: ${note.fileName}\n\n${note.content}`);
        }
        throw vscode.FileSystemError.FileNotFound();
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void {
        const noteId = uri.path.split('/').pop();
        const note = fileNotes.find(n => n.id === noteId);
        if (note) {
            const newContent = Buffer.from(content).toString('utf8');
            const [, ...contentParts] = newContent.split('\n\n');
            note.content = contentParts.join('\n\n');
            note.updatedAt = Date.now();
            this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
        }
    }

    delete(uri: vscode.Uri, options: { recursive: boolean; }): void {
        // Not implemented for this example
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void {
        // Not implemented for this example
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Clibbits File Notes extension');

    // Load existing notes
    fileNotes = context.globalState.get('fileNotes', []);

    const fileNotesProvider = new FileNotesProvider();
    const fileSystemProvider = new FileSystemProvider();

    vscode.window.registerTreeDataProvider('clibbitsNotesExplorer', fileNotesProvider);
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('clibbits', fileSystemProvider, { isCaseSensitive: true }));

    const addNoteCommand = vscode.commands.registerCommand('clibbits.addNote', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        let defaultFileName = activeEditor ? path.basename(activeEditor.document.fileName) : '';
        
        const fileName = await vscode.window.showInputBox({ 
            prompt: 'Enter file name',
            value: defaultFileName
        });
        if (!fileName) return;

        const content = await vscode.window.showInputBox({ prompt: 'Enter note content' });
        if (!content) return;

        const newNote: FileNote = {
            id: Date.now().toString(),
            fileName,
            content,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        fileNotes.push(newNote);
        await context.globalState.update('fileNotes', fileNotes);
        fileNotesProvider.refresh();
    });

    const deleteNoteCommand = vscode.commands.registerCommand('clibbits.deleteNote', async (note: FileNote) => {
        fileNotes = fileNotes.filter(n => n.id !== note.id);
        await context.globalState.update('fileNotes', fileNotes);
        fileNotesProvider.refresh();
    });

    const editNoteCommand = vscode.commands.registerCommand('clibbits.editNote', async (note: FileNote) => {
        const newContent = await vscode.window.showInputBox({ prompt: 'Edit note content', value: note.content });
        if (newContent && newContent !== note.content) {
            note.content = newContent;
            note.updatedAt = Date.now();
            await context.globalState.update('fileNotes', fileNotes);
            fileNotesProvider.refresh();
        }
    });

    const viewNoteCommand = vscode.commands.registerCommand('clibbits.viewNote', (note: FileNote) => {
        const uri = vscode.Uri.parse(`clibbits:/${note.id}`);
        vscode.workspace.openTextDocument(uri).then(doc => {
            vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
        });
    });

    context.subscriptions.push(addNoteCommand, deleteNoteCommand, editNoteCommand, viewNoteCommand);

    // Refresh the tree view when the active editor changes
    vscode.window.onDidChangeActiveTextEditor(() => {
        fileNotesProvider.refresh();
    });

    // Listen for text document save events
    vscode.workspace.onDidSaveTextDocument(document => {
        if (document.uri.scheme === 'clibbits') {
            context.globalState.update('fileNotes', fileNotes);
            fileNotesProvider.refresh();
        }
    });
}

export function deactivate() {}