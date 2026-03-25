'use client'

import { useState } from 'react'
import { X, CheckSquare, Square, Trash2, AlertCircle, Clock, Users, FileText, Calendar } from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns'
import { hu } from 'date-fns/locale'
import type { TaskWithUsers } from '@/app/actions/tasks'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  task: TaskWithUsers
  canDelete: boolean
  loadingToggle: boolean
  onToggle: () => void
  onDelete: () => void
  onClose: () => void
}

export function TaskDetailModal({ task, canDelete, loadingToggle, onToggle, onDelete, onClose }: Props) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function formatDueLabel(due: string) {
    const d = parseISO(due)
    if (isToday(d)) return { label: t('tasks.today'), urgent: true }
    if (isTomorrow(d)) return { label: t('tasks.tomorrow'), urgent: false }
    if (isPast(d)) return { label: format(d, 'yyyy. MMM d.', { locale: hu }), urgent: true }
    return { label: format(d, 'yyyy. MMM d.', { locale: hu }), urgent: false }
  }
  const isDone = task.status === 'done'
  const due = task.due_date ? formatDueLabel(task.due_date) : null

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {task.priority === 'high' && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertCircle className="h-3 w-3" />{t('tasks.urgent')}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isDone ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {isDone ? t('tasks.complete') : t('tasks.pending')}
              </span>
            </div>
            <h2 className={`text-base font-semibold mt-1.5 ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {task.description && (
            <div className="flex gap-3">
              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {due && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className={`text-sm font-medium ${due.urgent ? 'text-red-500' : 'text-gray-600'}`}>
                {t('tasks.duePrefix')} {due.label}
                {due.urgent && isPast(parseISO(task.due_date!)) && !isToday(parseISO(task.due_date!)) && (
                  <span className="ml-1 text-red-400 text-xs">({t('tasks.expired')})</span>
                )}
              </span>
            </div>
          )}

          {task.assigned_users.length > 0 && (
            <div className="flex gap-3">
              <Users className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1.5">{t('tasks.assignedPeople')}</p>
                <div className="flex flex-wrap gap-2">
                  {task.assigned_users.map(u => (
                    <div key={u.id} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1">
                      <div className="h-5 w-5 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center text-[9px] font-bold text-[#1a5c3a]">
                        {u.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700">{u.full_name}</span>
                      {u.position && <span className="text-[10px] text-gray-400">· {u.position}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400">
              {t('tasks.createdAt')} {format(parseISO(task.created_at), 'yyyy. MMM d. HH:mm', { locale: hu })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-gray-100">
          <button
            onClick={onToggle}
            disabled={loadingToggle}
            className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              isDone
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-[#1a5c3a] text-white hover:bg-[#15472e]'
            }`}
          >
            {isDone
              ? <><Square className="h-4 w-4" />{t('tasks.reopen')}</>
              : <><CheckSquare className="h-4 w-4" />{t('tasks.markDone')}</>
            }
          </button>

          {canDelete && (
            <button
              onClick={handleDelete}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                confirmDelete
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-red-50 text-red-500 hover:bg-red-100'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? t('tasks.confirmDelete') : t('common.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
