'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  const { user, loading, logout, updateProfile } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
  })
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
      })
    }
  }, [user])

  if (loading || !user) {
    return null
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('')
    setIsSaving(true)

    try {
      await updateProfile({
        name: formData.name.trim(),
        email: formData.email.trim(),
        avatar: formData.avatar.trim(),
      })
      setStatus('Profile updated successfully.')
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Failed to update profile'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || '',
    })
    setError('')
    setStatus('')
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-4 py-8">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl dark:text-white">Profile</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Your account details and session controls.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
              {formData.avatar || user.avatar || user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold dark:text-white">{formData.name || user.name}</h2>
              <p className="text-sm text-muted-foreground">{formData.email || user.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 rounded-lg border p-4 dark:border-gray-700 dark:bg-gray-900/40">
            {error && <p className="text-sm text-red-500">{error}</p>}
            {status && <p className="text-sm text-green-500">{status}</p>}

            <div className="grid gap-2">
              <label htmlFor="profile-name" className="text-sm font-medium dark:text-gray-200">
                Name
              </label>
              <Input
                id="profile-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="profile-email" className="text-sm font-medium dark:text-gray-200">
                Email
              </label>
              <Input
                id="profile-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="profile-avatar" className="text-sm font-medium dark:text-gray-200">
                Avatar
              </label>
              <Input
                id="profile-avatar"
                value={formData.avatar}
                onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))}
                placeholder="Emoji or short label"
              />
              <p className="text-xs text-muted-foreground">
                Leave it blank if you want the default initial-based avatar.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>User ID: <span className="font-medium dark:text-white">{user.id}</span></p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
                Reset
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/chat">Back to chat</Link>
            </Button>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
