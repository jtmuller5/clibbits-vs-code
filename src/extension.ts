import * as vscode from 'vscode';
import * as path from 'path';

interface FileNote {
    id: string;
    fileName: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

interface ProjectNotes {
    [projectPath: string]: FileNote[];
}

let projectNotes: ProjectNotes = {};

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
            const currentProjectPath = getCurrentProjectPath();
            if (currentProjectPath) {
                const currentNotes = projectNotes[currentProjectPath] || [];
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    const currentFileName = path.basename(activeEditor.document.fileName);
                    return Promise.resolve(
                        currentNotes.sort((a, b) => 
                            a.fileName === currentFileName ? -1 :
                            b.fileName === currentFileName ? 1 :
                            0
                        )
                    );
                }
                return Promise.resolve(currentNotes);
            }
            return Promise.resolve([]);
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
        const currentProjectPath = getCurrentProjectPath();
        
        if (!currentProjectPath) {
            throw vscode.FileSystemError.FileNotFound();
        }

        const projectFileNotes = projectNotes[currentProjectPath] || [];
        const note = projectFileNotes.find(n => n.id === noteId);
        
        if (note) {
            return Buffer.from(`File: ${note.fileName}\n\n${note.content}`);
        }
        throw vscode.FileSystemError.FileNotFound();
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void {
        const noteId = uri.path.split('/').pop();
        const currentProjectPath = getCurrentProjectPath();
        
        if (!currentProjectPath) {
            throw vscode.FileSystemError.FileNotFound();
        }

        const projectFileNotes = projectNotes[currentProjectPath] || [];
        const note = projectFileNotes.find(n => n.id === noteId);
        
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

function getCurrentProjectPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return undefined;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Clibbits File Notes extension');

    // Load existing notes
    projectNotes = context.globalState.get('projectNotes', {});

    const fileNotesProvider = new FileNotesProvider();
    const fileSystemProvider = new FileSystemProvider();

    vscode.window.registerTreeDataProvider('clibbitsNotesExplorer', fileNotesProvider);
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('clibbits', fileSystemProvider, { isCaseSensitive: true }));

    const addNoteCommand = vscode.commands.registerCommand('clibbits.addNote', async () => {
        const currentProjectPath = getCurrentProjectPath();
        if (!currentProjectPath) {
            vscode.window.showErrorMessage('No active project found. Please open a workspace to add notes.');
            return;
        }

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

        if (!projectNotes[currentProjectPath]) {
            projectNotes[currentProjectPath] = [];
        }
        projectNotes[currentProjectPath].push(newNote);
        await context.globalState.update('projectNotes', projectNotes);
        fileNotesProvider.refresh();
    });

    const deleteNoteCommand = vscode.commands.registerCommand('clibbits.deleteNote', async (note: FileNote) => {
        const currentProjectPath = getCurrentProjectPath();
        if (currentProjectPath && projectNotes[currentProjectPath]) {
            projectNotes[currentProjectPath] = projectNotes[currentProjectPath].filter(n => n.id !== note.id);
            await context.globalState.update('projectNotes', projectNotes);
            fileNotesProvider.refresh();
        }
    });

    const editNoteCommand = vscode.commands.registerCommand('clibbits.editNote', async (note: FileNote) => {
        const currentProjectPath = getCurrentProjectPath();
        if (!currentProjectPath) return;

        const newContent = await vscode.window.showInputBox({ prompt: 'Edit note content', value: note.content });
        if (newContent && newContent !== note.content) {
            const projectFileNotes = projectNotes[currentProjectPath];
            const updatedNote = projectFileNotes.find(n => n.id === note.id);
            if (updatedNote) {
                updatedNote.content = newContent;
                updatedNote.updatedAt = Date.now();
                await context.globalState.update('projectNotes', projectNotes);
                fileNotesProvider.refresh();
            }
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
            context.globalState.update('projectNotes', projectNotes);
            fileNotesProvider.refresh();
        }
    });

    // Refresh the tree view when switching projects
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        fileNotesProvider.refresh();
    });
}

export function deactivate() {}