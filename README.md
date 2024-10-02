# Clibbits

[Clibbits](https://marketplace.visualstudio.com/items?itemName=CodeontheRocks.clibbits) is a Visual Studio Code extension that allows you to manage and use custom code snippets with ease. It provides a quick way to access your snippets, tracks usage statistics, and supports both global and workspace-specific snippets.

## Features

- **Custom Snippets**: Define your own snippets in VS Code settings, either globally or per workspace.
- **Quick Access**: Access your snippets via the command palette, context menu, or keyboard shortcut.
- **Usage Tracking**: Automatically tracks how often each snippet is used and when it was last used.
- **Statistics View**: View usage statistics for all your snippets.
- **Smart Sorting**: Snippets are sorted by usage count, putting your most-used snippets at the top.
- **Workspace Support**: Create project-specific snippets that only appear in the current workspace.

## Installation

1. Download the `.vsix` file from the [releases page](https://github.com/yourusername/clibbits/releases) (replace with actual link when available).
2. Open Visual Studio Code.
3. Go to the Extensions view (Ctrl+Shift+X).
4. Click on the "..." (More Actions) at the top of the Extensions view.
5. Choose "Install from VSIX...".
6. Navigate to and select the downloaded `.vsix` file.
7. Reload VS Code when prompted.

## Usage

### Adding Snippets

There are three ways to add snippets:

1. **Via Settings**: 
   - For global snippets:
     - Open VS Code settings (File > Preferences > Settings)
     - Search for "Clibbits"
     - Edit the `clibbits.snippets` setting to add your snippets in JSON format
   - For workspace-specific snippets:
     - Open the workspace settings (File > Preferences > Settings, then click on "Workspace" tab)
     - Edit the `clibbits.snippets` setting in the workspace settings

   Example:
   ```json
   "clibbits.snippets": [
     {
       "name": "Console log",
       "snippet": "console.log();"
     }
   ]
   ```

2. **Dynamically**:
   - Open the Command Palette (Ctrl+Shift+P)
   - Search for "Clibbits: Add New Snippet"
   - Follow the prompts to enter the snippet name and content
   - The snippet will be added to your workspace settings

3. **Saving Selected Text as a Snippet**:
  1. Select the text you want to save as a snippet in the editor.
  2. Right-click to open the context menu.
  3. Choose "Clibbits: Save as Snippet".
  4. Enter a name for your new snippet when prompted.

### Using Snippets

- Right-click in the editor to access the Clibbits menu in the context menu.
- Use the keyboard shortcut Ctrl+Shift+C (Cmd+Shift+C on Mac) to open the snippet menu.
- Use the Command Palette and search for "Clibbits: Open Snippet Menu".

### Viewing Statistics

- Open the Command Palette (Ctrl+Shift+P)
- Search for "Clibbits: Show Snippet Statistics"

The new snippet will be saved to your workspace settings and will be immediately available for use.

## Configuration

Clibbits can be configured through VS Code settings. The available settings are:

- `clibbits.snippets`: An array of snippet objects, each containing a `name` and `snippet` property. This can be set in both user and workspace settings.

## Workspace vs. Global Snippets

- Snippets defined in user settings are available in all workspaces.
- Snippets defined in workspace settings are only available in that specific workspace.
- Workspace settings override user settings for the `clibbits.snippets` configuration.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any suggestions, please open an issue on the [GitHub repository](https://github.com/jtmuller5/clibbits?tab=readme-ov-file).

Enjoy using Clibbits!