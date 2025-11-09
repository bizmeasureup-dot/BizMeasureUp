import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Checklist, ChecklistItem, Task } from '@/types'
import { Button, Card, Label, Input } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'

function ChecklistDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { appUser } = useAuth()
  const toast = useToastContext()
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [newItemTitle, setNewItemTitle] = useState('')

  useEffect(() => {
    if (taskId) {
      fetchChecklist()
    }
  }, [taskId])

  const fetchChecklist = async () => {
    try {
      // Fetch task first
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError
      setTask(taskData)

      // Fetch checklist for this task
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklists')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle()

      if (checklistError && checklistError.code !== 'PGRST116') throw checklistError

      if (checklistData) {
        setChecklist(checklistData)
        fetchItems(checklistData.id)
      }
    } catch (error: any) {
      console.error('Error fetching checklist:', error)
      toast.error('Failed to load checklist')
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async (checklistId: string) => {
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklistId)
        .order('order_index', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const toggleItem = async (itemId: string, currentStatus: boolean) => {
    if (!appUser || !checklist) return

    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({
          is_completed: !currentStatus,
          completed_by: !currentStatus ? appUser.id : null,
          completed_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq('id', itemId)

      if (error) throw error
      toast.success('Checklist item updated')
      fetchItems(checklist.id)
      
      // Auto-update task status if all items are completed
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, is_completed: !currentStatus } : item
      )
      const allCompleted = updatedItems.length > 0 && updatedItems.every((item) => item.is_completed)
      if (allCompleted && task) {
        await supabase
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', task.id)
      }
    } catch (error: any) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const addItem = async () => {
    if (!newItemTitle.trim() || !checklist) return

    try {
      const { error } = await supabase
        .from('checklist_items')
        .insert({
          checklist_id: checklist.id,
          title: newItemTitle,
          order_index: items.length,
        })

      if (error) throw error
      toast.success('Item added to checklist')
      setNewItemTitle('')
      fetchItems(checklist.id)
    } catch (error: any) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item')
    }
  }

  const createChecklist = async () => {
    if (!taskId || !appUser) return

    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert({
          task_id: taskId,
          title: task?.title || 'Checklist',
          created_by: appUser.id,
        })
        .select()
        .single()

      if (error) throw error
      toast.success('Checklist created')
      setChecklist(data)
      fetchItems(data.id)
    } catch (error: any) {
      console.error('Error creating checklist:', error)
      toast.error('Failed to create checklist')
    }
  }

  if (loading) {
    return <CardSkeleton />
  }

  const completionPercentage =
    items.length > 0 ? (items.filter((i) => i.is_completed).length / items.length) * 100 : 0

  return (
    <div>
      <PageTitle>{task?.title || 'Checklist'}</PageTitle>

      {!checklist ? (
        <Card className="mt-6">
          <div className="p-6 text-center">
            <p className="mb-4">No checklist found for this task</p>
            <Button onClick={createChecklist}>Create Checklist</Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">{checklist.title}</h2>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{Math.round(completionPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => toggleItem(item.id, item.is_completed)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span
                      className={item.is_completed ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-200'}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add new item"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem()}
                />
                <Button onClick={addItem}>Add</Button>
              </div>
            </div>
          </Card>

          <Button layout="outline" className="mt-4" onClick={() => navigate('/checklists')}>
            Back to Checklists
          </Button>
        </>
      )}
    </div>
  )
}

export default ChecklistDetailPage

