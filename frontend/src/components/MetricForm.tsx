import { useEffect, useState } from "react";
import { Moon, Save, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { saveMetrics } from "@/api/health";
import { getErrorMessage } from "@/api/client";
import type { HealthDay, TodayData } from "@/types";
import Button from "./ui/Button";
import Input from "./ui/Input";

interface MetricFormProps {
  today: TodayData;
  onSaved: (day: HealthDay) => void;
}

export default function MetricForm({ today, onSaved }: MetricFormProps) {
  const [screenTime, setScreenTime] = useState("");
  const [mostUsedApp, setMostUsedApp] = useState("");
  const [sleep, setSleep] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScreenTime(today.screenTimeHours != null ? String(today.screenTimeHours) : "");
    setMostUsedApp(today.mostUsedApp ?? "");
    setSleep(today.sleepHours != null ? String(today.sleepHours) : "");
  }, [today.date, today.screenTimeHours, today.mostUsedApp, today.sleepHours]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload: {
      screenTimeHours?: number;
      mostUsedApp?: string;
      sleepHours?: number;
    } = {};

    if (screenTime.trim()) {
      const value = Number(screenTime);
      if (Number.isNaN(value) || value < 0 || value > 24) {
        setError("Screen time must be between 0 and 24 hours.");
        return;
      }
      payload.screenTimeHours = value;
    }
    if (mostUsedApp.trim()) payload.mostUsedApp = mostUsedApp.trim();
    if (sleep.trim()) {
      const value = Number(sleep);
      if (Number.isNaN(value) || value < 0 || value > 24) {
        setError("Sleep must be between 0 and 24 hours.");
        return;
      }
      payload.sleepHours = value;
    }

    if (Object.keys(payload).length === 0) {
      setError("Add at least one metric before saving.");
      return;
    }

    setSaving(true);
    try {
      const day = await saveMetrics(payload);
      onSaved(day);
      toast.success("Daily stats saved");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save your stats"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Screen time (hours)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={0}
          max={24}
          placeholder="e.g. 4.5"
          value={screenTime}
          onChange={(event) => setScreenTime(event.target.value)}
          leftIcon={<Smartphone className="h-4 w-4" />}
          hint="Read it on your phone: Settings → Digital Wellbeing → Dashboard, then copy today's total here."
        />
        <Input
          label="Sleep (hours)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={0}
          max={24}
          placeholder="e.g. 7.5"
          value={sleep}
          onChange={(event) => setSleep(event.target.value)}
          leftIcon={<Moon className="h-4 w-4" />}
          hint="Hours slept last night — from your clock app's bedtime schedule or sleep tracker, or your own estimate."
        />
        <div className="sm:col-span-2">
          <Input
            label="Most used app"
            placeholder="e.g. Instagram"
            maxLength={60}
            value={mostUsedApp}
            onChange={(event) => setMostUsedApp(event.target.value)}
            hint="Only the app name is stored — no usage history or account data."
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Self-reported. Saved under your private member code, never your email.
        </p>
        <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
          Save check-in
        </Button>
      </div>
    </form>
  );
}
