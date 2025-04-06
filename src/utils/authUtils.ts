import * as vscode from 'vscode';
import { supabaseClient } from '../supabase/client';

/**
 * Check if the user is authenticated
 * @param context The extension context
 * @returns A promise that resolves to true if the user is authenticated, false otherwise
 */
export async function isAuthenticated(context: vscode.ExtensionContext): Promise<boolean> {
  try {
    // Check if we have a session stored
    const sessionString = await context.secrets.get('supabase.session');
    
    if (!sessionString) {
      return false;
    }

    // Validate the session with Supabase
    const { data, error } = await supabaseClient.auth.getSession();
    
    if (error || !data.session) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
}
