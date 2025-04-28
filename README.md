Clibbits is a Visual Studio Code extension that makes vibe coding more enjoyable 😎

1. Simplifies copying file contents to your clipboard. Copy entire files, open editors, or directories to your clipboard.
2. Makes importing technical documentation a breeze. Search for docs related to authentication, navigation, analytics, and more and instantly add them to your project.

## Features

### 🗎 Copy Single File Contents
- Right-click any file in the explorer
- Select "Clibbits: Copy File Contents to Clipboard"
- The entire contents of the file will be copied to your clipboard

### 🗑️ Copy Without Comments
- Right-click in the editor or use the title bar icon
- Select "Clibbits: Copy Without Comments"
- The file contents will be copied with all comments removed
- Both single-line (//) and block comments (/* */) are removed
- Empty lines left by removed comments are cleaned up

### 📚 Copy Multiple Selected Files
- Select multiple files in the explorer (using Ctrl/Cmd + Click or Shift + Click)
- Right-click on any selected file
- Choose "Clibbits: Copy File Contents to Clipboard"
- All selected files will be copied with clear separators between them

### 📂 Copy All Open Files
- Use the keyboard shortcut `Ctrl+Shift+C` (Windows/Linux) or `Cmd+Shift+C` (Mac)
- Or open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type "Clibbits: Copy All Open Files"
- Contents of all currently open files will be copied to your clipboard

### 🧩 Copy Code Block
- Right-click anywhere inside a code block (function, class, etc.)
- Select "Clibbits: Copy Code Block to Clipboard"
- Or use the keyboard shortcut `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac)
- The entire code block will be copied to your clipboard

### 🔍 Copy File Highlights
- Mark sections of your code with `!clibbits` markers
- Right-click the file in the explorer or editor
- Select "Clibbits: Copy Highlights for AI"
- Only the marked sections will be copied to your clipboard
- Great for focusing on specific parts of large files
- See the [examples](./examples/) directory for more details

### 📁 Copy Folder Contents
- Right-click any folder in the explorer
- Select "Clibbits: Copy Folder Contents to Clipboard"
- All text files in the folder and its subfolders will be copied recursively
- Files are organized with clear separators and relative paths
- System folders (like node_modules, .git) are automatically excluded

### 🌳 Copy Tree Structure
- Right-click any folder or file in the explorer
- Select "Clibbits: Copy Tree Structure"
- Creates an ASCII tree diagram showing the folder/file hierarchy
- Directories are sorted first, followed by files (alphabetically within each group)
- Each folder is marked with a trailing slash (/) for easy identification
- System folders (like node_modules, .git) are automatically excluded
- Perfect for documenting project structures or sharing folder organization in discussions

### 🔍 Add Stack Context
- Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Select "Clibbits: Add to Stack"
- Choose a category and select an item from the search results
- The extension will create a prompt file with all associated documentation in the `.github/prompts/clibbits` directory

### 🎨 Add Components
- Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Select "Clibbits: Add Components"
- Choose a component from the available Style components
- The extension will automatically create prompt files for the selected components in the `.github/prompts/clibbits` directory
- This command is specifically for adding UI style components, skipping the category selection

### 🔎 Search Clibbits
- Open the Command Palette
- Select "Clibbits: Search Clibbits"
- Search for an exact term with quotes or a general term using similarity matching
- Select the clibbit you want and it will be added to your project

#### Example Clibbit Structure

````markdown
# analytics

## Description
Prompt file for analyzing application metrics and generating reports.

## Instructions
Use this prompt to generate analytics reports or debug performance issues.

## Context
```typescript
// From analytics.ts
function calculateMetrics(data: MetricsData[]): MetricsSummary {
  // Code snippet that was copied from the editor
  return { ... };
}
```

## Files
- [src/utils/analytics.ts](../../../src/utils/analytics.ts)
- [src/components/AnalyticsChart.tsx](../../../src/components/AnalyticsChart.tsx)
````

#### Tree Structure Example

```
Structure of my-project:
└── my-project/
    ├── src/
    │   ├── components/
    │   │   ├── Button.tsx
    │   │   └── Input.tsx
    │   └── utils/
    │       └── helpers.ts
    ├── tests/
    │   └── components/
    │       └── Button.test.tsx
    ├── package.json
    └── tsconfig.json
```

## File Format

### Single File
When copying a single file, only the file contents are copied to the clipboard.

### Multiple Files
When copying multiple files, the contents are formatted as follows:
```
=== filename1.txt ===

[Contents of file 1]

=== filename2.txt ===

[Contents of file 2]
```

### Code Blocks
When copying a code block, the entire block including its declaration is copied. For example:
```
function example() {
    // This entire block will be copied
    // including the function declaration
}
```

### Highlights
When using the Copy File Highlights feature, only the text between `!clibbits` markers is copied:

```
// This part won't be copied

// !clibbits
/**
 * This function will be copied
 */
function importantFunction() {
  // This code will be copied
}
// !clibbits

// This part won't be copied
```

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS) to open the Quick Open dialog
3. Type `ext install CodeontheRocks.clibbits` and press Enter

## Usage Examples

### From File Explorer
1. Single File:
   - Right-click on any file
   - Select "Clibbits: Copy File Contents to Clipboard"

2. Multiple Files:
   - Select multiple files using Ctrl/Cmd + Click
   - Right-click on any selected file
   - Choose "Clibbits: Copy File Contents to Clipboard"

### From Editor
1. Copy File:
   - Right-click in the editor
   - Select "Clibbits: Copy File Contents to Clipboard"

2. Copy Code Block:
   - Right-click anywhere inside a code block (function, class, etc.)
   - Select "Clibbits: Copy Code Block to Clipboard"
   - The block will be briefly highlighted to show what was copied

3. Copy Highlights:
   - Add `!clibbits` markers in your file to highlight important sections
   - Right-click in the editor
   - Select "Clibbits: Copy Highlights for AI"
   - Only the text between the markers will be copied

### From Command Palette
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Type "Clibbits" to see available commands:
   - "Copy File Contents to Clipboard" - Copies current file
   - "Copy All Open Files to Clipboard" - Copies all open files
   - "Copy Code Block to Clipboard" - Copies the current code block

## Using Clibbits with GitHub Copilot

Clibbits helps you find reusable prompt files (clibbits) that can be used with GitHub Copilot to provide context. To add Clibbits, use the `Clibbits: Add to Stack` command to search the database for docs. Select the library you want and those docs will be added to the `.github/prompts/clibbits` directory.

After importing your clibbits:

1. Enable prompt files in VS Code:
   - Go to Settings and enable `chat.promptFiles`
   - Add `.github/prompts` to your `chat.promptFilesLocations` setting

2. Use your clibbits with Copilot:
   - In Copilot Chat, click the "Attach Context" icon (⌘/ or Ctrl+/)
   - Select "Prompt..."
   - Choose your clibbit from the list
   - Copilot will have access to all the code snippets and file links

3. Learn more about prompt files in the [VS Code documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_reusable-prompt-files-experimental)

## Configuration

Clibbits offers the following configuration options:

- `clibbits.enableCodeLens` - Enable/disable the Code Lens feature that appears when you select code (default: `true`)

To change these settings:

1. Open VS Code settings (File > Preferences > Settings or `Ctrl+,`)
2. Search for "Clibbits"
3. Adjust the settings according to your preferences

## Limitations

- Maximum combined file size: 5MB
- Text files only (binary files are not supported)
- Code block copying works with curly-brace based code blocks

## Keyboard Shortcuts

- `Ctrl+Shift+C` (Windows/Linux) or `Cmd+Shift+C` (Mac): Copy all open files to clipboard
- `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac): Copy current code block to clipboard

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/jtmuller5/clibbits).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have suggestions, please open an issue on the [GitHub repository](https://github.com/jtmuller5/clibbits).

---

**Enjoy using Clibbits!**