import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";

export async function ensureProfile(user: User) {
  if (!user?.id) return;

  // Insert only; ignore duplicate (unique violation) so we don't need UPDATE RLS.
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username: user.email,
  });

  if (error) {
    // Postgres unique_violation code
    if (error.code === "23505") {
      console.log("Profile already exists, skipping insert.");
      return;
    }
    console.warn("ensureProfile skipped:", error.message);
  }
}
