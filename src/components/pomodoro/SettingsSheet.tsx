'use client';

import { Settings, Bell, BellOff, Volume2, VolumeX, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { usePomodoroStore } from '@/stores/pomodoro';

export function SettingsSheet() {
  const { settings, updateSettings } = usePomodoroStore();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-white/60 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="bg-[#1a1a35] border-t border-white/10 text-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-white text-lg">Timer Settings</SheetTitle>
          <SheetDescription className="text-white/50">
            Customize your Pomodoro experience
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Duration Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Duration</h3>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-white/70 text-sm">Focus Duration</Label>
                <span className="text-sm font-mono font-bold" style={{ color: '#e74c3c' }}>
                  {settings.workDuration} min
                </span>
              </div>
              <Slider
                value={[settings.workDuration]}
                onValueChange={([v]) => updateSettings({ workDuration: v })}
                min={1}
                max={60}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>1 min</span>
                <span>60 min</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-white/70 text-sm">Short Break</Label>
                <span className="text-sm font-mono font-bold" style={{ color: '#1abc9c' }}>
                  {settings.shortBreakDuration} min
                </span>
              </div>
              <Slider
                value={[settings.shortBreakDuration]}
                onValueChange={([v]) => updateSettings({ shortBreakDuration: v })}
                min={1}
                max={30}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>1 min</span>
                <span>30 min</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-white/70 text-sm">Long Break</Label>
                <span className="text-sm font-mono font-bold" style={{ color: '#3498db' }}>
                  {settings.longBreakDuration} min
                </span>
              </div>
              <Slider
                value={[settings.longBreakDuration]}
                onValueChange={([v]) => updateSettings({ longBreakDuration: v })}
                min={1}
                max={60}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>1 min</span>
                <span>60 min</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-white/70 text-sm">Long Break After</Label>
                <span className="text-sm font-mono font-bold text-white/90">
                  {settings.longBreakInterval} sessions
                </span>
              </div>
              <Slider
                value={[settings.longBreakInterval]}
                onValueChange={([v]) => updateSettings({ longBreakInterval: v })}
                min={2}
                max={6}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>2</span>
                <span>6</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Auto-start Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Automation</h3>

            <div className="flex items-center justify-between">
              <Label className="text-white/70 text-sm">Auto-start Breaks</Label>
              <Switch
                checked={settings.autoStartBreaks}
                onCheckedChange={(v) => updateSettings({ autoStartBreaks: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-white/70 text-sm">Auto-start Work</Label>
              <Switch
                checked={settings.autoStartWork}
                onCheckedChange={(v) => updateSettings({ autoStartWork: v })}
              />
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Notifications</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-white/50" />
                ) : (
                  <VolumeX className="h-4 w-4 text-white/50" />
                )}
                <Label className="text-white/70 text-sm">Alarm Sound</Label>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-white/50" />
                <Label className="text-white/70 text-sm">Vibration</Label>
              </div>
              <Switch
                checked={settings.vibrationEnabled}
                onCheckedChange={(v) => updateSettings({ vibrationEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.notificationsEnabled ? (
                  <Bell className="h-4 w-4 text-white/50" />
                ) : (
                  <BellOff className="h-4 w-4 text-white/50" />
                )}
                <Label className="text-white/70 text-sm">Push Notifications</Label>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(v) => updateSettings({ notificationsEnabled: v })}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
