import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Auth } from "@supabase/auth-ui-react";
import type { Session } from "@supabase/supabase-js";
import { ensureProfile } from "../lib/profile";

export default function AuthGate({ onAuth }: { onAuth: (session: Session | null) => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const hadInitialSessionRef = useRef(false);
  const ensuredProfileThisSessionRef = useRef(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      const { data } = await supabase.auth.getSession();
      console.log("AuthGate initial session:", data?.session);
      hadInitialSessionRef.current = !!data.session;
      setSession(data.session);
      onAuth(data.session);
      console.log("AuthGate called onAuth with", !!data.session);

      // Subscribe only after initial session known.
      const res = supabase.auth.onAuthStateChange(async (event, sess) => {
        setSession(sess);
        onAuth(sess);

        if (event === "SIGNED_IN" && sess?.user) {
          if (hadInitialSessionRef.current) {
            // console.log("Skipping ensureProfile (persisted session)");
          } else if (!ensuredProfileThisSessionRef.current) {
            // console.log("RUNNING ensureProfile (fresh login)");
            await ensureProfile(sess.user);
            ensuredProfileThisSessionRef.current = true;
          }
        }

        if (event === "SIGNED_OUT") {
          ensuredProfileThisSessionRef.current = false;
          hadInitialSessionRef.current = false;
        }
      });

      subscription = res.data.subscription;
    })();

    return () => {
      subscription?.unsubscribe();
    };
  }, [onAuth]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    onAuth(null);
    setTimeout(() => window.location.reload(), 200);
  };

  if (!session) {
    const redirectTo = `${window.location.origin}/supabase-testing/`;
    return (
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={["google"]}
        redirectTo={redirectTo}
      />
    );
  }

  return (
    <div>
      <h2>Welcome!</h2>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
