import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/lib/userProfileStore";
import { useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

interface AutoApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  formUrl: string;
}

export function AutoApplyModal({ isOpen, onClose, formUrl }: AutoApplyModalProps) {
  const { lang, user, scannedDocuments } = useApp();
  const { profile, updateProfile } = useUserProfile();

  const getCombinedProfile = () => {
    const combined: Record<string, any> = { ...profile };
    
    // 1. App user (Google login name/email)
    if (user?.name) combined["fullName"] = user.name;
    if (user?.email) combined["emailAddress"] = user.email;
    
    // 2. Scanned Documents
    if (scannedDocuments) {
      Object.values(scannedDocuments).forEach((doc: any) => {
        // Only use docs belonging to this user
        if (doc.owner !== user?.email) return;
        
        doc.fields?.forEach((f: any) => {
          // Map document field keys to our standard keys if they match
          if (f.key === "name" && !combined["fullName"]) combined["fullName"] = f.value;
          if (f.key === "dob" && !combined["dateOfBirth"]) combined["dateOfBirth"] = f.value;
          if (f.key === "gender" && !combined["gender"]) combined["gender"] = f.value;
          if (f.key === "aadhaar_number" && !combined["aadhaarNumber"]) combined["aadhaarNumber"] = f.value;
          if (f.key === "mobile_number" && !combined["mobileNumber"]) combined["mobileNumber"] = f.value;
          // Put all raw keys as a fallback
          combined[f.key] = f.value; 
        });
      });
    }
    return combined;
  };
  
  const [step, setStep] = useState<"analyzing" | "missing_info" | "submitting" | "success" | "error">("analyzing");
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("analyzing");
      analyzeForm();
    }
  }, [isOpen]);

  const analyzeForm = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auto-apply/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formUrl, user_details: getCombinedProfile() }),
      });
      if (!res.ok) throw new Error("Failed to analyze form");
      const data = await res.json();
      setAnalysisData(data);
      
      if (data.missing_keys && data.missing_keys.length > 0) {
        setMissingKeys(data.missing_keys);
        setStep("missing_info");
      } else {
        submitForm(data);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep("error");
    }
  };

  const getFieldForMissingKey = (key: string) => {
    if (!analysisData?.form_fields) return null;
    return analysisData.form_fields.find((f: any) => 
      f.name === key || analysisData.mapping[f.name] === key
    );
  };

  const handleMissingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update local store with new details
    updateProfile(formData);
    
    // Combine old and new profile details for submission
    const completeProfile = { ...getCombinedProfile(), ...formData };
    
    submitForm(analysisData, completeProfile);
  };

  const submitForm = async (analysis: any, completeProfile = getCombinedProfile()) => {
    setStep("submitting");
    try {
      const res = await fetch(`${API_BASE_URL}/api/auto-apply/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          mapping: analysis.mapping,
          user_details: completeProfile,
          form_fields: analysis.form_fields
        }),
      });
      if (!res.ok) throw new Error("Failed to submit form");
      setStep("success");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-strong relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">✕</button>
        
        {step === "analyzing" && (
          <div className="text-center py-8">
            <div className="mb-4 text-4xl animate-bounce">🤖</div>
            <h3 className="text-lg font-semibold">{lang === "en" ? "Analyzing Form..." : "படிவத்தை பகுப்பாய்வு செய்கிறது..."}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {lang === "en" ? "AI is mapping required fields to your profile." : "AI தேவையான புலங்களை உங்கள் சுயவிவரத்துடன் இணைக்கிறது."}
            </p>
          </div>
        )}

        {step === "missing_info" && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-primary">
              {lang === "en" ? "Confirm or Provide Information" : "தகவல்களை உறுதிப்படுத்தவும்"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {lang === "en" ? "Review, select, or enter details below to automatically fill the form." : "படிவத்தை நிரப்ப கீழே உள்ள விவரங்களை சரிபார்க்கவும்."}
            </p>
            <form onSubmit={handleMissingSubmit} className="space-y-4">
              {missingKeys.map(key => {
                const field = getFieldForMissingKey(key);
                const hasOptions = field && field.options && field.options.length > 0;
                
                return (
                  <div key={key} className="space-y-1.5">
                    <label className="block text-xs font-semibold capitalize text-muted-foreground">
                      {field ? field.name : key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    
                    {hasOptions ? (
                      field.type === 4 ? (
                        <div className="space-y-2 py-1">
                          {field.options.map((opt: string) => (
                            <label key={opt} className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                              <input
                                type="checkbox"
                                value={opt}
                                onChange={e => {
                                  const currentVal = formData[key] || "";
                                  const currentList = currentVal ? currentVal.split(", ") : [];
                                  let newList;
                                  if (e.target.checked) {
                                    newList = [...currentList, opt];
                                  } else {
                                    newList = currentList.filter(item => item !== opt);
                                  }
                                  setFormData({...formData, [key]: newList.join(", ")});
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-surface"
                              />
                              <span className="text-foreground">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.options.length <= 3 ? (
                        <div className="flex flex-wrap gap-3 py-1">
                          {field.options.map((opt: string) => (
                            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                              <input
                                required
                                type="radio"
                                name={`radio-${key}`}
                                value={opt}
                                checked={formData[key] === opt}
                                onChange={() => setFormData({...formData, [key]: opt})}
                                className="h-4 w-4 border-gray-300 text-primary focus:ring-primary bg-surface"
                              />
                              <span className="text-foreground">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <select
                          required
                          value={formData[key] || ""}
                          onChange={e => setFormData({...formData, [key]: e.target.value})}
                          className="w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">{lang === "en" ? "Select option..." : "விருப்பத்தைத் தேர்ந்தெடுக்கவும்..."}</option>
                          {field.options.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )
                    ) : (
                      <input 
                        required
                        type={field?.type === 9 ? "date" : "text"}
                        placeholder={field?.type === 9 ? "" : (lang === "en" ? "Enter value..." : "மதிப்பை உள்ளிடவும்...")}
                        onChange={e => setFormData({...formData, [key]: e.target.value})}
                        className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>
                );
              })}
              <button type="submit" className="w-full rounded-xl gradient-hero py-3 font-semibold text-primary-foreground shadow-glow mt-4">
                {lang === "en" ? "Save & Auto-Apply" : "சேமி மற்றும் தானாக விண்ணப்பி"}
              </button>
            </form>
          </div>
        )}

        {step === "submitting" && (
          <div className="text-center py-8">
            <div className="mb-4 text-4xl animate-pulse">⚡</div>
            <h3 className="text-lg font-semibold">{lang === "en" ? "Auto-Applying..." : "தானாக விண்ணப்பிக்கிறது..."}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {lang === "en" ? "Playwright automation is filling and submitting the form securely." : "Playwright தானியங்கி படிவத்தை பாதுகாப்பாக நிரப்புகிறது."}
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-8">
            <div className="mb-4 text-4xl text-green-500">✅</div>
            <h3 className="text-lg font-semibold">{lang === "en" ? "Application Submitted!" : "விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!"}</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              {lang === "en" ? "Your details have been securely passed to the scheme provider." : "உங்கள் விவரங்கள் பாதுகாப்பாக அனுப்பப்பட்டன."}
            </p>
            <button onClick={onClose} className="w-full rounded-xl bg-surface-muted py-3 font-semibold hover:bg-surface-hover">
              {lang === "en" ? "Done" : "முடிந்தது"}
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-8">
            <div className="mb-4 text-4xl text-red-500">❌</div>
            <h3 className="text-lg font-semibold">{lang === "en" ? "Failed to Apply" : "விண்ணப்பிக்க முடியவில்லை"}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {errorMsg}
            </p>
            <button onClick={() => setStep("analyzing")} className="mt-6 text-sm text-primary underline">
              {lang === "en" ? "Try Again" : "மீண்டும் முயற்சிக்கவும்"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
