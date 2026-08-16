import { useState, useRef, useEffect } from "react";
import { MessageCircle, Bot, Send, X, User } from "lucide-react";
import { KB } from "@/data/knowledge-base";
import { KB_NAVIGATION, KB_ROUTES } from "@/data/kb-navigation";

type Message = { role: "user" | "bot"; text: string };

const FULL_KB = [
  ...KB,
  {
    keywords: [
      "navegación",
      "navegar",
      "dónde",
      "dónde está",
      "cómo encuentro",
      "ruta",
      "sección",
      "menú",
      "ubicar",
      "encontrar",
      "mapa del panel",
      "estructura",
    ],
    response: KB_NAVIGATION,
  },
];

const DEFAULT_RESPONSE =
  "Lo siento, no tengo información sobre esa consulta. Puedes contactar al equipo de soporte interno para más ayuda. Las áreas que puedo explicar son: transacciones, impuestos, alertas vs bloqueos, y navegación del panel.";

const SUGGESTED = [
  "¿Qué tipos de impuestos existen?",
  "¿Cuál es la diferencia entre alerta y bloqueo?",
  "¿Cómo navego en el panel?",
  "¿Qué estados tiene una transacción?",
];

function findResponse(input: string): string {
  const lower = input.toLowerCase();
  let best: string | null = null;
  let bestCount = 0;
  for (const entry of FULL_KB) {
    const count = entry.keywords.filter((kw) => lower.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      best = entry.response;
    }
  }
  if (best) return best;

  const routeHit = KB_ROUTES.find(
    (r) =>
      lower.includes(r.title.toLowerCase()) ||
      lower.includes(r.path.toLowerCase()) ||
      r.path.toLowerCase().includes(lower.replace(/[^a-z0-9/]/g, "")),
  );
  if (routeHit) {
    return `Podés encontrarlo en: ${routeHit.title} (${routeHit.path}).`;
  }

  return DEFAULT_RESPONSE;
}

export function AdminChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const addBotMessage = (text: string) => {
    setMessages((prev) => [...prev, { role: "bot", text }]);
    setTyping(false);
  };

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setTyping(true);
    setTimeout(() => addBotMessage(findResponse(trimmed)), 800 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-moli-blue text-white shadow-lg flex items-center justify-center hover:bg-moli-blue-dark transition-all cursor-pointer"
        aria-label="Abrir chat"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-2rem)] max-w-[380px] h-[520px] max-h-[calc(100vh-8rem)] bg-card border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-moli-blue text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <Bot size={20} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Asistente Moli</div>
              <div className="text-[11px] text-white/70">Soporte administrativo</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/10 transition cursor-pointer"
              aria-label="Cerrar chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">
                ¡Hola! Soy el asistente virtual de Moli. Seleccioná una consulta o escribí tu
                pregunta.
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "bot"
                      ? "bg-moli-blue-light text-moli-blue"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.role === "bot" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "bot"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-moli-blue-light text-moli-blue flex items-center justify-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-muted px-4 py-3 rounded-lg">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-muted transition whitespace-nowrap cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu consulta..."
              className="flex-1 h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || typing}
              className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
