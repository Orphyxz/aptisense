import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import EmptyState from '../components/ui/EmptyState'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import MetricCard from '../components/ui/MetricCard'
import SectionHeader from '../components/ui/SectionHeader'
import { getErrorMessage } from '../error'
import { getStatusBadgeClass, getStatusTileColor, type PerformanceStatus } from '../performance-status'
import { useToast } from '../toast-context'

type DifficultySummary = Record<'Easy' | 'Medium' | 'Hard', {
  attempts: number
  avgScore: number
  latestScore: number | null
  bestScore: number | null
  students: number
}>

type NoteItem = {
  _id: string
  title: string
  description: string
  topics: string[]
  originalFileName: string
  fileUrl: string
  uploadedBy: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

type StudentRow = {
  _id: string
  name: string
  email: string
  latestScore: number | null
  status: PerformanceStatus
}

type BatchData = {
  summary: {
    totalStudents: number
    onTrack: number
    buildingMomentum: number
    needsSupport: number
    gettingStarted: number
    avgBatchScore: number
  }
  difficultySummary: DifficultySummary
  students: StudentRow[]
}

type HeatmapData = {
  heatmap: Array<{
    userId: string
    name: string
    status: PerformanceStatus
  }>
}

type WeakTopicData = {
  weakTopics: Array<{
    topic: string
    count: number
    avgScore: number
  }>
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read the selected PDF'))
    reader.readAsDataURL(file)
  })
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const notesSectionRef = useRef<HTMLDivElement | null>(null)

  const [batch, setBatch] = useState<BatchData | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null)
  const [weakTopics, setWeakTopics] = useState<WeakTopicData | null>(null)
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingNote, setSavingNote] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [studentModal, setStudentModal] = useState<{
    title: string
    subtitle: string
    students: StudentRow[]
  } | null>(null)
  const [title, setTitle] = useState('')
  const [topics, setTopics] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    async function load() {
      if (!token) return
      try {
        const [batchData, heatmapData, weakTopicsData, notesData] = await Promise.all([
          api.getBatchAnalytics(token),
          api.getHeatmap(token),
          api.getWeakTopics(token),
          api.getNotes(token),
        ])
        setBatch(batchData)
        setHeatmap(heatmapData)
        setWeakTopics(weakTopicsData)
        setNotes(notesData.notes || [])
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  function pickFile(file: File | null) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast({
        tone: 'error',
        title: 'PDF only',
        message: 'Please upload a PDF file for student notes.',
      })
      return
    }

    setSelectedFile(file)
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ''))
    }
  }

  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    if (!selectedFile) {
      showToast({
        tone: 'error',
        title: 'Missing PDF',
        message: 'Choose a PDF before publishing the note.',
      })
      return
    }

    try {
      setSavingNote(true)
      const fileData = await fileToDataUrl(selectedFile)
      const response = await api.createNote({
        title: title.trim() || selectedFile.name.replace(/\.pdf$/i, ''),
        description,
        topics: topics.split(',').map((topic) => topic.trim()).filter(Boolean),
        fileName: selectedFile.name,
        fileData,
      }, token)

      setNotes((current) => [response.note, ...current])
      setTitle('')
      setTopics('')
      setDescription('')
      setSelectedFile(null)
      showToast({
        tone: 'success',
        title: 'Note published',
        message: 'Students can now open the PDF from their dashboard.',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'Upload failed',
        message: getErrorMessage(err),
      })
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote(id: string) {
    if (!token) return

    try {
      await api.deleteNote(id, token)
      setNotes((current) => current.filter((note) => note._id !== id))
      showToast({
        tone: 'info',
        title: 'Note removed',
        message: 'The note is no longer visible to students.',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'Delete failed',
        message: getErrorMessage(err),
      })
    }
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setDropActive(false)
    pickFile(e.dataTransfer.files?.[0] || null)
  }

  const studentsByStatus = useMemo(() => ({
    all: batch?.students || [],
    onTrack: (batch?.students || []).filter((student) => student.status === 'On Track'),
    buildingMomentum: (batch?.students || []).filter((student) => student.status === 'Building Momentum'),
    needsSupport: (batch?.students || []).filter((student) => student.status === 'Needs Support'),
  }), [batch])

  return (
    <div className="page-wrap">
      <div className="dashboard-hero mb-7">
        <div className="dashboard-hero-copy">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle dashboard-hero-subtitle">
            Batch-level visibility into student momentum, quick student group actions, and the note library students can access.
          </p>
        </div>
      </div>

      {error ? <div className="mb-4 text-red-600 text-sm">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-5">
        <MetricCard
          label="Total Students"
          value={batch?.summary.totalStudents ?? 0}
          helper="Click to open the full student list"
          onClick={() => setStudentModal({
            title: 'All Students',
            subtitle: 'Everyone currently visible in this batch.',
            students: studentsByStatus.all,
          })}
        />
        <MetricCard
          label="On Track"
          value={batch?.summary.onTrack ?? 0}
          helper="Click to view confident students"
          onClick={() => setStudentModal({
            title: 'On Track Students',
            subtitle: 'Students whose latest attempt looks confident.',
            students: studentsByStatus.onTrack,
          })}
        />
        <MetricCard
          label="Building Momentum"
          value={batch?.summary.buildingMomentum ?? 0}
          helper="Click to view students improving steadily"
          onClick={() => setStudentModal({
            title: 'Building Momentum',
            subtitle: 'Students showing steady upward progress.',
            students: studentsByStatus.buildingMomentum,
          })}
        />
        <MetricCard
          label="Needs Support"
          value={batch?.summary.needsSupport ?? 0}
          helper="Click to view students who need support"
          onClick={() => setStudentModal({
            title: 'Needs Support',
            subtitle: 'Students who would benefit most from coaching right now.',
            students: studentsByStatus.needsSupport,
          })}
        />
        <MetricCard
          label="Published Notes"
          value={notes.length}
          helper="Click to jump to the PDF note library"
          onClick={() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5 bento-card card-padding">
          <SectionHeader
            title="Batch Heatmap"
            subtitle="Color-coded view of the latest student status"
          />
          {loading ? (
            <div className="grid gap-3">
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={3} />
            </div>
          ) : heatmap?.heatmap?.length ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {heatmap.heatmap.map((item) => (
                <div
                  key={item.userId}
                  className="rounded-2xl p-4 text-white"
                  style={{ background: getStatusTileColor(item.status), minHeight: 84 }}
                >
                  <div className="text-sm font-bold truncate">{item.name}</div>
                  <div className="mt-2 text-xs opacity-90">{item.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No student heatmap yet"
              description="Student status tiles will appear here once learners begin taking mocks."
            />
          )}
        </div>

        <div className="xl:col-span-7 bento-card card-padding">
          <SectionHeader
            title="Section Performance Overview"
            subtitle="Latest batch average per section, plus how many students are currently below 50%"
          />
          {loading ? (
            <div className="grid gap-3">
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={3} />
            </div>
          ) : weakTopics?.weakTopics?.length ? (
            <div className="space-y-3">
              {weakTopics.weakTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="rounded-2xl border p-4 flex items-center justify-between gap-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <div className="font-bold">{topic.topic}</div>
                    <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Students currently below 50%: {topic.count}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="metric-label">Avg Score</div>
                    <div className="text-2xl font-extrabold mono">{topic.avgScore}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No weak topic signal yet"
              description="Once students complete more mocks, section-level patterns will appear here."
            />
          )}
        </div>

        <div className="xl:col-span-12 grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-5 bento-card card-padding">
            <SectionHeader
              title="Student Notes Library"
              subtitle="Drag in a PDF, add topics, and publish it directly to the student dashboard."
            />

            <form className="space-y-4" onSubmit={handleSubmitNote}>
              <div>
                <label className="metric-label block mb-2">Title</label>
                <input
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Arrays and Strings Quick Revision"
                />
              </div>

              <div>
                <label className="metric-label block mb-2">Topics</label>
                <input
                  className="field"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Arrays, Strings, Sliding Window"
                />
              </div>

              <div>
                <label className="metric-label block mb-2">Student Note</label>
                <textarea
                  className="field"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what students should focus on before opening this PDF."
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />

              <button
                type="button"
                className={`note-dropzone ${dropActive ? 'note-dropzone-active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropActive(true)
                }}
                onDragLeave={() => setDropActive(false)}
                onDrop={handleDrop}
              >
                <div className="note-dropzone-title">
                  {selectedFile ? selectedFile.name : 'Drag and drop a PDF here'}
                </div>
                <div className="note-dropzone-copy">
                  {selectedFile
                    ? `Ready to publish - ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                    : 'Or click to browse from your computer'}
                </div>
              </button>

              <button className="primary-btn w-full" disabled={savingNote}>
                {savingNote ? 'Publishing note...' : 'Publish Note'}
              </button>
            </form>
          </div>

          <div ref={notesSectionRef} className="xl:col-span-7 bento-card card-padding">
            <SectionHeader
              title="Published Notes"
              subtitle="Students will see this list as topics with direct PDF links."
            />

            {loading ? (
              <div className="grid gap-3">
                <LoadingSkeleton lines={4} />
                <LoadingSkeleton lines={4} />
              </div>
            ) : notes.length ? (
              <div className="notes-grid">
                {notes.map((note) => (
                  <div key={note._id} className="note-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-lg">{note.title}</div>
                        <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {note.description || 'Shared with students for extra practice and revision.'}
                        </div>
                      </div>
                      <button className="secondary-btn" onClick={() => handleDeleteNote(note._id)}>
                        Remove
                      </button>
                    </div>

                    <div className="card-meta-row mt-4">
                      {note.topics.length
                        ? note.topics.map((topic) => <span key={`${note._id}-${topic}`}>{topic}</span>)
                        : <span>General Revision</span>}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Uploaded by {note.uploadedBy.name} on {new Date(note.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </div>
                      <a href={note.fileUrl} target="_blank" rel="noreferrer" className="primary-btn">
                        Open PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No notes published yet"
                description="Upload a PDF note here and students will instantly see it in their dashboard."
              />
            )}
          </div>
        </div>

        <div className="xl:col-span-12 bento-card card-padding">
          <SectionHeader
            title="Student Performance Table"
            subtitle="Click a student name to open a detailed drill-down page"
          />
          {loading ? (
            <div className="grid gap-3">
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={3} />
            </div>
          ) : batch?.students?.length ? (
            <div className="table-shell">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Latest Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.students.map((student) => (
                    <tr key={student._id}>
                      <td className="font-semibold">
                        <Link to={`/admin/students/${student._id}`} style={{ color: 'var(--color-primary)' }}>
                          {student.name}
                        </Link>
                      </td>
                      <td>{student.email}</td>
                      <td className="mono">{student.latestScore ?? '-'}</td>
                      <td>
                        <span className={getStatusBadgeClass(student.status)}>{student.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No students to display"
              description="The student performance table will populate as soon as student accounts exist in the batch."
            />
          )}
        </div>
      </div>

      {studentModal ? (
        <div className="modal-backdrop" onClick={() => setStudentModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{studentModal.title}</div>
                <div className="card-subtext">{studentModal.subtitle}</div>
              </div>
              <button className="secondary-btn" onClick={() => setStudentModal(null)}>
                Close
              </button>
            </div>

            {studentModal.students.length ? (
              <div className="modal-student-list">
                {studentModal.students.map((student) => (
                  <Link
                    key={student._id}
                    to={`/admin/students/${student._id}`}
                    className="modal-student-row"
                    onClick={() => setStudentModal(null)}
                  >
                    <div>
                      <div className="font-bold">{student.name}</div>
                      <div className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {student.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="mono">{student.latestScore ?? '-'}</div>
                      <span className={getStatusBadgeClass(student.status)}>{student.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No students in this group"
                description="Try another summary card to inspect a different student set."
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
