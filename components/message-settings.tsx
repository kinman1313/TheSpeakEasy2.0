"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings } from "lucide-react"
import { useSettings } from "../providers/settings-provider"

export function MessageSettings() {
  const { settings, updateSettings } = useSettings()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Message settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-lg border-none">
        <DialogHeader>
          <DialogTitle>Message Settings</DialogTitle>
          <DialogDescription>Configure your message preferences and notifications.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vanish-timer" className="col-span-2">
              Messages vanish after
            </Label>
            <Select
              value={settings.vanishTimer?.toString() || "never"}
              onValueChange={(value) =>
                updateSettings({
                  vanishTimer: value === "never" ? null : Number.parseInt(value, 10),
                })
              }
              className="col-span-2"
            >
              <SelectTrigger id="vanish-timer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="300000">5 minutes</SelectItem>
                <SelectItem value="3600000">1 hour</SelectItem>
                <SelectItem value="86400000">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sound-enabled" className="col-span-2">
              Sound effects
            </Label>
            <Switch
              id="sound-enabled"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notifications-enabled" className="col-span-2">
              Push notifications
            </Label>
            <Switch
              id="notifications-enabled"
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => updateSettings({ notificationsEnabled: checked })}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notification-sound" className="col-span-2">
              Notification sound
            </Label>
            <Select
              value={settings.notificationSound}
              onValueChange={(value) => updateSettings({ notificationSound: value })}
              className="col-span-2"
            >
              <SelectTrigger id="notification-sound">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="subtle">Subtle</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

