import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Checklist, ChecklistItem, Task } from '@/types'
import { Button, Card, Label, Input } from '@roketid/windmill-react-ui'
import { hasPermission } from '@/lib/rbac'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import SortableChecklistItem from '@/components/SortableChecklistItem'

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
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemTitle, setEditingItemTitle] = useState('')
  const [isEditingChecklist, setIsEditingChecklist] = useState(false)
  const [checklistTitle, setChecklistTitle] = useState('')
  const [checklistDescription, setChecklistDescription] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
        setChecklistTitle(checklistData.title)
        setChecklistDescription(checklistData.description || '')
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
      setChecklistTitle(data.title)
      setChecklistDescription(data.description || '')
      fetchItems(data.id)
    } catch (error: any) {
      console.error('Error creating checklist:', error)
      toast.error('Failed to create checklist')
    }
  }

  const updateChecklist = async () => {
    if (!checklist) return

    try {
      const { error } = await supabase
        .from('checklists')
        .update({
          title: checklistTitle,
          description: checklistDescription || null,
        })
        .eq('id', checklist.id)

      if (error) throw error
      toast.success('Checklist updated')
      setIsEditingChecklist(false)
      fetchChecklist()
    } catch (error: any) {
      console.error('Error updating checklist:', error)
      toast.error('Failed to update checklist')
    }
  }

  const deleteChecklist = async () => {
    if (!checklist || !window.confirm('Are you sure you want to delete this checklist? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', checklist.id)

      if (error) throw error
      toast.success('Checklist deleted')
      navigate('/checklists')
    } catch (error: any) {
      console.error('Error deleting checklist:', error)
      toast.error('Failed to delete checklist')
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!checklist || !window.confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      toast.success('Item deleted')
      fetchItems(checklist.id)
    } catch (error: any) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const startEditingItem = (item: ChecklistItem) => {
    setEditingItemId(item.id)
    setEditingItemTitle(item.title)
  }

  const cancelEditingItem = () => {
    setEditingItemId(null)
    setEditingItemTitle('')
  }

  const saveItemEdit = async (itemId: string) => {
    if (!checklist || !editingItemTitle.trim()) return

    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ title: editingItemTitle })
        .eq('id', itemId)

      if (error) throw error
      toast.success('Item updated')
      setEditingItemId(null)
      setEditingItemTitle('')
      fetchItems(checklist.id)
    } catch (error: any) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !checklist) {
      return
    }

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder items array
    const reorderedItems = Array.from(items)
    const [removed] = reorderedItems.splice(oldIndex, 1)
    reorderedItems.splice(newIndex, 0, removed)

    // Update order_index for all affected items
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      order_index: index,
    }))

    try {
      // Update all items in a transaction-like manner
      for (const update of updates) {
        const { error } = await supabase
          .from('checklist_items')
          .update({ order_index: update.order_index })
          .eq('id', update.id)

        if (error) throw error
      }

      // Update local state
      setItems(reorderedItems)
      toast.success('Items reordered')
    } catch (error: any) {
      console.error('Error reordering items:', error)
      toast.error('Failed to reorder items')
      // Refresh items on error
      fetchItems(checklist.id)
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
              <div className="flex justify-between items-start mb-4">
                {isEditingChecklist ? (
                  <div className="flex-1">
                    <Label className="mb-2">
                      <span>Checklist Title</span>
                      <Input
                        className="mt-1"
                        value={checklistTitle}
                        onChange={(e) => setChecklistTitle(e.target.value)}
                      />
                    </Label>
                    <Label className="mt-4">
                      <span>Description</span>
                      <Input
                        className="mt-1"
                        tag="textarea"
                        rows={2}
                        value={checklistDescription}
                        onChange={(e) => setChecklistDescription(e.target.value)}
                      />
                    </Label>
                    <div className="flex gap-2 mt-4">
                      <Button size="small" onClick={updateChecklist}>
                        Save
                      </Button>
                      <Button size="small" layout="outline" onClick={() => {
                        setIsEditingChecklist(false)
                        setChecklistTitle(checklist.title)
                        setChecklistDescription(checklist.description || '')
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold">{checklist.title}</h2>
                      {checklist.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{checklist.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {appUser && hasPermission(appUser.role, 'checklists.edit') && (
                        <Button size="small" layout="outline" onClick={() => setIsEditingChecklist(true)}>
                          Edit
                        </Button>
                      )}
                      {appUser && hasPermission(appUser.role, 'checklists.delete') && (
                        <Button size="small" layout="outline" onClick={deleteChecklist}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
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
                {items.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={items.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((item) => (
                        <SortableChecklistItem
                          key={item.id}
                          item={item}
                          isEditing={editingItemId === item.id}
                          editingTitle={editingItemTitle}
                          onToggle={toggleItem}
                          onEdit={() => startEditingItem(item)}
                          onDelete={deleteItem}
                          onSaveEdit={saveItemEdit}
                          onCancelEdit={cancelEditingItem}
                          onTitleChange={setEditingItemTitle}
                          canEdit={appUser ? hasPermission(appUser.role, 'checklists.edit') : false}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No items yet. Add your first item below.
                  </p>
                )}
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

