import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { supabaseClient } from "../supabase/client";
import matter from 'gray-matter';
import { Clibbit } from "./shareClibbit";

export class SearchClibbitsCommand {
  public static readonly commandName = "clibbits.searchClibbits";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // First, check if user is signed in
        const sessionStr = await context.secrets.get('supabase.session');
        if (!sessionStr) {
          vscode.window.showInformationMessage(
            "You need to sign in to search clibbits",
            "Sign In"
          ).then(selection => {
            if (selection === "Sign In") {
              vscode.commands.executeCommand("clibbits.signIn");
            }
          });
          return;
        }

        // Get search query from user
        const searchQuery = await vscode.window.showInputBox({
          prompt: "Enter search term for clibbits",
          placeHolder: "Search by title...",
        });

        if (!searchQuery) {
          return; // User cancelled
        }

        // Show progress indicator
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Searching clibbits...",
            cancellable: false,
          },
          async (progress) => {
            // Search for clibbits where title contains the query (case insensitive)
            const { data: clibbits, error } = await supabaseClient
              .from('clibbits')
              .select('*')
              .ilike('title', `%${searchQuery}%`)
              .order('title', { ascending: true });

            if (error) {
              throw new Error(error.message);
            }

            if (!clibbits || clibbits.length === 0) {
              vscode.window.showInformationMessage(`No clibbits found matching "${searchQuery}"`);
              return;
            }

            // Create QuickPick items
            const items = clibbits.map(clibbit => ({
              label: clibbit.title,
              description: `Tags: ${clibbit.tags.join(', ')}`,
              detail: clibbit.content_preview,
              clibbit: clibbit
            }));

            // Show QuickPick with results
            const selected = await vscode.window.showQuickPick(items, {
              placeHolder: `Found ${clibbits.length} clibbits. Select one to load...`,
              matchOnDescription: true,
              matchOnDetail: true
            });

            if (!selected) {
              return; // User cancelled
            }

            // Get the selected clibbit
            const clibbit = selected.clibbit as Clibbit;

            // Create folder path
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
              throw new Error("No workspace folder open");
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const clibbitsFolder = path.join(rootPath, '.github', 'prompts', 'clibbits');

            // Create the directory if it doesn't exist
            if (!fs.existsSync(clibbitsFolder)) {
              fs.mkdirSync(clibbitsFolder, { recursive: true });
            }

            // Convert title to kebab-case for the filename
            const kebabCaseTitle = clibbit.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');

            const filePath = path.join(clibbitsFolder, `${kebabCaseTitle}.prompt.md`);

            // Create the frontmatter with only defined values
            const frontmatter: Record<string, any> = {
              id: clibbit.id,
              title: clibbit.title,
              tags: clibbit.tags || []
            };
            
            // Only add optional fields if they exist and are not null/undefined
            if (clibbit.prompt) frontmatter.prompt = clibbit.prompt;
            if (clibbit.instructions) frontmatter.instructions = clibbit.instructions;
            if (clibbit.sources && Array.isArray(clibbit.sources) && clibbit.sources.length > 0) {
              frontmatter.sources = clibbit.sources;
            }

            // Create file content with frontmatter
            const fileContent = matter.stringify(clibbit.content, frontmatter);

            // Write to file
            fs.writeFileSync(filePath, fileContent);

            // Open the file in the editor
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);

            vscode.window.showInformationMessage(`Loaded clibbit "${clibbit.title}" successfully`);
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to search clibbits: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  }
}
