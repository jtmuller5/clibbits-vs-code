import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { supabaseClient } from "../supabase/client";
import matter from 'gray-matter';

interface SimilaritySearchResult {
  id: string;
  title: string;
  similarity: number;
  content?: string;
}

interface Clibbit {
  id: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  tags?: string[];
  prompt?: string;
  instructions?: string;
  sources?: string[];
  content_preview?: string;
}

interface SimilaritySearchResponse {
  query: string;
  threshold: number;
  limit: number;
  count: number;
  results: SimilaritySearchResult[];
}

export class SearchSimilarClibbitsCommand {
  public static readonly commandName = "clibbits.searchSimilarClibbits";

  /**
   * Performs similarity search against Supabase edge function
   * @param query Text to search for similar clibbits
   * @returns Search response with similar clibbits
   */
  private static async performSimilaritySearch(
    query: string
  ): Promise<SimilaritySearchResponse> {
    try {
      const supabaseAnonKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZmtkcWVmanZoZmJ5dWlndWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NzUwOTAsImV4cCI6MjA1ODM1MTA5MH0.Q28wXI1Ph6uyO4XGzN3bTZmJKqk-SXJjJ-DvBQZNdjY";
      // Note: We still need to use the edge function for similarity search
      // as this requires pgvector operations that can't be done with the client directly
      const response = await fetch(
        "https://jafkdqefjvhfbyuiguhl.functions.supabase.co/similarity-search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Similarity search error:", error);
      throw error;
    }
  }

  /**
   * Fetches the full clibbit from the database
   * @param id ID of the clibbit to fetch
   * @returns Full clibbit object
   */
  private static async fetchClibbitContent(id: string): Promise<Clibbit> {
    try {
      // Query the clibbits table directly using the Supabase client
      const { data, error } = await supabaseClient
        .from("clibbits")
        .select("*") // Select all fields
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch clibbit: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Clibbit with ID ${id} not found`);
      }

      return data as Clibbit;
    } catch (error) {
      console.error("Error fetching clibbit:", error);
      throw error;
    }
  }

  /**
   * Saves the clibbit to a file in the .github/prompts/clibbits folder
   * @param clibbit The clibbit object to save
   */
  private static async saveClibbitToFile(clibbit: Clibbit): Promise<string> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error("No workspace folder open");
      }

      const rootPath = workspaceFolders[0].uri.fsPath;
      const promptsDir = path.join(rootPath, ".github", "prompts", "clibbits");

      // Create directories if they don't exist
      await fs.promises.mkdir(promptsDir, { recursive: true });

      // Create a filename from the title
      const kebabCaseTitle = clibbit.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const filePath = path.join(promptsDir, `${kebabCaseTitle}.prompt.md`);

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

      // Write content to file
      await fs.promises.writeFile(filePath, fileContent);

      return filePath;
    } catch (error) {
      console.error("Error saving clibbit:", error);
      throw error;
    }
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(this.commandName, async () => {
      try {
        // Get text from active editor or selection
        let query = "";
        const editor = vscode.window.activeTextEditor;

        if (editor) {
          const selection = editor.selection;
          if (!selection.isEmpty) {
            // Use selected text as query
            query = editor.document.getText(selection);
          }
        }

        // Always ask for a query if no text is selected (or overwrite selected text)
        if (!query) {
          const inputQuery = await vscode.window.showInputBox({
            placeHolder: "Enter text to search for similar clibbits",
            prompt: "Search for similar clibbits",
            ignoreFocusOut: true,
            validateInput: (value) => {
              if (!value || value.trim().length === 0) {
                return "Please enter text to search for similar clibbits";
              }
              return null; // Input is valid
            },
          });

          if (!inputQuery) {
            return; // User cancelled
          }

          query = inputQuery;
        } else {
          // If text is selected, ask if the user wants to refine the query
          const refineOption = await vscode.window.showQuickPick(
            [
              {
                label: "Use selected text",
                description: `"${
                  query.length > 50 ? query.substring(0, 50) + "..." : query
                }"`,
              },
              {
                label: "Refine query",
                description: "Enter a different search query",
              },
            ],
            { placeHolder: "Use selected text or enter a new query?" }
          );

          if (!refineOption) {
            return; // User cancelled
          }

          if (refineOption.label === "Refine query") {
            const inputQuery = await vscode.window.showInputBox({
              placeHolder: "Enter text to search for similar clibbits",
              prompt: "Search for similar clibbits",
              value: query, // Pre-populate with selected text
              ignoreFocusOut: true,
              validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                  return "Please enter text to search for similar clibbits";
                }
                return null; // Input is valid
              },
            });

            if (!inputQuery) {
              return; // User cancelled
            }

            query = inputQuery;
          }
        }

        // Show progress indicator
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Searching for similar clibbits...",
            cancellable: false,
          },
          async (progress) => {
            // Perform similarity search
            const searchResult = await this.performSimilaritySearch(query);

            if (!searchResult.results || searchResult.results.length === 0) {
              vscode.window.showInformationMessage(
                "No similar clibbits found."
              );
              return;
            }

            // Create quick pick items from results
            const quickPickItems = searchResult.results.map((result) => ({
              label: result.title,
              description: `Similarity: ${Math.round(
                result.similarity * 100
              )}%`,
              detail: `ID: ${result.id}`,
              id: result.id,
            }));

            // Show quick pick
            const selectedItem = await vscode.window.showQuickPick(
              quickPickItems,
              {
                placeHolder: "Select a clibbit to add to your prompts folder",
              }
            );

            if (!selectedItem) {
              return; // User cancelled
            }

            // Fetch full clibbit data
            progress.report({ message: "Fetching clibbit data..." });
            const clibbit = await this.fetchClibbitContent(
              selectedItem.id
            );

            // Save clibbit to file with frontmatter
            progress.report({ message: "Saving clibbit to prompts folder..." });
            const filePath = await this.saveClibbitToFile(clibbit);

            vscode.window.showInformationMessage(
              `Clibbit saved to ${path.basename(filePath)}`
            );

            // Open the file in the editor
            const fileUri = vscode.Uri.file(filePath);
            vscode.workspace.openTextDocument(fileUri).then((doc) => {
              vscode.window.showTextDocument(doc);
            });
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to search for similar clibbits: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }
}
