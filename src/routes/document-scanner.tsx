import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { app, useApp } from "@/lib/store";
import { useUserProfile } from "@/lib/userProfileStore";
import { API_BASE_URL } from "@/lib/api";

export const Route = createFileRoute("/document-scanner")({
  head: () => ({ meta: [{ title: "Document Scanner — WelfareIntel" }] }),
  component: DocumentScannerPage,
});

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ScannedField = {
  key: string;
  label: string;
  value: string;
  confidence?: "high" | "medium" | "low";
};

type ScanResult = {
  success: boolean;
  document_type: string;
  document_type_label: string;
  fields: ScannedField[];
  photo: string | null;
  preview_url?: string | null;
  error?: string;
};

function DocumentPreviewBox({
  src,
  fileName,
  className,
}: {
  src?: string | null;
  fileName?: string;
  className?: string;
}) {
  if (!src && !fileName) return null;

  const isPdfDataUrl = src?.startsWith("data:application/pdf");
  const isPdfFile = fileName?.toLowerCase().endsWith(".pdf");

  if (isPdfDataUrl || (isPdfFile && (!src || !src.startsWith("data:image")))) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-primary/5 p-6 rounded-2xl border border-primary/20 ${className || ""}`}>
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm">
          <span className="text-xl font-bold">PDF</span>
        </div>
        <div className="text-xs font-semibold text-foreground text-center break-all max-w-[200px]">
          📄 {fileName || "Document.pdf"}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src || ""}
      alt={fileName || "Scanned document"}
      className={className || "w-full object-contain"}
    />
  );
}

type ScanStep = "upload" | "scanning" | "results";

/* ------------------------------------------------------------------ */
/*  Global State for Background Scanning                               */
/* ------------------------------------------------------------------ */

type ScannerState = {
  step: ScanStep;
  file: File | null;
  preview: string | null;
  result: ScanResult | null;
  editedFields: ScannedField[];
  photoAccepted: boolean | null;
  error: string | null;
  saved: boolean;
};

const INITIAL_SCANNER_STATE: ScannerState = {
  step: "upload",
  file: null,
  preview: null,
  result: null,
  editedFields: [],
  photoAccepted: null,
  error: null,
  saved: false,
};

let scannerState = { ...INITIAL_SCANNER_STATE };
const scannerListeners = new Set<() => void>();

export const scannerStore = {
  subscribe(listener: () => void) {
    scannerListeners.add(listener);
    return () => scannerListeners.delete(listener);
  },
  getSnapshot() {
    return scannerState;
  },
  update(partial: Partial<ScannerState>) {
    scannerState = { ...scannerState, ...partial };
    scannerListeners.forEach((l) => l());
  },
  reset() {
    scannerState = { ...INITIAL_SCANNER_STATE };
    scannerListeners.forEach((l) => l());
  }
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

import { useSyncExternalStore } from "react";

function DocumentScannerPage() {
  const { lang, user } = useApp();
  const state = useSyncExternalStore(scannerStore.subscribe, scannerStore.getSnapshot);
  const inputRef = useRef<HTMLInputElement>(null);

  const { step, file, preview, result, editedFields, photoAccepted, error, saved } = state;

  /* ---------- file handling ---------- */

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      scannerStore.update({
        file: f,
        error: null,
        saved: false,
        photoAccepted: null,
        preview: e.target?.result as string,
      });
    };
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  /* ---------- scan ---------- */

  const handleScan = async () => {
    if (!file) return;
    scannerStore.update({ step: "scanning", error: null });

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/scan-document`, {
        method: "POST",
        body: form,
      });

      const data: ScanResult = await res.json();

      if (!data.success) {
        scannerStore.update({
          error: data.error || "Scanning failed. Please try again.",
          step: "upload",
        });
        return;
      }

      scannerStore.update({
        result: data,
        editedFields: data.fields.map((f) => ({ ...f })),
        step: "results",
        preview: data.preview_url || preview,
      });
    } catch (err) {
      console.error(err);
      scannerStore.update({
        error: "Could not connect to the scanner service. Make sure the backend is running.",
        step: "upload",
      });
    }
  };

  /* ---------- save ---------- */

  const handleSave = () => {
    if (!result) return;
    const docKey = result.document_type === "other" ? `custom_${Date.now()}` : result.document_type;

    app.saveScannedDocument(docKey, {
      owner: user?.email,
      documentType: result.document_type,
      documentTypeLabel: result.document_type_label,
      fields: editedFields,
      photo: photoAccepted && result.photo ? result.photo : undefined,
      preview: preview || undefined,
      scannedAt: Date.now(),
    });

    if (photoAccepted && result.photo) {
      app.acceptDocumentPhoto(result.photo);
    }

    const profileUpdates: Record<string, string> = {};
    editedFields.forEach((f) => {
      if (f.key === "name") profileUpdates["fullName"] = f.value;
      else if (f.key === "dob") profileUpdates["dateOfBirth"] = f.value;
      else if (f.key === "gender") profileUpdates["gender"] = f.value;
      else if (f.key === "aadhaar_number") profileUpdates["aadhaarNumber"] = f.value;
      else if (f.key === "pan_number") profileUpdates["panNumber"] = f.value;
      else if (f.key === "mobile_number") profileUpdates["mobileNumber"] = f.value;
      else if (f.key === "annual_income") profileUpdates["annualIncome"] = f.value;
      else if (f.key === "certificate_number") profileUpdates["certificateNumber"] = f.value;
      else if (f.key === "smart_card_number") profileUpdates["smartCardNumber"] = f.value;
      else if (f.key === "epic_number") profileUpdates["voterIdNumber"] = f.value;
      else if (f.key === "dl_number") profileUpdates["drivingLicenseNumber"] = f.value;
      else profileUpdates[f.key] = f.value;
    });
    useUserProfile.getState().updateProfile(profileUpdates);

    scannerStore.update({ saved: true });
  };

  /* ---------- reset ---------- */

  const handleReset = () => {
    scannerStore.reset();
  };

  return (
    <AppShell>
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/40 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <ScannerIcon className="h-3.5 w-3.5" />
              {lang === "en" ? "AI Document Scanner" : "AI ஆவண ஸ்கேனர்"}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              {lang === "en" ? "Scan & Auto-Fill" : "ஸ்கேன் & தானியங்கு நிரப்பு"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {lang === "en"
                ? "Upload any document — Aadhaar, PAN, certificates, marksheets — our AI reads it, extracts all fields, and auto-fills your profile. Edit anything before saving."
                : "எந்த ஆவணத்தையும் பதிவேற்றுங்கள் — ஆதார், PAN, சான்றிதழ்கள் — AI படித்து, தானாகவே நிரப்பும்."}
            </p>
          </div>
          {step !== "upload" && (
            <button
              onClick={handleReset}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted transition"
            >
              {lang === "en" ? "↻ Scan New" : "↻ புதிதாக ஸ்கேன்"}
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-2">
          {(["upload", "scanning", "results"] as ScanStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-all duration-300 ${
                  step === s
                    ? "gradient-hero text-primary-foreground shadow-glow scale-110"
                    : i < ["upload", "scanning", "results"].indexOf(step)
                      ? "bg-success text-success-foreground"
                      : "bg-surface-muted text-muted-foreground"
                }`}
              >
                {i < ["upload", "scanning", "results"].indexOf(step) ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  step === s ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s === "upload"
                  ? lang === "en" ? "Upload" : "பதிவேற்று"
                  : s === "scanning"
                    ? lang === "en" ? "Scanning" : "ஸ்கேனிங்"
                    : lang === "en" ? "Results" : "முடிவுகள்"}
              </span>
              {i < 2 && (
                <div
                  className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
                    i < ["upload", "scanning", "results"].indexOf(step)
                      ? "bg-success"
                      : "bg-surface-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive"
          >
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <UploadStep
              key="upload"
              lang={lang}
              preview={preview}
              file={file}
              inputRef={inputRef}
              onFile={handleFile}
              onDrop={handleDrop}
              onScan={handleScan}
            />
          )}
          {step === "scanning" && (
            <ScanningStep key="scanning" lang={lang} preview={preview} />
          )}
          {step === "results" && result && (
            <ResultsStep
              key="results"
              lang={lang}
              result={result}
              preview={preview}
              editedFields={editedFields}
              setEditedFields={(update) => {
                const newFields = typeof update === "function" ? update(editedFields) : update;
                scannerStore.update({ editedFields: newFields });
              }}
              photoAccepted={photoAccepted}
              setPhotoAccepted={(val) => scannerStore.update({ photoAccepted: val })}
              onSave={handleSave}
              saved={saved}
            />
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

/* ================================================================== */
/*  Step 1 — Upload                                                    */
/* ================================================================== */

function UploadStep({
  lang,
  preview,
  file,
  inputRef,
  onFile,
  onDrop,
  onScan,
}: {
  lang: "en" | "ta";
  preview: string | null;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onScan: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            setDragOver(false);
            onDrop(e);
          }}
          onClick={() => inputRef.current?.click()}
          className={`group relative cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : preview
                ? "border-success/40 bg-success/5"
                : "border-border bg-surface-muted/30 hover:border-primary/50 hover:bg-surface-muted/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.currentTarget.value = "";
            }}
          />

          {preview ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative overflow-hidden rounded-2xl shadow-card">
                <DocumentPreviewBox
                  src={preview}
                  fileName={file?.name}
                  className="max-h-72 w-auto object-contain"
                />
                <div className="absolute inset-0 rounded-2xl ring-2 ring-success/30" />
              </div>
              <div className="text-sm font-medium text-success">
                ✓ {file?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {lang === "en"
                  ? "Click or drop to replace"
                  : "மாற்ற கிளிக் செய்யவும்"}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                <UploadIcon className="h-10 w-10" />
              </div>
              <div>
                <div className="font-display text-lg font-semibold">
                  {lang === "en"
                    ? "Drop your document here"
                    : "ஆவணத்தை இங்கே வைக்கவும்"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {lang === "en"
                    ? "or click to browse — JPG, PNG, PDF supported"
                    : "அல்லது உலாவ கிளிக் — JPG, PNG, PDF"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-base font-semibold mb-4">
              {lang === "en" ? "How it works" : "எப்படி வேலை செய்கிறது"}
            </h3>
            <div className="space-y-3">
              {[
                {
                  icon: "📤",
                  en: "Upload any Indian government document",
                  ta: "எந்த இந்திய அரசு ஆவணத்தையும் பதிவேற்றுங்கள்",
                },
                {
                  icon: "🤖",
                  en: "AI identifies the document type & reads all text",
                  ta: "AI ஆவண வகையை அடையாளம் கண்டு எல்லா உரையையும் படிக்கிறது",
                },
                {
                  icon: "✏️",
                  en: "Review, edit, and correct extracted fields",
                  ta: "பிரித்தெடுக்கப்பட்ட புலங்களை மதிப்பாய்வு செய்யுங்கள்",
                },
                {
                  icon: "💾",
                  en: "Save to auto-fill welfare scheme applications",
                  ta: "நலத்திட்ட விண்ணப்பங்களுக்கு தானாக நிரப்ப சேமிக்கவும்",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 p-3"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm">
                    {item.icon}
                  </span>
                  <span className="text-sm">{item[lang]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-base font-semibold mb-3">
              {lang === "en" ? "Supported documents" : "ஆதரிக்கப்படும் ஆவணங்கள்"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                "Aadhaar Card",
                "PAN Card",
                "Community Certificate",
                "Income Certificate",
                "Driving License",
                "Voter ID",
                "Marksheets",
                "Bank Passbook",
                "Any Document",
              ].map((doc) => (
                <span
                  key={doc}
                  className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {doc}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scan button */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onScan}
            className="gradient-hero flex items-center gap-3 rounded-2xl px-10 py-4 text-base font-semibold text-primary-foreground shadow-glow"
          >
            <ScannerIcon className="h-5 w-5" />
            {lang === "en" ? "Scan Document with AI" : "AI மூலம் ஆவணத்தை ஸ்கேன் செய்"}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/*  Step 2 — Scanning Animation                                        */
/* ================================================================== */

function ScanningStep({
  lang,
  preview,
}: {
  lang: "en" | "ta";
  preview: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-8"
    >
      {/* Scanning preview */}
      <div className="relative overflow-hidden rounded-3xl shadow-card">
        {preview && (
          <DocumentPreviewBox
            src={preview}
            className="max-h-96 w-auto object-contain opacity-80"
          />
        )}
        {/* Scanner line */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_var(--color-primary)]"
          initial={{ top: "0%" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 backdrop-blur-[1px]" />
        {/* Corner markers */}
        <div className="absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
      </div>

      {/* Status */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-3 w-3 rounded-full bg-primary"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="font-display text-lg font-semibold">
            {lang === "en" ? "AI is reading your document..." : "AI உங்கள் ஆவணத்தைப் படிக்கிறது..."}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { en: "Detecting document type", ta: "ஆவண வகையை கண்டறிதல்", delay: 0 },
            { en: "Extracting text fields", ta: "உரை புலங்களை பிரித்தெடுத்தல்", delay: 1 },
            { en: "Validating data", ta: "தரவை சரிபார்த்தல்", delay: 2 },
          ].map((item, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: item.delay * 0.8,
              }}
              className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {item[lang]}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Step 3 — Results                                                   */
/* ================================================================== */

function ResultsStep({
  lang,
  result,
  preview,
  editedFields,
  setEditedFields,
  photoAccepted,
  setPhotoAccepted,
  onSave,
  saved,
}: {
  lang: "en" | "ta";
  result: ScanResult;
  preview: string | null;
  editedFields: ScannedField[];
  setEditedFields: React.Dispatch<React.SetStateAction<ScannedField[]>>;
  photoAccepted: boolean | null;
  setPhotoAccepted: (v: boolean | null) => void;
  onSave: () => void;
  saved: boolean;
}) {
  const updateField = (idx: number, value: string) => {
    setEditedFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, value } : f)),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      {/* Document type badge */}
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-hero text-xl text-primary-foreground shadow-glow">
          📄
        </div>
        <div>
          <div className="font-display text-xl font-bold">
            {result.document_type_label}{" "}
            <span className="text-sm font-normal text-success">
              {lang === "en" ? "— Detected" : "— கண்டறியப்பட்டது"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {editedFields.length}{" "}
            {lang === "en" ? "fields extracted" : "புலங்கள் பிரித்தெடுக்கப்பட்டன"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Document preview */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Document image preview */}
          {preview && (
            <div className="glass shadow-card rounded-3xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-sm">
                  🖼️
                </div>
                <span className="text-sm font-semibold">
                  {lang === "en" ? "Document Preview" : "ஆவண முன்னோட்டம்"}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border">
                <DocumentPreviewBox
                  src={preview}
                  className="w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Extracted photo */}
          {result.photo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass shadow-card rounded-3xl p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-sm">
                  👤
                </div>
                <span className="text-sm font-semibold">
                  {lang === "en" ? "Photo Found" : "புகைப்படம் கண்டறியப்பட்டது"}
                </span>
              </div>
              <div className="flex justify-center">
                <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 shadow-card">
                  <img
                    src={result.photo}
                    alt="Extracted face"
                    className="h-32 w-32 object-cover"
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {lang === "en"
                  ? "Use this photo for all forms?"
                  : "இந்த புகைப்படத்தை எல்லா படிவங்களிலும் பயன்படுத்தவா?"}
              </p>
              {photoAccepted === null ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPhotoAccepted(true)}
                    className="flex-1 rounded-xl bg-success/15 px-3 py-2 text-xs font-semibold text-success hover:bg-success/25 transition"
                  >
                    ✓ {lang === "en" ? "Accept" : "ஏற்கவும்"}
                  </button>
                  <button
                    onClick={() => setPhotoAccepted(false)}
                    className="flex-1 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                  >
                    ✕ {lang === "en" ? "Reject" : "நிராகரி"}
                  </button>
                </div>
              ) : (
                <div
                  className={`mt-3 rounded-xl p-2 text-center text-xs font-semibold ${
                    photoAccepted
                      ? "bg-success/15 text-success"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {photoAccepted
                    ? lang === "en" ? "✓ Photo accepted" : "✓ புகைப்படம் ஏற்றுக்கொள்ளப்பட்டது"
                    : lang === "en" ? "Photo will not be used" : "புகைப்படம் பயன்படுத்தப்படாது"}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: Editable fields */}
        <div className="lg:col-span-2">
          <div className="glass shadow-card rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-sm">
                  ✏️
                </div>
                <span className="font-display text-base font-semibold">
                  {lang === "en" ? "Extracted Fields" : "பிரித்தெடுக்கப்பட்ட புலங்கள்"}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {lang === "en" ? "All fields are editable" : "எல்லா புலங்களும் திருத்தக்கூடியவை"}
              </span>
            </div>

            <div className="space-y-3">
              {editedFields.map((field, idx) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group rounded-2xl border border-border bg-surface-muted/30 p-4 transition hover:border-primary/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {field.label}
                    </label>
                    {field.confidence && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          field.confidence === "high"
                            ? "bg-success/15 text-success"
                            : field.confidence === "medium"
                              ? "bg-warning/15 text-warning"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {field.confidence === "high"
                          ? "✓ High"
                          : field.confidence === "medium"
                            ? "~ Medium"
                            : "⚠ Low"}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateField(idx, e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </motion.div>
              ))}
            </div>

            {/* Save button */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSave}
                disabled={saved}
                className={`w-full rounded-2xl px-8 py-3.5 text-base font-semibold shadow-glow transition ${
                  saved
                    ? "bg-success text-success-foreground cursor-default"
                    : "gradient-hero text-primary-foreground"
                }`}
              >
                {saved
                  ? lang === "en"
                    ? "✓ Saved to Profile!"
                    : "✓ சுயவிவரத்தில் சேமிக்கப்பட்டது!"
                  : lang === "en"
                    ? "Save to Profile"
                    : "சுயவிவரத்தில் சேமி"}
              </motion.button>
              {saved && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-success"
                >
                  {lang === "en"
                    ? "Data saved. It will auto-fill when you apply for schemes."
                    : "தரவு சேமிக்கப்பட்டது. திட்டங்களுக்கு விண்ணப்பிக்கும்போது தானாக நிரப்பப்படும்."}
                </motion.p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Icons                                                              */
/* ================================================================== */

function ScannerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function UploadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
