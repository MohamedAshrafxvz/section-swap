// Data layer: the only file that talks to Supabase.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function rpc(fn, args) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export async function createRequest({ name, phone, current, wanted }) {
  const [row] = await rpc("create_request", {
    p_name: name, p_phone: phone, p_current: current, p_wanted: wanted,
  });
  return row; // { id, owner_token }
}

export const getMatches = (id, token) => rpc("my_matches", { p_id: id, p_token: token });
export const deleteRequest = (id, token) => rpc("delete_request", { p_id: id, p_token: token });
