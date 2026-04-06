'use client';

import { useState } from 'react';
import {
  Settings,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Trash2,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  usePomodoroStore,
  DEFAULT_FIREBASE_CONFIG,
  type FirebaseConfig,
} from '@/stores/pomodoro';
import { initFCM } from '@/lib/fcm';

const FIREBASE_FIELDS: { key: keyof FirebaseConfig; label: string; placeholder: string; required: boolean }[] = [
  { key: 'apiKey', label: 'API Key', placeholder: 'AIzaSy...', required: true },
  { key: 'projectId', label: 'Project ID', placeholder: 'my-pomodoro-app', required: true },
  { key: 'vapidKey', label: 'VAPID Key', placeholder: 'BL...', required: true },
  { key: 'serverKey', label: 'Server Key', placeholder: 'AAAAS...', required: false },
  { key: 'authDomain', label: 'Auth Domain', placeholder: 'my-app.firebaseapp.com', required: false },
  { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'my-app.appspot.com', required: false },
  { key: 'messagingSenderId', label: 'Sender ID', placeholder: '123456789', required: false },
  { key: 'appId', label: 'App ID', placeholder: '1:123:web:abc', required: false },
];

function FcmStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'connected':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="h-3 w-3" /> Connected
        </span>
      );
    case 'connecting':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
          <XCircle className="h-3 w-3" /> Error
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground/60">
          <WifiOff className="h-3 w-3" /> Not configured
        </span>
      );
  }
}

export function SettingsSheet() {
  const { settings, updateSettings, resetSettings, firebaseConfig, updateFirebaseConfig, fcmStatus, setFcmStatus } =
    usePomodoroStore();
  const [fcmOpen, setFcmOpen] = useState(false);

  const handleFieldChange = (key: keyof FirebaseConfig, value: string) => {
    updateFirebaseConfig({ [key]: value });
  };

  const handleConnect = async () => {
    setFcmStatus('connecting');
    try {
      await initFCM(firebaseConfig);
      setFcmStatus('connected');
    } catch {
      setFcmStatus('error');
    }
  };

  const handleClearConfig = () => {
    updateFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    setFcmStatus('disconnected');
  };

  const isConfigured =
    !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.vapidKey;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="bg-card border-t border-border text-card-foreground rounded-t-2xl max-h-[85vh] overflow-y-auto scrollbar-none max-w-lg mx-auto left-0 right-0 px-6 pt-4 pb-32"
      >
        <SheetHeader className="text-left pb-0 px-0 flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <SheetTitle className="text-card-foreground text-base">Timer Settings</SheetTitle>
            <SheetDescription className="text-muted-foreground text-xs">
              Customize your Pomodoro experience
            </SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSettings}
            className="h-8 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset to Defaults
          </Button>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Duration Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</h3>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">Focus Duration</Label>
                <span className="text-sm font-mono font-semibold text-pomodoro-work">
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
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">Short Break</Label>
                <span className="text-sm font-mono font-semibold text-pomodoro-short">
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
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">Long Break</Label>
                <span className="text-sm font-mono font-semibold text-pomodoro-long">
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
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">Long Break After</Label>
                <span className="text-sm font-mono font-semibold text-foreground">
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
            </div>
          </div>

          <Separator />

          {/* Auto-start Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Automation</h3>

            <div className="flex items-center justify-between">
              <Label className="text-foreground/80 text-sm">Auto-start Breaks</Label>
              <Switch
                checked={settings.autoStartBreaks}
                onCheckedChange={(v) => updateSettings({ autoStartBreaks: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-foreground/80 text-sm">Auto-start Work</Label>
              <Switch
                checked={settings.autoStartWork}
                onCheckedChange={(v) => updateSettings({ autoStartWork: v })}
              />
            </div>
          </div>

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notifications</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <Label className="text-foreground/80 text-sm">Alarm Sound</Label>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Label className="text-foreground/80 text-sm">Vibration</Label>
              </div>
              <Switch
                checked={settings.vibrationEnabled}
                onCheckedChange={(v) => updateSettings({ vibrationEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.notificationsEnabled ? (
                  <Bell className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label className="text-foreground/80 text-sm">Push Notifications</Label>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(v) => updateSettings({ notificationsEnabled: v })}
              />
            </div>
          </div>

          <Separator />

          {/* Firebase / FCM Configuration */}
          <Collapsible open={fcmOpen} onOpenChange={setFcmOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group py-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {isConfigured ? (
                    <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Push Server (FCM)
                  </h3>
                </div>
                <FcmStatusBadge status={fcmStatus} />
              </div>
              {fcmOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-3 space-y-3">
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                  Enter your Firebase project credentials to enable push notifications that work even when
                  the app is in the background. All values are stored locally on your device.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-pomodoro-long hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Firebase Console
                  </a>
                  <a
                    href="https://github.com/CJ-1981/pomodoro-focus#%EF%B8%8F-background-notifications-fcm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-pomodoro-long hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Setup Guide
                  </a>
                </div>
              </div>

              {FIREBASE_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label className="text-muted-foreground text-[11px]">
                      {field.label}
                    </Label>
                    {field.required && (
                      <span className="text-[9px] text-red-400/70 font-medium">required</span>
                    )}
                  </div>
                  <Input
                    type="password"
                    value={firebaseConfig[field.key]}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-8 bg-muted border-border text-foreground text-xs font-mono placeholder:text-muted-foreground/40 focus:border-ring"
                  />
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={!isConfigured || fcmStatus === 'connecting'}
                  className="h-8 px-3 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground disabled:opacity-40"
                >
                  {fcmStatus === 'connecting' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Connecting
                    </>
                  ) : fcmStatus === 'connected' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Reconnect
                    </>
                  ) : (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Connect
                    </>
                  )}
                </Button>
                {isConfigured && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearConfig}
                    className="h-8 px-3 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
