import { createClient } from "./client";

/**
 * Helper functions to query tables from the inventory schema
 * Supabase REST API requires schema to be exposed or use RPC functions
 */

export async function getAssets() {
  const supabase = createClient();
  // Query from inventory schema
  const { data, error } = await supabase.schema("inventory").from("asset").select("*");
  return { data, error };
}

export async function getVerifications(limit = 5) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("inventory")
    .from("verification_history")
    .select("*, asset:asset_id(asset_tag_number)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
}

export async function getPendingTransfers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("inventory")
    .from("transfer_history")
    .select("*")
    .is("approved_by", null);
  return { data, error };
}

export async function getPendingDisposals() {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("inventory")
    .from("disposal_history")
    .select("*")
    .is("approved_by", null);
  return { data, error };
}

