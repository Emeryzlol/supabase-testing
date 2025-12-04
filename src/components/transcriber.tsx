import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

type Props = {
  userId: string
  refreshKey?: number
}

type Submission = {
  id: number
  audio_url: string
  transcript?: any
  status?: string
  created_at?: string
}

export default function Transcriber({ userId, refreshKey }: Props) {
  if (!userId) return null;

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingIds, setLoadingIds] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Transcriber mounted', { userId, refreshKey })
    if (!userId) return
    fetchSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey])

  const transcribeRow = async (id: number) => {
    setError(null)
    setLoadingIds(prev => ({ ...prev, [id]: true }))

    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL || window.location.origin.replace(/:\d+$/, ':8000')
      const url = `${apiBase.replace(/\/$/, '')}/transcribe_from_supabase`

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row_id: id })
      })

      const contentType = resp.headers.get('content-type') || ''
      let body: any = null

      if (contentType.includes('application/json')) {
        body = await resp.json()
      } else {
        body = await resp.text()
      }

      if (!resp.ok) {
        console.error('Transcription API error', resp.status, body)
        setError(typeof body === 'string' ? body : (body?.detail || body?.error || 'Transcription failed'))
        setLoadingIds(prev => ({ ...prev, [id]: false }))
        return
      }

      const transcription = (typeof body === 'object' ? (body.transcription ?? body?.transcript ?? body) : body)

      setSubmissions(prev =>
        prev.map(s => (s.id === id ? { ...s, transcript: transcription, status: 'transcribed' } : s))
      )

      await fetchSubmissions()
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? String(e))
    } finally {
      setLoadingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const fetchSubmissions = async () => {
    setError(null)
    const { data, error } = await supabase
      .from('submissions')
      .select('id, audio_url, transcript, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      setError('Could not load submissions')
      console.error(error)
      return
    }
    setSubmissions((data as Submission[]) || [])
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ color: '#fff' }}>Your uploads & transcriptions</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {submissions.length === 0 && <p>No uploads yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {submissions.map(s => (
          <li key={s.id} style={{ marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
            <div>
              <strong>Uploaded:</strong> {new Date(s.created_at ?? '').toLocaleString() || 'unknown'}
            </div>
            <div style={{ marginTop: 8 }}>
              <audio src={s.audio_url} controls />
            </div>

            <div style={{ marginTop: 8 }}>
              {s.transcript ? (
                <div>
                  <strong>Transcription:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', padding: 8, borderRadius: 4 }}>
                    {typeof s.transcript === 'string'
                      ? s.transcript
                      : (s.transcript?.text ?? JSON.stringify(s.transcript, null, 2))}
                  </pre>
                </div>
              ) : (
                <div>
                  <em>No transcription yet.</em>
                </div>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => transcribeRow(s.id)}
                disabled={!!loadingIds[s.id]}
              >
                {loadingIds[s.id] ? 'Transcribing…' : (s.transcript ? 'Retranscribe' : 'Transcribe')}
              </button>
              {s.transcript && <span style={{ marginLeft: 8, color: 'green' }}>Transcribed</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

