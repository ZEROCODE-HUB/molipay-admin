import { useState } from "react";
import {
  CHANNEL_LABELS,
  SEGMENT_LABELS,
  type BroadcastChannel,
  type BroadcastDraft,
  type BroadcastSegment,
} from "@/features/system/incidents.types";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input, Label, Select } from "@/shared/ui/form-controls";

const EMPTY_DRAFT: BroadcastDraft = {
  subject: "",
  segment: "all",
  channel: "email",
  message: "",
};

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));

export function BroadcastDialog({
  isSubmitting,
  onClose,
  onSave,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (draft: BroadcastDraft) => void;
}) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof BroadcastDraft>(key: K, value: BroadcastDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const subject = draft.subject.trim();
    const message = draft.message.trim();
    if (!subject || !message) return setError("Completá el asunto y el mensaje.");
    setError(null);
    onSave({ ...draft, subject, message });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      size="lg"
      title="Nuevo mensaje de difusión"
      description="El mensaje queda registrado como pendiente: el envío todavía no está conectado."
      onSubmit={submit}
      submitLabel="Registrar mensaje"
      isSubmitting={isSubmitting}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="broadcast-subject">Asunto</Label>
          <Input
            id="broadcast-subject"
            value={draft.subject}
            maxLength={200}
            onChange={(e) => set("subject", e.target.value)}
            placeholder="Ej: Mantenimiento programado"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="broadcast-segment">Segmento</Label>
            <Select
              id="broadcast-segment"
              value={draft.segment}
              onChange={(e) => set("segment", e.target.value as BroadcastSegment)}
            >
              {options(SEGMENT_LABELS)}
            </Select>
          </div>
          <div>
            <Label htmlFor="broadcast-channel">Medio de envío</Label>
            <Select
              id="broadcast-channel"
              value={draft.channel}
              onChange={(e) => set("channel", e.target.value as BroadcastChannel)}
            >
              {options(CHANNEL_LABELS)}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="broadcast-message">Mensaje</Label>
          <textarea
            id="broadcast-message"
            value={draft.message}
            maxLength={4000}
            onChange={(e) => set("message", e.target.value)}
            rows={4}
            placeholder="Escribí el mensaje de difusión..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </FormDialog>
  );
}
