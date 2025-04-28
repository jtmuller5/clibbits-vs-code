# Using CopyFileHighlights

The CopyFileHighlights feature allows you to mark specific sections of your code to be copied, rather than copying the entire file. This is useful when you want to focus on specific parts of the code that are relevant for AI assistants or documentation.

## How to Use

1. Mark the beginning and end of each section you want to highlight with a line containing `!clibbits`.
2. Right-click on the file in the explorer or editor and select "Copy Highlights for AI" from the context menu.
3. The marked sections will be copied to your clipboard, preserving the language syntax highlighting.

## Example

See `example-with-highlights.ts` in this directory for a practical example of how to use this feature.

```typescript
// This part won't be copied

// !clibbits
/**
 * This function WILL be copied when using CopyFileHighlights
 */
function importantFunction() {
  console.log("This is important");
}
// !clibbits

// This part won't be copied
```

## Benefits

- **Focused Context**: Provide AI assistants with only the relevant parts of your code.
- **Multiple Sections**: You can mark multiple non-contiguous sections in a file.
- **Maintains Format**: Preserves code formatting and syntax highlighting.
- **Works with All File Types**: Works with any text-based file.

## Tips

- Use this feature when you only want to share specific parts of a file with AI assistants.
- Add meaningful comments inside the highlighted sections to provide context.
- You can have as many highlighted sections as needed within a single file.
- All highlighted sections will be combined in the output, separated by blank lines.