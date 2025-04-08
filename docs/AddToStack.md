# Add to Stack

The "Add to Stack" feature allows you to easily add Libbits from the Clibbits cloud to your local prompt stack. This makes it simple to reuse code snippets, patterns, and templates across projects.

## How it works

This command connects to the Supabase database to fetch Libbits (code libraries) and their associated Clibbits (code snippets). It allows you to:

1. Browse Libbits by category
2. Select a specific Libbit from the search results
3. Download all associated Clibbits
4. Save them as a VS Code prompt file (`.prompt.md`) in your workspace

## Using the feature

### 1. Run the Command

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type:
```
Clibbits: Add to Stack
```

### 2. Select a Category

Choose from one of the predefined categories:
- Authentication
- Navigation
- Style
- Structure
- Analytics
- Notifications
- Framework
- Syntax

### 3. Select a Libbit

A dropdown list will show all available Libbits in the selected category. Each item displays:
- Libbit name
- Number of associated Clibbits
- Description (if available)

### 4. Prompt File Creation

After selecting a Libbit, the extension will:
1. Create the `.github/prompts/clibbits` folder in your workspace (if it doesn't exist)
2. Create a prompt file named after the selected Libbit
3. Add all the Clibbit content to the prompt file
4. Open the file for you to review

## How It Works Behind The Scenes

This command connects to the Supabase database using the existing client configuration to fetch and process data. The entire process is seamless for the end user - simply select options from the dropdown menus, and the extension handles everything else.

## Prompt Files and GitHub Copilot

The prompt files created by this command follow the VS Code prompt file format as described in the [VS Code documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_reusable-prompt-files-experimental). This means they can be used with GitHub Copilot to provide additional context to your AI interactions.

To use a prompt file with GitHub Copilot:
1. Open the Copilot Chat panel
2. Click the "Attach Context" icon (⌘/ or Ctrl+/)
3. Select "Prompt..."
4. Choose the prompt file you created

## Tips

- Prompt files are saved in the `.github/prompts/clibbits` folder, making them easily discoverable by VS Code's prompt file feature
- Each file includes metadata about the Libbit (category, description) for better context
- You can edit the prompt files after creation to customize them for your specific needs
