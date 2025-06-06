"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MessageSettings as MessageSettingsType } from "@/lib/types"

interface MessageSettingsProps {
  settings: MessageSettingsType
  updateSettings: (settings: MessageSettingsType) => void
  onClose?: () => void
}

export function MessageSettings({ settings, updateSettings, onClose }: MessageSettingsProps) {
  const [localSettings, setLocalSettings] = useState<MessageSettingsType>(settings)

  const handleSave = () => {
    updateSettings(localSettings)
    if (onClose) onClose()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Message Settings</CardTitle>
        <CardDescription>Configure your messaging preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-enabled" className="flex flex-col space-y-1">
              <span>Sound Notifications</span>
              <span className="text-sm text-muted-foreground">Play a sound when receiving messages</span>
            </Label>
            <Switch
              id="sound-enabled"
              checked={localSettings.soundEnabled}
              onCheckedChange={(checked: boolean) =>
                setLocalSettings({
                  ...localSettings,
                  soundEnabled: checked,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notifications-enabled" className="flex flex-col space-y-1">
              <span>Browser Notifications</span>
              <span className="text-sm text-muted-foreground">Show notifications when receiving messages</span>
            </Label>
            <Switch
              id="notifications-enabled"
              checked={localSettings.notificationsEnabled}
              onCheckedChange={(checked: boolean) =>
                setLocalSettings({
                  ...localSettings,
                  notificationsEnabled: checked,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification-sound">Notification Sound</Label>
          <Select
            value={localSettings.notificationSound}
            onValueChange={(value) =>
              setLocalSettings({
                ...localSettings,
                notificationSound: value,
              })
            }
          >
            <SelectTrigger id="notification-sound">
              <SelectValue placeholder="Select a sound" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="subtle">Subtle</SelectItem>
              <SelectItem value="cheerful">Cheerful</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vanish-timer">Message Vanish Timer</Label>
            <span className="text-sm">
              {localSettings.vanishTimer === null ? "Never" : `${localSettings.vanishTimer} seconds`}
            </span>
          </div>
          <Slider
            id="vanish-timer"
            min={0}
            max={300}
            step={30}
            value={localSettings.vanishTimer === null ? [0] : [localSettings.vanishTimer]}
            onValueChange={(value) =>
              setLocalSettings({
                ...localSettings,
                vanishTimer: value[0] === 0 ? null : value[0],
              })
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Never</span>
            <span>5 min</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </CardFooter>
    </Card>
  )
}

