import * as vscode from 'vscode';
import { supabaseClient } from './client';

export class SupabaseStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private context: vscode.ExtensionContext;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'clibbits.signIn'; // Default command when not signed in
    this.context.subscriptions.push(this.statusBarItem);
    this.update();
  }

  /**
   * Update the status bar based on authentication state
   */
  public async update(): Promise<void> {
    try {
      const session = await this.context.secrets.get('supabase.session');
      
      if (session) {
        // Try to validate the stored session
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error || !data.session) {
          this.showSignedOut();
          return;
        }
        
        const user = data.session.user;
        this.showSignedIn(user.email || 'User');
      } else {
        this.showSignedOut();
      }
    } catch (error) {
      console.error('Error updating status bar:', error);
      this.showSignedOut();
    }
  }

  private showSignedIn(email: string): void {
    this.statusBarItem.text = `$(person) ${email}`;
    this.statusBarItem.tooltip = `Signed in as ${email}`;
    this.statusBarItem.command = 'clibbits.signOut';
    this.statusBarItem.show();
  }

  private showSignedOut(): void {
    this.statusBarItem.text = `$(person) Sign In`;
    this.statusBarItem.tooltip = 'Sign in to Clibbits';
    this.statusBarItem.command = 'clibbits.signIn';
    this.statusBarItem.show();
  }

  /**
   * Dispose the status bar item
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
