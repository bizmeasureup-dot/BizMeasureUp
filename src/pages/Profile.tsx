import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Button, Card, Label, Input } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'

function ProfilePage() {
  const { appUser, user, refreshUser } = useAuth()
  const toast = useToastContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    avatar_url: '',
  })

  useEffect(() => {
    if (appUser) {
      setFormData({
        full_name: appUser.full_name || '',
        email: appUser.email || user?.email || '',
        avatar_url: appUser.avatar_url || '',
      })
      setPreviewUrl(appUser.avatar_url || null)
      setLoading(false)
    }
  }, [appUser, user])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      setSelectedFile(null)
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return null

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        // If bucket doesn't exist, try to create it or use public bucket
        if (uploadError.message.includes('Bucket not found')) {
          toast.error('Avatar storage not configured. Please contact administrator.')
          return null
        }
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL')
      }

      return urlData.publicUrl
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error(error.message || 'Failed to upload avatar')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarUpload = async () => {
    if (!selectedFile || !user) return

    const avatarUrl = await uploadAvatar(selectedFile)
    if (avatarUrl) {
      setFormData({ ...formData, avatar_url: avatarUrl })
      setSelectedFile(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      toast.success('Avatar uploaded successfully! Click "Save Changes" to update your profile.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appUser || !user) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name || null,
          avatar_url: formData.avatar_url || null,
        })
        .eq('id', user.id)

      if (error) throw error

      // Update email in auth if changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        })
        if (emailError) throw emailError
      }

      toast.success('Profile updated successfully!')
      await refreshUser()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <CardSkeleton />
  }

  return (
    <div>
      <PageTitle>Profile</PageTitle>

      <Card className="mt-6">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <Label className="mt-4">
              <span>Full Name</span>
              <Input
                className="mt-1"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </Label>

            <Label className="mt-4">
              <span>Email</span>
              <Input
                className="mt-1"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Label>

            <Label className="mt-4">
              <span>Avatar</span>
              <div className="mt-2 flex items-center gap-4">
                {(previewUrl || formData.avatar_url) && (
                  <div className="relative">
                    <img
                      src={previewUrl || formData.avatar_url}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      layout="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Choose Image'}
                    </Button>
                    {selectedFile && (
                      <Button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Upload an image (max 5MB). Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
              </div>
            </Label>

            <Label className="mt-4">
              <span>Avatar URL (or enter URL directly)</span>
              <Input
                className="mt-1"
                value={formData.avatar_url}
                onChange={(e) => {
                  setFormData({ ...formData, avatar_url: e.target.value })
                  setPreviewUrl(e.target.value || null)
                }}
                placeholder="https://example.com/avatar.jpg"
              />
            </Label>

            <div className="mt-6 flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default ProfilePage

