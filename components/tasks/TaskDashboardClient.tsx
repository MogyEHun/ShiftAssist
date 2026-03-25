'use client'

import { useState } from 'react'
import { Plus, CheckSquare, Square, Trash2, AlertCircle, Clock, Search, ClipboardList, Pin, ToggleLeft, ToggleRight } from 'lucide-react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { toggleTask, deleteTask } from '@/app/actions/tasks'
import {
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  type TaskTemplate,
} from '@/app/actions/task-templates'
import { useTranslation } from '@/components/providers/LanguageProvider'
import { translations } from '@/lib/i18n/translations'
import { TaskCreateModal } from './TaskCreateModal'
import { TaskDetailModal } from './TaskDetailModal'
import type { TaskWithUsers } from '@/app/actions/tasks'

interface Employee {
  id: string
  full_name: string
  position: string | null
}

interface Props {
  initialTasks: TaskWithUsers[]
  employees: Employee[]
  initialTemplates: TaskTemplate[]
}

type Filter = 'all' | 'pending' | 'done'
type Tab = 'tasks' | 'templates'

const RECURRENCE_OPTIONS = ['daily', 'weekdays', 'weekly'] as const

export function TaskDashboardClient({ initialTasks, employees, initialTemplates }: Props) {
  const { t, locale } = useTranslation()
  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState(initialTasks)
  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTemplates)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithUsers | null>(null)

  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [tmplTitle, setTmplTitle] = useState('')
  const [tmplDesc, setTmplDesc] = useState('')
  const [tmplRecurrence, setTmplRecurrence] = useState<'daily' | 'weekdays' | 'weekly'>('daily')
  const [tmplDayOfWeek, setTmplDayOfWeek] = useState(0)
  const [tmplSaving, setTmplSaving] = useState(false)

  function formatDue(due: string | null) {
    if (!due) return null
    const d = parseISO(due)
    if (isToday(d)) return { label: t('tasks.today'), urgent: true }
    if (isTomorrow(d)) return { label: t('tasks.tomorrow'), urgent: false }
    if (isPast(d)) return { label: format(d, 'MMM d.'), urgent: true }
    return { label: format(d, 'MMM d.'), urgent: false }
  }

  async function handleToggle(id: string) {
    setLoadingId(id)
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t
    ))
    await toggleTask(id)
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await deleteTask(id)
  }

  function handleSaved() {
    window.location.reload()
  }

  async function handleTemplateCreate() {
    if (!tmplTitle.trim()) return
    setTmplSaving(true)
    const result = await createTaskTemplate({
      title: tmplTitle.trim(),
      description: tmplDesc.trim() || undefined,
      recurrence: tmplRecurrence,
      day_of_week: tmplRecurrence === 'weekly' ? tmplDayOfWeek : undefined,
    })
    setTmplSaving(false)
    if (!result.error) {
      setShowTemplateForm(false)
      setTmplTitle('')
      setTmplDesc('')
      setTmplRecurrence('daily')
      setTmplDayOfWeek(0)
      window.location.reload()
    }
  }

  async function handleTemplateToggleActive(tmpl: TaskTemplate) {
    setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, is_active: !t.is_active } : t))
    await updateTaskTemplate(tmpl.id, { is_active: !tmpl.is_active })
  }

  async function handleTemplateDelete(id: string) {
    if (!confirm(t('taskTemplates.confirmDelete'))) return
    setTemplates(prev => prev.filter(t => t.id !== id))
    await deleteTaskTemplate(id)
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending' && t.status !== 'pending') return false
    if (filter === 'done' && t.status !== 'done') return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const doneCount = tasks.filter(t => t.status === 'done').length

  const days: string[] = [...translations[locale].taskTemplates.days]

  function recurrenceLabel(tmpl: TaskTemplate) {
    if (tmpl.recurrence === 'daily') return t('taskTemplates.daily')
    if (tmpl.recurrence === 'weekdays') return t('taskTemplates.weekdays')
    if (tmpl.recurrence === 'weekly') return `${t('taskTemplates.weekly')} – ${days[tmpl.day_of_week ?? 0]}`
    return tmpl.recurrence
  }

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab('tasks')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'tasks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          {t('tasks.title')}
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Pin className="h-3.5 w-3.5" />
          {t('taskTemplates.tabLabel')}
          {templates.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'templates' ? 'bg-gray-100 text-gray-600' : 'bg-gray-200/60 text-gray-400'
            }`}>{templates.length}</span>
          )}
        </button>
      </div>

      {/* ── Tasks tab ── */}
      {tab === 'tasks' && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {([
                { key: 'all', label: t('tasks.all'), count: tasks.length },
                { key: 'pending', label: t('tasks.pending'), count: pendingCount },
                { key: 'done', label: t('tasks.complete'), count: doneCount },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === key ? 'bg-gray-100 text-gray-600' : 'bg-gray-200/60 text-gray-400'
                  }`}>{count}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('tasks.searchPlaceholder')}
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none w-44"
                />
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-xl hover:bg-[#15472e] transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('tasks.newTask')}
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search ? t('tasks.noResults') : filter === 'done' ? t('tasks.noDone') : t('tasks.noPending')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(task => {
                const isDone = task.status === 'done'
                const due = formatDue(task.due_date)

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors cursor-pointer hover:shadow-sm ${
                      isDone ? 'border-gray-100 opacity-60' : task.priority === 'high' ? 'border-red-200' : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); handleToggle(task.id) }}
                      disabled={loadingId === task.id}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {isDone
                        ? <CheckSquare className="h-5 w-5 text-[#1a5c3a]" />
                        : <Square className="h-5 w-5 text-gray-300 hover:text-gray-400 transition-colors" />
                      }
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                        {task.priority === 'high' && !isDone && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-red-500 font-semibold">
                            <AlertCircle className="h-3 w-3" />{t('tasks.urgent')}
                          </span>
                        )}
                      </p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {due && (
                          <span className={`flex items-center gap-1 text-[11px] font-medium ${
                            due.urgent ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            <Clock className="h-3 w-3" />{due.label}
                          </span>
                        )}
                        {task.assigned_users.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-1.5">
                              {task.assigned_users.slice(0, 4).map(u => (
                                <div
                                  key={u.id}
                                  className="h-5 w-5 rounded-full bg-[#1a5c3a]/10 border border-white flex items-center justify-center text-[9px] font-bold text-[#1a5c3a]"
                                  title={u.full_name}
                                >
                                  {u.full_name.slice(0, 2).toUpperCase()}
                                </div>
                              ))}
                              {task.assigned_users.length > 4 && (
                                <div className="h-5 w-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[9px] font-bold text-gray-500">
                                  +{task.assigned_users.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500">
                              {task.assigned_users.length === 1
                                ? task.assigned_users[0].full_name
                                : `${task.assigned_users.length} ${t('tasks.person')}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-300 italic">{t('tasks.unassigned')}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(task.id) }}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 rounded-lg hover:bg-red-50"
                      title={t('tasks.deleteTitle')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Templates tab ── */}
      {tab === 'templates' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">{t('taskTemplates.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowTemplateForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-xl hover:bg-[#15472e] transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('taskTemplates.newTemplate')}
            </button>
          </div>

          {/* Create form */}
          {showTemplateForm && (
            <div className="bg-white border border-[#1a5c3a]/20 rounded-xl p-4 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('taskTemplates.titleLabel')}</label>
                <input
                  type="text"
                  value={tmplTitle}
                  onChange={e => setTmplTitle(e.target.value)}
                  placeholder={t('taskTemplates.titlePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('taskTemplates.descriptionLabel')}</label>
                <input
                  type="text"
                  value={tmplDesc}
                  onChange={e => setTmplDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('taskTemplates.recurrenceLabel')}</label>
                  <select
                    value={tmplRecurrence}
                    onChange={e => setTmplRecurrence(e.target.value as typeof tmplRecurrence)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none bg-white"
                  >
                    {RECURRENCE_OPTIONS.map(r => (
                      <option key={r} value={r}>
                        {t(`taskTemplates.${r}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </div>
                {tmplRecurrence === 'weekly' && (
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('taskTemplates.dayOfWeek')}</label>
                    <select
                      value={tmplDayOfWeek}
                      onChange={e => setTmplDayOfWeek(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none bg-white"
                    >
                      {days.map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTemplateForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('taskTemplates.cancel')}
                </button>
                <button
                  onClick={handleTemplateCreate}
                  disabled={tmplSaving || !tmplTitle.trim()}
                  className="px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50"
                >
                  {t('taskTemplates.save')}
                </button>
              </div>
            </div>
          )}

          {/* Template list */}
          {templates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Pin className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('taskTemplates.noTemplates')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(tmpl => (
                <div
                  key={tmpl.id}
                  className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${
                    tmpl.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                  }`}
                >
                  <Pin className="h-4 w-4 text-[#1a5c3a]/50 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{tmpl.title}</p>
                    {tmpl.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{tmpl.description}</p>
                    )}
                    <span className="inline-block mt-1.5 text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {recurrenceLabel(tmpl)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleTemplateToggleActive(tmpl)}
                      title={tmpl.is_active ? t('taskTemplates.active') : t('taskTemplates.inactive')}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {tmpl.is_active
                        ? <ToggleRight className="h-5 w-5 text-[#1a5c3a]" />
                        : <ToggleLeft className="h-5 w-5 text-gray-300" />
                      }
                    </button>
                    <button
                      onClick={() => handleTemplateDelete(tmpl.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <TaskCreateModal
          employees={employees}
          onSave={handleSaved}
          onClose={() => setShowModal(false)}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          canDelete={true}
          loadingToggle={loadingId === selectedTask.id}
          onToggle={() => {
            handleToggle(selectedTask.id)
            setSelectedTask(prev => prev ? { ...prev, status: prev.status === 'done' ? 'pending' : 'done' } : null)
          }}
          onDelete={() => handleDelete(selectedTask.id)}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
