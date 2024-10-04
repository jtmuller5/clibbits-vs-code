# Clibbits

[Clibbits](https://marketplace.visualstudio.com/items?itemName=CodeontheRocks.clibbits) is a Visual Studio Code extension that allows you to create and manage project-specific file notes directly within your editor. It provides a quick way to jot down important information about your files and access them easily through a dedicated sidebar.

ID: `CodeontheRocks.clibbits`

## Features

- **Project-Specific Notes**: Create notes linked to specific files in your current project workspace.
- **Sidebar View**: Access all your project notes from a dedicated sidebar in VS Code.
- **Smart Sorting**: Notes for the currently open file are automatically prioritized in the list.
- **Easy Management**: Add, edit, and delete notes directly from the sidebar.
- **Seamless Editing**: Edit your notes in a full VS Code editor with syntax highlighting.
- **Auto-save**: Changes to notes are automatically saved when you save the document.

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS) to open the Quick Open dialog
3. Type `ext install CodeontheRocks.clibbits` to find the extension
4. Click the Install button, then the Enable button

## Usage

### Adding a Note

1. Open a project in VS Code.
2. Click the Clibbits icon in the Activity Bar to open the sidebar.
3. Click the "+" icon at the top of the sidebar.
4. Enter the file name you want to associate the note with (it will default to the currently open file).
5. Enter the content of your note.

### Viewing Notes

- Open the Clibbits sidebar to see all notes for the current project.
- Notes are sorted to prioritize those linked to the currently open file.
- Click on a note in the sidebar to open it in the editor.

### Editing a Note

1. Click on a note in the sidebar to open it in the editor.
2. Make your changes in the editor.
3. Save the document (Ctrl+S or Cmd+S) to persist your changes.

### Deleting a Note

1. Right-click on a note in the sidebar.
2. Select "Delete Note" from the context menu.

## Commands

Clibbits provides the following commands (accessible via the Command Palette - Ctrl+Shift+P or Cmd+Shift+P):

- `Clibbits: Add Project Note`: Add a new note to the current project
- `Clibbits: Delete Project Note`: Delete the selected note from the current project
- `Clibbits: Edit Project Note`: Edit the selected note in the current project
- `Clibbits: View Project Note`: Open the selected note in the editor

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any suggestions, please open an issue on the [GitHub repository](https://github.com/jtmuller5/clibbits).

Enjoy using Clibbits!