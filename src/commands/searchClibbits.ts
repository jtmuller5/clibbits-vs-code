import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { supabaseClient } from "../supabase/client";
import matter from "gray-matter";

export interface Clibbit {
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
  source?: string;
  upvotes: number;
  downvotes: number;
}

interface SimilaritySearchResult {
  id: string;
  title: string;
  similarity: number;
  content?: string;
}

interface SimilaritySearchResponse {
  query: string;
  threshold: number;
  limit: number;
  count: number;
  results: SimilaritySearchResult[];
}

export class SearchClibbitsCommand {
  public static readonly commandName = "clibbits.searchClibbits";

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
   * Performs exact title search using ilike
   * @param query Text to search for in titles
   * @returns Array of matching clibbits
   */
  private static async performExactSearch(query: string): Promise<Clibbit[]> {
    try {
      // Remove quotes if they exist
      const cleanQuery = query.replace(/^"|"$/g, "");

      // Search for clibbits where title contains the query (case insensitive)
      const { data: clibbits, error } = await supabaseClient
        .from("clibbits")
        .select("*")
        .ilike("title", `%${cleanQuery}%`)
        .order("title", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return clibbits || [];
    } catch (error) {
      console.error("Exact search error:", error);
      throw error;
    }
  }

  /**
   * Fetches the full clibbit from the database by ID
   * @param id ID of the clibbit to fetch
   * @returns Full clibbit object
   */
  private static async fetchClibbitById(id: string): Promise<Clibbit> {
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
        tags: clibbit.tags || [],
      };

      // Only add optional fields if they exist and are not null/undefined
      if (clibbit.prompt) frontmatter.prompt = clibbit.prompt;
      if (clibbit.instructions) frontmatter.instructions = clibbit.instructions;
      if (
        clibbit.sources &&
        Array.isArray(clibbit.sources) &&
        clibbit.sources.length > 0
      ) {
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
    return vscode.commands.registerCommand(
      this.commandName,
      async (selectedText?: string) => {
        try {
          // First, check if user is signed in
          const sessionStr = await context.secrets.get("supabase.session");
          if (!sessionStr) {
            vscode.window
              .showInformationMessage(
                "You need to sign in to search clibbits",
                "Sign In"
              )
              .then((selection) => {
                if (selection === "Sign In") {
                  vscode.commands.executeCommand("clibbits.signIn");
                }
              });
            return;
          }

          // Get search query - either from parameter (for code lens) or from user input
          let query = selectedText || "";

          // If no text was provided from code lens, get it from the editor selection
          if (!query) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              const selection = editor.selection;
              if (!selection.isEmpty) {
                query = editor.document.getText(selection);
              }
            }
          }

          // If still no query, prompt the user for input
          if (!query) {
            const inputQuery = await vscode.window.showInputBox({
              prompt: "Search for clibbits",
              placeHolder:
                'Use "quotes" for exact title search or regular text for similarity search',
              ignoreFocusOut: true,
              validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                  return "Please enter text to search for clibbits";
                }
                return null; // Input is valid
              },
            });

            if (!inputQuery) {
              return; // User cancelled
            }

            query = inputQuery;
          } else {
            // If text was selected, ask if the user wants to refine the query
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
                prompt: "Search for clibbits",
                placeHolder:
                  'Use "quotes" for exact title search or regular text for similarity search',
                value: query, // Pre-populate with selected text
                ignoreFocusOut: true,
                validateInput: (value) => {
                  if (!value || value.trim().length === 0) {
                    return "Please enter text to search for clibbits";
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

          // Determine search method based on query format
          const isExactSearch = /^".*"$/.test(query.trim());

          // Show progress indicator
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `${
                isExactSearch ? "Exact" : "Similarity"
              } searching clibbits...`,
              cancellable: false,
            },
            async (progress) => {
              let clibbits: Clibbit[] = [];
              let selectedClibbit: Clibbit | undefined;

              // Perform appropriate search based on query format
              if (isExactSearch) {
                // Exact title search
                clibbits = await this.performExactSearch(query);
              } else {
                // Similarity search
                const searchResult = await this.performSimilaritySearch(query);

                // Map similarity search results to format compatible with our UI flow
                if (searchResult.results && searchResult.results.length > 0) {
                  // Just store the IDs for now - we'll fetch full clibbits if selected
                  const similarClibbitsIds = searchResult.results.map(
                    (result) => ({
                      id: result.id,
                      title: result.title,
                      similarity: result.similarity,
                    })
                  );

                  // Create QuickPick items for similarity results
                  const items = similarClibbitsIds.map((item) => ({
                    label: item.title,
                    description: `Similarity: ${Math.round(
                      item.similarity * 100
                    )}%`,
                    detail: `ID: ${item.id}`,
                    id: item.id,
                  }));

                  // Show QuickPick with similarity results
                  const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `Found ${items.length} similar clibbits. Select one to load...`,
                    matchOnDescription: true,
                    matchOnDetail: true,
                  });

                  if (!selected) {
                    return; // User cancelled
                  }

                  // Fetch the full clibbit data for the selected item
                  selectedClibbit = await this.fetchClibbitById(selected.id);

                  if (!selectedClibbit) {
                    vscode.window.showErrorMessage(
                      "Failed to fetch clibbit data"
                    );
                    return;
                  }
                } else {
                  vscode.window.showInformationMessage(
                    `No similar clibbits found for "${query}"`
                  );
                  return;
                }
              }

              // For exact search, show the quick pick menu with results
              if (isExactSearch) {
                if (!clibbits || clibbits.length === 0) {
                  vscode.window.showInformationMessage(
                    `No clibbits found matching "${query}"`
                  );
                  return;
                }

                // Create QuickPick items for exact search results
                const items = clibbits.map((clibbit) => ({
                  label: clibbit.title,
                  description: `Tags: ${
                    clibbit.tags ? clibbit.tags.join(", ") : ""
                  }`,
                  detail: clibbit.content_preview,
                  clibbit: clibbit,
                }));

                // Show QuickPick with results
                const selected = await vscode.window.showQuickPick(items, {
                  placeHolder: `Found ${clibbits.length} clibbits. Select one to load...`,
                  matchOnDescription: true,
                  matchOnDetail: true,
                });

                if (!selected) {
                  return; // User cancelled
                }

                // Get the selected clibbit
                selectedClibbit = selected.clibbit as Clibbit;
              }

              // Process the selected clibbit (from either search method)
              if (selectedClibbit) {
                // Save clibbit to file
                progress.report({
                  message: "Saving clibbit to prompts folder...",
                });
                const filePath = await this.saveClibbitToFile(selectedClibbit);

                // Open the file in the editor
                const document = await vscode.workspace.openTextDocument(
                  filePath
                );
                await vscode.window.showTextDocument(document);

                vscode.window.showInformationMessage(
                  `Loaded clibbit "${selectedClibbit.title}" successfully`
                );
              }
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to search clibbits: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  }
}
