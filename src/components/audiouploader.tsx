import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

type Props = {
  userId: string
  onUploaded?: () => void
}

export default function AudioUploader({ userId, onUploaded }: Props) {
  const [recording, setRecording] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const startRecording = async () => {
    setUploadPhase('idle')
    setUploadMessage(null)

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    const chunks: BlobPart[] = []

    mediaRecorder.ondataavailable = e => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const newBlob = new Blob(chunks, { type: 'audio/webm' })
      setBlob(newBlob)
      setUrl(URL.createObjectURL(newBlob))
    }

    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder
    setRecording(true)
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    mr?.stop()
    mr?.stream.getTracks().forEach(t => t.stop())
    setRecording(false)
  }

  const uploadAudio = async (file?: File) => {
    if (uploadPhase === 'uploading' || uploadPhase === 'success') return

    const audioFile: Blob | File | null = file ?? blob
    if (!audioFile) return

    setUploadPhase('uploading')
    setUploadMessage(null)

    const extFromName = file?.name?.split('.').pop()
    const ext = extFromName && extFromName.trim() ? extFromName : 'webm'
    const filename = `${userId}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filename, audioFile, { cacheControl: '3600', upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploadPhase('error')
      setUploadMessage('Upload failed. Please try again.')
      return
    }

    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(filename)
    const publicUrl = urlData.publicUrl

    const { error: dbError } = await supabase
      .from('submissions')
      .insert([{ user_id: userId, audio_url: publicUrl }])

    if (dbError) {
      console.error('DB insert error:', dbError)
      setUrl(publicUrl) // still show uploaded preview
      setUploadPhase('error')
      setUploadMessage('Uploaded to storage, but failed to save. Please contact support.')
      return
    }

    setUrl(publicUrl)
    setUploadPhase('success')
    setUploadMessage('Uploaded successfully!')
    // notify parent so Transcriber can re-fetch immediately
    onUploaded?.()
  }

  return (
    <div>
      <h3>Audio Recorder / Uploader</h3>

      {/* Recording controls */}
      {!recording && <button onClick={startRecording}>Start Recording</button>}
      {recording && <button onClick={stopRecording}>Stop Recording</button>}

      {/* File upload */}
      <input
        type="file"
        accept=".mp3,.wav,.webm"
        onChange={e => {
          const f = e.target.files?.[0]
          if (!f) return
          setBlob(null)
          setUrl(null)
          setUploadPhase('idle')
          setUploadMessage(null)
          uploadAudio(f)
        }}
      />

      {/* Audio preview + status */}
      {url && (
        <div style={{ marginTop: 12 }}>
          <audio src={url} controls />
          {uploadPhase === 'idle' && blob && (
            <button style={{ marginLeft: 8 }} onClick={() => uploadAudio()}>
              Upload Recorded Audio
            </button>
          )}
          {uploadPhase === 'uploading' && <p>Uploading...</p>}
          {uploadMessage && <p>{uploadMessage}</p>}
        </div>
      )}
    </div>
  )
}
