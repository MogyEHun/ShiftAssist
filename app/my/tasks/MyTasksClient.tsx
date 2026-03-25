'use client'

import { useState } from 'react'
import { CheckSquare, Square, AlertCircle, Clock, Pin } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { hu } from 'date-fns/locale'
import { toggleTask } from '@/app/actions/tasks'
import { completeTaskTemplate, uncompleteTaskTemplate, type TaskTemplateWithCompletion } from '@/app/actions/task-templates'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import type { TaskWithUsers } from '@/app/actions/tasks'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  initialTasks: TaskWithUsers[]
  templateTasks: TaskTemplateWithCompletion[]
  userId: string
}

export function MyTasksClient({ initialTasks, templateTasks: initialTemplateTasks }: Props) {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState(initialTasks)
  const [templateTasks, setTemplateTasks] = useState(initialTemplateTasks)
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithUsers | null>(null)

  function formatDueDate(due: string | null): { label: string; urgent: boolean } | null {
    if (!due) return null
    const d = new Date(due)
    if (isToday(d)) return { label: t('myTasks.today'), urgent: true }
    if (isTomorrow(d)) return { label: t('myTasks.tomorrow'), urgent: false }
    return { label: format(d, 'MMM d.', { locale: hu }), urgent: false }
  }

  async function handleToggle(id: string) {
    setLoading(id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t))
    await toggleTask(id)
    setLoading(null)
  }

  async function handleTemplateToggle(tmpl: TaskTemplateWithCompletion) {
    const id = `tmpl-${tmpl.id}`
    setLoading(id)
    setTemplateTasks(prev => prev.map(t => t.id === tmpl.id ? { ...t, completed: !t.completed } : t))
    if (tmpl.completed) {
      await uncompleteTaskTemplate(tmpl.id)
    } else {
      await completeTaskTemplate(tmpl.id)
    }
    setLoading(null)
  }

  const pending = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done')
  const hasContent = templateTasks.length > 0 || tasks.length > 0

  if (!hasContent) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <CheckSquare className="h-10 w-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">{t('myTasks.noTasks')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Pinned template tasks */}
        {templateTasks.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Pin className="h-3.5 w-3.5" />
              {t('taskTemplates.pinnedHeader')}
            </h2>
            {templateTasks.map(tmpl => {
              const loadKey = `tmpl-${tmpl.id}`
              return (
                <div
                  key={tmpl.id}
                  className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                    tmpl.completed ? 'border-gray-100 opacity-60' : 'border-[#1a5c3a]/20'
                  }`}
                >
                  <button
                    disabled={loading === loadKey}
                    onClick={() => handleTemplateToggle(tmpl)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {tmpl.completed
                      ? <CheckSquare className="h-5 w-5 text-[#1a5c3a]" />
                      : <Square className="h-5 w-5 text-gray-300 hover:text-[#1a5c3a]/60 transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${tmpl.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {tmpl.title}
                    </p>
                    {tmpl.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tmpl.description}</p>
                    )}
                  </div>
                  <Pin className="h-3.5 w-3.5 text-[#1a5c3a]/30 flex-shrink-0 mt-0.5" />
                </div>
              )
            })}
          </div>
        )}

        {/* Assigned tasks – pending */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('myTasks.pendingHeader')} ({pending.length})</h2>
            {pending.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                loading={loading}
                onToggle={handleToggle}
                onClick={() => setSelectedTask(task)}
                formatDue={formatDueDate}
                urgentLabel={t('myTasks.urgent')}
              />
            ))}
          </div>
        )}

        {/* Assigned tasks – done */}
        {done.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('myTasks.doneHeader')} ({done.length})</h2>
            {done.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                loading={loading}
                onToggle={handleToggle}
                onClick={() => setSelectedTask(task)}
                formatDue={formatDueDate}
                urgentLabel={t('myTasks.urgent')}
              />
            ))}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          canDelete={false}
          loadingToggle={loading === selectedTask.id}
          onToggle={() => handleToggle(selectedTask.id)}
          onDelete={() => {}}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  )
}

function TaskRow({ task, loading, onToggle, onClick, formatDue, urgentLabel }: {
  task: TaskWithUsers
  loading: string | null
  onToggle: (id: string) => void
  onClick: () => void
  formatDue: (due: string | null) => { label: string; urgent: boolean } | null
  urgentLabel: string
}) {
  const isDone = task.status === 'done'
  const dueLabel = formatDue(task.due_date)

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 flex items-start gap-3 cursor-pointer hover:border-[#1a5c3a]/30 hover:shadow-sm transition-colors ${
        isDone ? 'border-gray-100 opacity-60' : 'border-gray-100'
      }`}
    >
      <button
        disabled={loading === task.id}
        onClick={e => { e.stopPropagation(); onToggle(task.id) }}
        className="mt-0.5 flex-shrink-0"
      >
        {isDone
          ? <CheckSquare className="h-5 w-5 text-[#1a5c3a]" />
          : <Square className="h-5 w-5 text-gray-300" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {dueLabel && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${
              dueLabel.urgent ? 'text-red-500' : 'text-gray-400'
            }`}>
              <Clock className="h-3 w-3" />
              {dueLabel.label}
            </span>
          )}
          {task.priority === 'high' && !isDone && (
            <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
              <AlertCircle className="h-3 w-3" />
              {urgentLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
