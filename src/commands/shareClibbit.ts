import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { supabaseClient } from "../supabase/client";
import matter from 'gray-matter';

export interface Clibbit {
  id: string;
  title: string;
  content_preview: string;
  content: string;
  prompt?: string;
  instructions?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  upvotes: number;
  downvotes: number;
  sources: string[];
}

export class ShareClibbitCommand {
  public static readonly commandName = "clibbits.shareClibbit";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
      this.commandName,
      async (uri: vscode.Uri) => {
        try {
          // First, check if user is signed in
          const sessionStr = await context.secrets.get('supabase.session');
          if (!sessionStr) {
            vscode.window.showInformationMessage(
              "You need to sign in to share clibbits",
              "Sign In"
            ).then(selection => {
              if (selection === "Sign In") {
                vscode.commands.executeCommand("clibbits.signIn");
              }
            });
            return;
          }

          // Check if the file is in the correct directory
          const filePath = uri.fsPath;
          if (!filePath.includes('.github/prompts/clibbits')) {
            vscode.window.showErrorMessage("This file is not a clibbit");
            return;
          }

          // Read the file content
          const document = await vscode.workspace.openTextDocument(uri);
          const content = document.getText();

          // Parse frontmatter
          const { data, content: clibbitContent } = matter(content);
          
          if (!data.title) {
            vscode.window.showErrorMessage("Clibbit is missing a title in frontmatter");
            return;
          }

          // Create preview (first 100 characters)
          const contentPreview = clibbitContent.trim().substring(0, 100) + (clibbitContent.length > 100 ? '...' : '');

          // Get user session data
          const session = JSON.parse(sessionStr);
          const userId = session.user.id;

          // Show progress indicator
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Sharing clibbit...",
              cancellable: false,
            },
            async (progress) => {
              progress.report({ message: "Generating tags..." });
              
              // Generate tags using Language Model API if none exist
              let tags = data.tags || [];
              if (!tags.length) {
                try {
                  // Use VS Code's language model API to generate tags
                  const [model] = await vscode.lm.selectChatModels({
                    vendor: 'copilot',
                    family: 'gpt-4o'
                  });
                  
                  if (model) {
                    const messages = [
                      vscode.LanguageModelChatMessage.User(
                        `Generate 3-5 tags for the following content. Respond with only a JSON array of tags (lowercase strings, no spaces, use hyphens if needed):\n\n${clibbitContent}`
                      )
                    ];
                    
                    const response = await model.sendRequest(
                      messages,
                      {},
                      new vscode.CancellationTokenSource().token
                    );
                    
                    let tagsText = "";
                    for await (const fragment of response.text) {
                      tagsText += fragment;
                    }
                    try {
                      const generatedTags = JSON.parse(tagsText);
                      if (Array.isArray(generatedTags)) {
                        tags = generatedTags;
                      }
                    } catch (e) {
                      console.error("Failed to parse tags:", e);
                      // Try to extract tags from non-JSON response if parsing failed
                      const tagMatches = tagsText.match(/["']([^"']+)["']/g);
                      if (tagMatches) {
                        tags = tagMatches.map(tag => tag.replace(/["']/g, ''));
                      }
                    }
                  }
                } catch (error) {
                  console.error("Error generating tags:", error);
                  // Continue without generated tags if there's an error
                }
              }
              
              progress.report({ message: "Saving to Supabase..." });
              
              // Prepare clibbit data
              const clibbitData: Omit<Clibbit, 'id'> = {
                title: data.title,
                content_preview: contentPreview,
                content: clibbitContent,
                prompt: data.prompt || "",
                instructions: data.instructions || "",
                tags: tags,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: userId,
                upvotes: 0,
                downvotes: 0,
                sources: data.sources || []
              };
              
              // Save to Supabase
              const { data: insertedData, error } = await supabaseClient
                .from('clibbits')
                .insert(clibbitData)
                .select('id')
                .single();
              
              if (error) {
                throw new Error(error.message);
              }
              
              if (insertedData?.id) {
                progress.report({ message: "Updating file with ID..." });
                
                // Update the frontmatter with the new ID
                data.id = insertedData.id;
                
                // Create updated content with new frontmatter
                const updatedContent = matter.stringify(clibbitContent, data);
                
                // Write the updated content back to the file
                fs.writeFileSync(filePath, updatedContent);
                
                vscode.window.showInformationMessage(`Clibbit shared successfully with ID: ${insertedData.id}`);
              }
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to share clibbit: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    );
  }
}
