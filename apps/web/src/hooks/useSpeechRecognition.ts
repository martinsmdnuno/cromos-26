import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Thin wrapper around the Web Speech Recognition API. Continuous mode with
 * interim results — the consumer gets:
 *  - `transcript`: the accumulated *final* text since the last reset
 *  - `interim`: the live in-progress text (changes rapidly while speaking)
 *  - `start()` / `stop()` / `reset()`: controls
 *  - `supported`: false on Firefox and any browser without webkit/standard SR
 *
 * Important: Safari fires `onend` aggressively (after ~5s of silence), so the
 * caller should re-`start()` if they want a single long session. We expose the
 * raw end event via `isListening = false` and let the UI decide.
 *
 * Web Speech API isn't in lib.dom.d.ts standard types yet, so the SR globals
 * are typed loosely (`any`) here — the small surface area we use is stable.
 */

interface UseSRArgs {
  /** BCP-47 lang code, e.g. 'pt-PT' or 'en-US'. */
  lang?: string;
}

interface UseSRReturn {
  isListening: boolean;
  transcript: string;
  interim: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  supported: boolean;
  error: string | null;
}

type SRCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SREvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
}

function getSRCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition({ lang = 'en-US' }: UseSRArgs = {}): UseSRReturn {
  const [supported] = useState(() => getSRCtor() !== null);
  const [isListening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  // Indices of result entries we've already appended to the transcript. Safari
  // iOS, with continuous + interimResults, occasionally fires onresult twice
  // with the same finalised result — once when the result transitions from
  // interim to final, once a moment later. Without this guard each utterance
  // gets typed twice into the textarea ("Mete duas vezes" — exactly the bug
  // a user reported). Cleared on every fresh `start()` so a new session's
  // result indices (which may collide with the previous session's) aren't
  // mistakenly skipped.
  const seenFinalRef = useRef<Set<number>>(new Set());

  // Re-create the recogniser whenever the lang changes — Safari does not let
  // you mutate `.lang` on a running instance reliably.
  useEffect(() => {
    const Ctor = getSRCtor();
    if (!Ctor) return;
    seenFinalRef.current = new Set();
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]!;
        const text = result[0]!.transcript;
        if (result.isFinal) {
          if (!seenFinalRef.current.has(i)) {
            seenFinalRef.current.add(i);
            finalText += text + ' ';
          }
        } else {
          interimText += text;
        }
      }
      if (finalText) setTranscript((prev) => prev + finalText);
      setInterim(interimText);
    };
    r.onerror = (e) => {
      setError(e.error ?? 'unknown');
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
    };
    recRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    setError(null);
    setInterim('');
    seenFinalRef.current.clear();
    const r = recRef.current;
    if (!r) {
      setError('not_supported');
      return;
    }
    try {
      r.start();
      setListening(true);
    } catch {
      // start() throws if called while already running — ignore.
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  return { isListening, transcript, interim, start, stop, reset, supported, error };
}
