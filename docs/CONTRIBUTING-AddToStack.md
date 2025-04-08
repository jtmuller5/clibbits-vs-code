# Contributing to the AddToStack Feature

This document provides guidance for developers who want to contribute to or enhance the AddToStack feature in the Clibbits VS Code extension.

## Architecture Overview

The AddToStack feature follows a modular architecture, separating concerns for better maintainability:

1. **Main Command (`AddToStackCommand`)**: Orchestrates the workflow and ties all components together
2. **Category Selector (`CategorySelector`)**: Handles the UI for selecting a category
3. **Libbit Selector (`LibbitSelector`)**: Manages the UI for selecting a specific Libbit
4. **Supabase Helper Functions**: Utility functions that interact with the main Supabase client
5. **Types (`Types.ts`)**: Defines the TypeScript interfaces used by the feature

## Component Details

### AddToStackCommand

The main command class that:
- Registers the VS Code command
- Coordinates the flow between UI and data components
- Handles the creation of prompt files
- Manages error handling and user feedback

### CategorySelector

A simple class that:
- Defines the available categories
- Presents a QuickPick UI to the user
- Returns the selected category

### LibbitSelector

Responsible for:
- Formatting Libbit data for display in the QuickPick UI
- Handling the selection process
- Returning the selected Libbit

### Supabase Helper Functions

A collection of utility functions that:
- Leverage the existing Supabase client (from `src/supabase/client.ts`)
- Retrieve Libbits filtered by category through the `getLibbitsByCategory` function
- Fetch Clibbits associated with a selected Libbit through the `getClibbitsByLibbitId` function
- Validate responses and handle errors

## Extension Points

If you want to enhance the feature, here are some suggested areas:

1. **Category Customization**: Allow users to define custom categories or sort them
2. **Search/Filter**: Add search capability within categories
3. **Preview**: Add a preview feature for prompt content before saving
4. **Templates**: Support for custom templates for prompt file generation
5. **Batch Operations**: Allow adding multiple Libbits at once

## Data Flow

The feature follows this data flow:

1. User selects a category via the CategorySelector
2. The `getLibbitsByCategory` function fetches Libbits matching the selected category
3. User selects a specific Libbit via the LibbitSelector
4. The `getClibbitsByLibbitId` function fetches all Clibbits associated with the selected Libbit
5. The command creates the appropriate directories if needed
6. The content is combined and saved as a prompt file
7. The prompt file is opened for the user to review

## Configuration

The feature leverages the existing Supabase client configuration in `src/supabase/client.ts` which has hardcoded values for:
- `SUPABASE_URL`: The Supabase project URL
- `SUPABASE_ANON_KEY`: The anonymous API key for authentication

## Error Handling

The feature implements thorough error handling:
- API connectivity issues
- Authentication failures
- File system operations
- User cancellations

Error messages are displayed to users via the VS Code notification API.

## Testing

Tests are available in `/src/test/addToStack.test.ts` and cover:
- Command registration
- UI component behavior
- API interactions
- Data formatting and handling

When adding or modifying functionality, please update or extend the tests accordingly.

## Debugging

To debug issues:
1. Set a breakpoint in the relevant code
2. Run the "Extension Development Host" debug configuration
3. Execute the command from the Command Palette
4. Check the Debug Console for logs

## API Documentation

For Supabase API details, refer to the Supabase documentation:
- [JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [RESTful API](https://supabase.com/docs/reference/api)

For VS Code extension API details:
- [VS Code API Documentation](https://code.visualstudio.com/api/references/vscode-api)
- [QuickPick API](https://code.visualstudio.com/api/references/vscode-api#QuickPick)
- [FileSystem API](https://code.visualstudio.com/api/references/vscode-api#FileSystem)
