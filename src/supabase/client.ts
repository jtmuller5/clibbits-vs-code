import * as vscode from 'vscode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hardcoded Supabase configuration values
const SUPABASE_URL = 'https://jafkdqefjvhfbyuiguhl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZmtkcWVmanZoZmJ5dWlndWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NzUwOTAsImV4cCI6MjA1ODM1MTA5MH0.Q28wXI1Ph6uyO4XGzN3bTZmJKqk-SXJjJ-DvBQZNdjY';

// Create Supabase client
let supabaseClient: SupabaseClient;

try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create a dummy client that will show appropriate errors when used
  supabaseClient = createClient('https://example.com', 'dummy-key');
}

export { supabaseClient };

/**
 * Initialize Supabase client with session if available
 * @param sessionString JSON string of the session stored in extension context
 */
export function initializeSupabaseWithSession(sessionString: string | undefined): void {
  if (!sessionString) {
    return;
  }

  try {
    const session = JSON.parse(sessionString);
    supabaseClient.auth.setSession(session);
  } catch (error) {
    console.error('Failed to initialize Supabase with session:', error);
  }
}
