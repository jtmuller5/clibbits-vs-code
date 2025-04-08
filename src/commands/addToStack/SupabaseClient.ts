import { supabaseClient } from "../../supabase/client";
import { Libbit } from "./Types";

/**
 * Helper functions for Supabase API interactions related to the AddToStack command
 */
export async function getLibbitsByCategory(category: string): Promise<Libbit[]> {
  const { data: libbits, error } = await supabaseClient
    .from('libbits')
    .select('*, clibbit_count:libbit_clibbits(count)')
    .eq('category', category);
    
  if (error) {
    throw new Error(`Failed to fetch libbits: ${error.message}`);
  }
  
  return libbits || [];
}

/**
 * Get all clibbits associated with a specific libbit
 */
export async function getClibbitsByLibbitId(libbitId: string): Promise<any[]> {
  // First, get all libbit_clibbit relationships
  const { data: relationships, error: relError } = await supabaseClient
    .from('libbit_clibbits')
    .select('clibbit_id')
    .eq('libbit_id', libbitId);
    
  if (relError) {
    throw new Error(`Failed to fetch libbit relationships: ${relError.message}`);
  }
  
  if (!relationships || relationships.length === 0) {
    return [];
  }
  
  // Extract clibbit IDs
  const clibbitIds = relationships.map(rel => rel.clibbit_id);
  
  // Get all clibbits
  const { data: clibbits, error: clibbitError } = await supabaseClient
    .from('clibbits')
    .select('*')
    .in('id', clibbitIds);
    
  if (clibbitError) {
    throw new Error(`Failed to fetch clibbits: ${clibbitError.message}`);
  }
  
  return clibbits || [];
}
