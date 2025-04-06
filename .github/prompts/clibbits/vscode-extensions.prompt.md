# vscode-extensions

## Instructions
Instructions for how to use this prompt file.

## Context
```ini
// From Untitled-1
Structure of src:
└── src/
    ├── commands/
    │   ├── commandOne.ts
    │   ├── commandTwo.ts
    │   └── index.ts
    ├── providers/
    │   ├── languageProvider.ts
    │   └── codeLensprovider.ts
    ├── utils/
    │   ├── common.ts
    │   └── index.ts
    ├── extension.ts
    └── utils.ts
```
```json
// From package.json
"publisher": "codeontherocks",
  "icon": "clibbits.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/jtmuller5/clibbits"
  },
  "categories": [
    "Other"
  ],
```
### .vscode/tasks.json

```json
{
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Package Extension",
        "type": "shell",
        "command": "vsce",
        "args": ["package"],
        "group": {
          "kind": "build",
          "isDefault": false
        },
        "problemMatcher": ["$tsc"]
      },
      {
        "label": "Publish Package",
        "type": "shell",
        "command": "vsce",
        "args": ["publish", "${input:versionType}"],
        "group": {
          "kind": "build",
          "isDefault": false
        },
        "problemMatcher": ["$tsc"]
      },
      {
        "label": "Show Package Stats",
        "type": "shell",
        "command": "vsce",
        "args": ["show", "CodeontheRocks.clibbits"],
        "group": {
          "kind": "build",
          "isDefault": false
        },
        "problemMatcher": ["$tsc"]
      },
      {
        "type": "npm",
        "script": "watch",
        "problemMatcher": "$tsc-watch",
        "isBackground": true,
        "presentation": {
          "reveal": "never"
        },
        "group": {
          "kind": "build",
          "isDefault": true
        }
      }
    ],
    "inputs": [
      {
        "id": "versionType",
        "type": "pickString",
        "options": ["major", "minor", "patch"],
        "default": "minor",
        "description": "Select the version type to publish"
      }
    ]
  }
  
```


```
// Code snippets will be added here
```

## Files

