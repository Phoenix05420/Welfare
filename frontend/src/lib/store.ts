import { useEffect, useSyncExternalStore } from "react";
import type { DocKey } from "./data";

type Lang = "en" | "ta";

type ScannedField = {
  key: string;
  label: string;
  value: string;
  confidence?: "high" | "medium" | "low";
};

type ScannedDocument = {
  owner?: string;
  documentType: string;
  documentTypeLabel: string;
  fields: ScannedField[];
  photo?: string; // base64 data URL of extracted face
  preview?: string; // base64 data URL of full document preview
  scannedAt: number;
};

type AppState = {
  user: { name: string; email: string; photo?: string } | null;
  lang: Lang;
  uploadedDocs: Partial<Record<DocKey, { name: string; uploadedAt: number }>>;
  scannedDocuments: Record<string, ScannedDocument>;
  documentPhoto: string | null; // accepted photo for use across forms
  savedSchemes: string[];
  appliedSchemes: string[];
};

const DEFAULT_STATE: AppState = {
  user: null,
  lang: "en",
  uploadedDocs: {},
  scannedDocuments: {},
  documentPhoto: null,
  savedSchemes: [],
  appliedSchemes: [],
};

const STORAGE_KEY = "welfareintel-state-v1";
const listeners = new Set<() => void>();
let state: AppState = DEFAULT_STATE;
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to hydrate application state:", e);
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to persist application state:", e);
  }
}

function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return state;
}
function getServerSnapshot() {
  return DEFAULT_STATE;
}

export function useApp() {
  // Hydrate on first client render
  useEffect(() => {
    if (!hydrated) {
      hydrate();
      listeners.forEach((l) => l());
    }
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const app = {
  login(email: string, name?: string, photo?: string) {
    setState((s) => ({
      ...s,
      user: {
        email,
        name:
          name ||
          email
            .split("@")[0]
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        photo,
      },
    }));
  },
  logout() {
    setState((s) => ({ ...s, user: null }));
  },
  setLang(lang: Lang) {
    setState((s) => ({ ...s, lang }));
  },
  uploadDoc(key: DocKey, name: string) {
    setState((s) => ({
      ...s,
      uploadedDocs: { ...s.uploadedDocs, [key]: { name, uploadedAt: Date.now() } },
    }));
  },
  removeDoc(key: DocKey) {
    setState((s) => {
      const next = { ...s.uploadedDocs };
      delete next[key];
      return { ...s, uploadedDocs: next };
    });
  },
  toggleSaved(id: string) {
    setState((s) => ({
      ...s,
      savedSchemes: s.savedSchemes.includes(id)
        ? s.savedSchemes.filter((x) => x !== id)
        : [...s.savedSchemes, id],
    }));
  },
  apply(id: string) {
    setState((s) =>
      s.appliedSchemes.includes(id) ? s : { ...s, appliedSchemes: [...s.appliedSchemes, id] },
    );
  },
  saveScannedDocument(docKey: string, data: ScannedDocument) {
    setState((s) => ({
      ...s,
      scannedDocuments: { ...s.scannedDocuments, [docKey]: data },
      uploadedDocs: {
        ...s.uploadedDocs,
        ...(isKnownDocKey(docKey)
          ? { [docKey]: { name: `${data.documentTypeLabel} (AI Scanned)`, uploadedAt: Date.now() } }
          : {}),
      },
    }));
  },
  updateScannedField(docKey: string, fieldKey: string, value: string) {
    setState((s) => {
      const doc = s.scannedDocuments[docKey];
      if (!doc) return s;
      return {
        ...s,
        scannedDocuments: {
          ...s.scannedDocuments,
          [docKey]: {
            ...doc,
            fields: doc.fields.map((f) =>
              f.key === fieldKey ? { ...f, value } : f,
            ),
          },
        },
      };
    });
  },
  acceptDocumentPhoto(photo: string) {
    setState((s) => ({ ...s, documentPhoto: photo }));
  },
  rejectDocumentPhoto() {
    setState((s) => ({ ...s, documentPhoto: null }));
  },
  clearScannedDocument(docKey: string) {
    setState((s) => {
      const next = { ...s.scannedDocuments };
      delete next[docKey];
      return { ...s, scannedDocuments: next };
    });
  },
};

function isKnownDocKey(key: string): key is DocKey {
  return [
    "aadhaar", "nativity", "community", "income", "marksheet10",
    "marksheet12", "tc", "bonafide", "emis", "firstGraduate", "bankPassbook",
  ].includes(key);
}

export function t<T extends { en: string; ta: string }>(obj: T, lang: Lang): string {
  return obj[lang];
}
