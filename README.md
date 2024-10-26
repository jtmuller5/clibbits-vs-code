# Clibbits

Clibbits is a Visual Studio Code extension that simplifies copying file contents to your clipboard. Whether you need to copy a single file, multiple selected files, all open files, or specific code blocks, Clibbits provides convenient commands to handle these operations efficiently. This extension was designed for working with LLMs that exist outside of VS Code.

## Features

### 🗎 Copy Single File Contents
- Right-click any file in the explorer
- Select "Clibbits: Copy File Contents to Clipboard"
- The entire contents of the file will be copied to your clipboard

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

### From Command Palette
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Type "Clibbits" to see available commands:
   - "Copy File Contents to Clipboard" - Copies current file
   - "Copy All Open Files to Clipboard" - Copies all open files
   - "Copy Code Block to Clipboard" - Copies the current code block

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

## Release Notes

### 0.6.0
- Added support for copying code blocks (functions, classes, etc.)
- Added keyboard shortcut for copying code blocks
- Added visual feedback when copying code blocks

### 0.5.0
- Complete redesign of the extension
- Added support for copying multiple selected files
- Added support for copying all open files
- Added keyboard shortcuts
- Added file separators for multiple file copying
- Added size limit protection (5MB)

---

**Enjoy using Clibbits!**