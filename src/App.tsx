import { useState, useCallback } from 'react'
import './App.css'
import AuthGate from './components/authgate'
import AudioUploader from './components/audiouploader'
import Transcriber from './components/transcriber' 
import type { Session } from "@supabase/supabase-js";

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadCounter, setUploadCounter] = useState(0);

  const handleAuth = useCallback((session: Session | null) => {
    setUserId(session?.user.id ?? null);
  }, []);

  console.log('App render userId:', userId, 'uploadCounter:', uploadCounter);

  return (
    <div className="App">
      <AuthGate onAuth={handleAuth} />
      {userId ? (
        <>
          <AudioUploader userId={userId} onUploaded={() => setUploadCounter(c => c + 1)} />
          <Transcriber userId={userId} refreshKey={uploadCounter} />
        </>
      ) : null}
    </div>
  );
}

export default App;
