import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Zda je Supabase nakonfigurované. Když nejsou proměnné prostředí,
 * appka poběží v náhledovém režimu (design lze prohlížet), ale
 * datové operace nebudou fungovat, dokud Supabase nepřipojíš.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[v0] Supabase není nakonfigurované (chybí NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Aplikace běží v náhledovém režimu bez dat.",
  );
}

// Použij placeholder hodnoty, aby createClient nespadl při načtení modulu.
// Reálné volání na tuto URL selže očekávaně (a bezpečně) až za běhu.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "public-anon-placeholder-key",
);
