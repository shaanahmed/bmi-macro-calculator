import React, { useState, useMemo, useRef } from "react";
// @ts-ignore
import { jsPDF } from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityLevel {
  label: string;
  desc: string;
  multiplier: number;
}

interface Goal {
  label: string;
  desc: string;
  delta: number;
  color: string;
}

interface BMICategory {
  label: string;
  color: string;
}

interface Results {
  bmi: number;
  bmiCat: BMICategory;
  bmr: number;
  tdee: number;
  targetCals: number;
  proteinG: number;
  proteinCal: number;
  fatG: number;
  fatCal: number;
  carbG: number;
  carbCal: number;
}

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

interface MacroBarProps {
  label: string;
  grams: number;
  calories: number;
  totalCals: number;
  accent: string;
}

interface SystemIntelProps {
  results: Results;
  goalIdx: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const activityLevels: ActivityLevel[] = [
  { label: "Sedentary", desc: "Little or no exercise", multiplier: 1.2 },
  { label: "Light", desc: "1–3 days/week", multiplier: 1.375 },
  { label: "Moderate", desc: "3–5 days/week", multiplier: 1.55 },
  { label: "Active", desc: "6–7 days/week", multiplier: 1.725 },
  { label: "Very Active", desc: "Hard daily training", multiplier: 1.9 },
];

const goals: Goal[] = [
  { label: "Cut", desc: "−500 cal deficit", delta: -500, color: "#f87171" },
  { label: "Maintain", desc: "TDEE calories", delta: 0, color: "#a3e635" },
  { label: "Bulk", desc: "+500 cal surplus", delta: 500, color: "#60a5fa" },
];

const getBMICategory = (bmi: number): BMICategory => {
  if (bmi < 18.5) return { label: "Underweight", color: "#60a5fa" };
  if (bmi < 25) return { label: "Normal", color: "#a3e635" };
  if (bmi < 30) return { label: "Overweight", color: "#fb923c" };
  return { label: "Obese", color: "#f87171" };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({ label, value, onChange, min, max, unit }: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          color: "#64748b",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.15em",
          textTransform: "uppercase" as const,
          marginBottom: "6px",
        }}
      >
        {label}
        {unit && <span style={{ color: "#334155" }}> / {unit}</span>}
      </label>
      <input
        type="number"
        value={value || ""}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          background: "#0f172a",
          border: `1px solid ${focused ? "#a3e635" : "#1e293b"}`,
          borderRadius: "4px",
          color: "#e2e8f0",
          fontFamily: "'DM Mono', monospace",
          fontSize: "16px",
          padding: "10px 14px",
          outline: "none",
          boxShadow: focused ? "0 0 0 2px #a3e63520" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      />
    </div>
  );
}

function MacroBar({ label, grams, calories, totalCals, accent }: MacroBarProps) {
  const [hovered, setHovered] = useState(false);
  const pct = totalCals > 0 ? Math.min(100, (calories / totalCals) * 100) : 0;

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
        <span
          style={{
            color: accent,
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          {label}
        </span>
        <div style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
          <span style={{ color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: "15px", fontWeight: 700 }}>
            {grams}g
          </span>
          <span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>
            {calories} kcal
          </span>
        </div>
      </div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "#1e2d42" : "#1e293b",
          borderRadius: "3px",
          height: hovered ? "9px" : "6px",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: hovered ? `0 0 14px ${accent}33` : "none",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: hovered ? `linear-gradient(90deg, ${accent}, ${accent}cc)` : accent,
            borderRadius: "3px",
            transition: "width 0.6s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s",
            boxShadow: hovered ? `0 0 16px ${accent}cc, 0 0 4px ${accent}` : `0 0 8px ${accent}55`,
          }}
        />
      </div>
      <div
        style={{
          color: hovered ? `${accent}99` : "#475569",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          marginTop: "3px",
          textAlign: "right" as const,
          transition: "color 0.2s",
        }}
      >
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

function SystemIntel({ results, goalIdx }: SystemIntelProps) {
  const bmiNote =
    results.bmi < 18.5
      ? "Mass deficit detected. Caloric surplus advised."
      : results.bmi < 25
      ? "System efficiency nominal. Maintain current trajectory."
      : results.bmi < 30
      ? "Excess load detected. Recalibration recommended."
      : "High-risk load. Immediate protocol adjustment required.";

  const goalNotes = [
    "Deficit protocol active. Preserve lean mass via protein adherence.",
    "Homeostatic maintenance. Monitor output variance weekly.",
    "Surplus protocol active. Minimise fat accrual via resistance training.",
  ];

  const intelItems = [
    {
      label: "BMI",
      value: `${results.bmi < 18.5 ? "BELOW OPTIMAL (<18.5)" : results.bmi < 25 ? "OPTIMAL [18.5–24.9]" : results.bmi < 30 ? "ABOVE OPTIMAL (25–29.9)" : "CRITICAL (≥30)"} — ${bmiNote}`,
    },
    {
      label: "MACROS",
      value: "Protein: tissue repair & satiety. Carbs: primary fuel substrate. Fats: endocrine regulation.",
    },
    {
      label: "GOAL",
      value: goalNotes[goalIdx],
    },
  ];

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "16px",
        background: "#020c1a",
        border: "1px solid #0f2040",
        borderLeft: "2px solid #1d4ed8",
        borderRadius: "6px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div
          style={{
            width: "5px",
            height: "5px",
            background: "#3b82f6",
            borderRadius: "50%",
            boxShadow: "0 0 8px #3b82f6",
          }}
        />
        <span
          style={{
            color: "#3b82f6",
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
          }}
        >
          System Intel
        </span>
      </div>
      {intelItems.map((item) => (
        <div key={item.label} style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
          <span
            style={{
              color: "#1d4ed8",
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              whiteSpace: "nowrap" as const,
              paddingTop: "1px",
              minWidth: "60px",
            }}
          >
            {item.label}:
          </span>
          <span
            style={{
              color: "#475569",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              lineHeight: 1.5,
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [age, setAge] = useState<number>(28);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);
  const [activityIdx, setActivityIdx] = useState<number>(2);
  const [goalIdx, setGoalIdx] = useState<number>(1);
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [exporting, setExporting] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Convert to metric for calculations
  const weightKg = unit === "imperial" ? weight * 0.453592 : weight;
  const heightCm = unit === "imperial" ? height * 2.54 : height;

  const results = useMemo<Results | null>(() => {
    if (!weightKg || !heightCm || !age) return null;
    const h = heightCm / 100;
    const bmi = weightKg / (h * h);
    const bmiCat = getBMICategory(bmi);
    const bmr =
      gender === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    const tdee = bmr * activityLevels[activityIdx].multiplier;
    const targetCals = Math.round(tdee + goals[goalIdx].delta);
    const proteinG = Math.round(weightKg * 2);
    const proteinCal = proteinG * 4;
    const fatCal = Math.round(targetCals * 0.25);
    const fatG = Math.round(fatCal / 9);
    const carbCal = Math.max(0, targetCals - proteinCal - fatCal);
    const carbG = Math.round(carbCal / 4);
    return { bmi, bmiCat, bmr: Math.round(bmr), tdee: Math.round(tdee), targetCals, proteinG, proteinCal, fatG, fatCal, carbG, carbCal };
  }, [age, gender, weightKg, heightCm, activityIdx, goalIdx]);

  const goal = goals[goalIdx];

  // ─── PDF Export via html2canvas + jsPDF ──────────────────────────────────

  const exportPDF = async (): Promise<void> => {
    if (!resultsRef.current || !results) return;
    setExporting(true);
    try {
      const element = resultsRef.current;
      
      // Force html2canvas to capture the entire scroll height, preventing cutoffs
      const canvas = await html2canvas(element, {
        backgroundColor: "#0a1628",
        scale: 2,
        useCORS: true,
        logging: false,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
        width: element.scrollWidth,
        windowWidth: element.scrollWidth
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;

      // Dark background fill for the entire A4 page
      pdf.setFillColor(2, 8, 23);
      pdf.rect(0, 0, pdfW, pdf.internal.pageSize.getHeight(), "F");

      // Header Text
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(226, 232, 240);
      pdf.text("BODY COMPOSITION SYSTEM", 20, 16);
      pdf.setFontSize(8);
      pdf.setFont("courier", "normal");
      pdf.setTextColor(71, 85, 105);
      pdf.text(`REPORT · ${new Date().toUTCString().toUpperCase()}`, 20, 23);
      pdf.setDrawColor(163, 230, 53);
      pdf.setLineWidth(0.4);
      pdf.line(20, 27, pdfW - 20, 27);

      // Render the captured Results snapshot
      pdf.addImage(imgData, "PNG", 10, 32, pdfW - 20, pdfH - 10);

      // Footer Text
      const footerY = pdf.internal.pageSize.getHeight() - 8;
      pdf.setDrawColor(30, 41, 59);
      pdf.setLineWidth(0.3);
      pdf.line(20, footerY - 3, pdfW - 20, footerY - 3);
      pdf.setFontSize(7);
      pdf.setTextColor(30, 41, 59);
      pdf.text("Mifflin-St Jeor Equation · Estimates only · Consult a professional", 20, footerY);
      pdf.text("Page 1 / 1", pdfW - 20, footerY, { align: "right" });

      pdf.save(`bcs-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
    setExporting(false);
  };

  // ─── Unit toggle with value conversion ───────────────────────────────────

  const toggleUnit = (): void => {
    const isMetric = unit === "metric";
    setUnit(isMetric ? "imperial" : "metric");
    setWeight(isMetric ? Math.round(weight * 2.20462) : Math.round(weight * 0.453592));
    setHeight(isMetric ? Math.round(height / 2.54) : Math.round(height * 2.54));
  };

  const weightUnit = unit === "metric" ? "kg" : "lbs";
  const heightUnit = unit === "metric" ? "cm" : "in";

  // ─── Shared style tokens ──────────────────────────────────────────────────

  const mono: React.CSSProperties = { fontFamily: "'DM Mono', monospace" };
  const card: React.CSSProperties = { background: "#0a1628", border: "1px solid #1e293b", borderRadius: "8px", padding: "28px" };
  const labelStyle: React.CSSProperties = { ...mono, color: "#64748b", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" as const, display: "block", marginBottom: "6px" };
  const sectionDivider: React.CSSProperties = { borderBottom: "1px solid #1e293b", marginBottom: "22px", paddingBottom: "22px" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020817; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        select option { background: #0f172a; color: #e2e8f0; }
        @media (max-width: 700px) {
          .bcs-grid { grid-template-columns: 1fr !important; }
          .bcs-sticky { position: static !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020817", padding: "32px 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: "28px", borderBottom: "1px solid #1e293b", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div style={{ width: "7px", height: "7px", background: "#a3e635", borderRadius: "50%", boxShadow: "0 0 12px #a3e63588" }} />
                <span style={{ ...mono, color: "#334155", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  Body Composition System
                </span>
              </div>
              <h1 style={{ color: "#e2e8f0", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1, fontFamily: "Georgia, serif" }}>
                BMI & Macro <span style={{ color: "#a3e635" }}>Calculator</span>
              </h1>
            </div>

            {/* Unit Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ ...mono, color: "#334155", fontSize: "10px", letterSpacing: "0.1em" }}>UNIT</span>
              <button
                onClick={toggleUnit}
                aria-label="Toggle unit system"
                style={{ position: "relative", width: "52px", height: "26px", background: "#0f172a", border: `1px solid ${unit === "imperial" ? "#a3e635" : "#1e293b"}`, borderRadius: "13px", cursor: "pointer", transition: "border-color 0.2s", padding: 0 }}
              >
                <div style={{ position: "absolute", top: "3px", left: unit === "imperial" ? "27px" : "3px", width: "18px", height: "18px", background: unit === "imperial" ? "#a3e635" : "#334155", borderRadius: "50%", transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), background 0.2s", boxShadow: unit === "imperial" ? "0 0 10px #a3e63588" : "none" }} />
              </button>
              <span style={{ ...mono, color: unit === "imperial" ? "#a3e635" : "#334155", fontSize: "10px", letterSpacing: "0.1em", transition: "color 0.2s", minWidth: "60px" }}>
                {unit === "metric" ? "METRIC" : "IMPERIAL"}
              </span>
            </div>
          </div>

          {/* ── Two-column grid ── */}
          <div className="bcs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

            {/* ── LEFT: Inputs ── */}
            <div style={card}>
              <p style={{ ...mono, color: "#334155", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "22px" }}>
                ⬡ Parameters
              </p>

              {/* Gender */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Gender</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      style={{ flex: 1, padding: "10px", borderRadius: "4px", border: `1px solid ${gender === g ? "#a3e635" : "#1e293b"}`, background: gender === g ? "#a3e63515" : "#0f172a", color: gender === g ? "#a3e635" : "#475569", ...mono, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                    >
                      {g === "male" ? "♂ Male" : "♀ Female"}
                    </button>
                  ))}
                </div>
              </div>

              <InputField label="Age" value={age} onChange={setAge} min={10} max={100} unit="years" />
              <InputField label="Weight" value={weight} onChange={setWeight} min={1} max={1000} unit={weightUnit} />
              <InputField label="Height" value={height} onChange={setHeight} min={1} max={300} unit={heightUnit} />

              {/* Activity */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Activity Level</label>
                <select
                  value={activityIdx}
                  onChange={(e) => setActivityIdx(Number(e.target.value))}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "4px", color: "#e2e8f0", ...mono, fontSize: "13px", padding: "10px 14px", outline: "none", cursor: "pointer", appearance: "none" as const }}
                >
                  {activityLevels.map((a, i) => (
                    <option key={i} value={i}>{a.label} — {a.desc}</option>
                  ))}
                </select>
              </div>

              {/* Goal */}
              <div>
                <label style={labelStyle}>Goal</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {goals.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setGoalIdx(i)}
                      style={{ flex: 1, padding: "10px 6px", borderRadius: "4px", border: `1px solid ${goalIdx === i ? g.color : "#1e293b"}`, background: goalIdx === i ? `${g.color}18` : "#0f172a", color: goalIdx === i ? g.color : "#475569", ...mono, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", lineHeight: 1.4 }}
                    >
                      <div style={{ fontWeight: 700 }}>{g.label}</div>
                      <div style={{ fontSize: "9px", opacity: 0.7 }}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Results ── */}
            <div className="bcs-sticky" style={{ position: "sticky", top: "20px", height: "fit-content" }}>
              {results ? (
                <div ref={resultsRef} style={card}>
                  <p style={{ ...mono, color: "#334155", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "22px" }}>
                    ⬡ Results
                  </p>

                  {/* BMI */}
                  <div style={sectionDivider}>
                    <div style={{ ...mono, color: "#475569", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                      Body Mass Index
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
                      <span style={{ fontSize: "52px", fontWeight: 300, color: "#e2e8f0", letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "Georgia, serif" }}>
                        {results.bmi.toFixed(1)}
                      </span>
                      <div style={{ ...mono, color: results.bmiCat.color, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 8px", borderRadius: "3px", background: `${results.bmiCat.color}15`, border: `1px solid ${results.bmiCat.color}44` }}>
                        {results.bmiCat.label}
                      </div>
                    </div>
                  </div>

                  {/* Calories */}
                  <div style={sectionDivider}>
                    <div style={{ ...mono, color: "#475569", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                      Target Calories / {goal.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontSize: "52px", fontWeight: 300, color: goal.color, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "Georgia, serif", textShadow: `0 0 30px ${goal.color}44` }}>
                        {results.targetCals.toLocaleString()}
                      </span>
                      <span style={{ ...mono, color: "#334155", fontSize: "12px" }}>kcal</span>
                    </div>
                    <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
                      {([["BMR", results.bmr.toLocaleString()], ["TDEE", results.tdee.toLocaleString()], ["MULT", `×${activityLevels[activityIdx].multiplier}`]] as [string, string][]).map(([k, v]) => (
                        <div key={k}>
                          <div style={{ ...mono, color: "#334155", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{k}</div>
                          <div style={{ ...mono, color: "#64748b", fontSize: "13px" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Macros */}
                  <div>
                    <div style={{ ...mono, color: "#475569", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "14px" }}>
                      Daily Macros
                    </div>
                    <MacroBar label="Protein" grams={results.proteinG} calories={results.proteinCal} totalCals={results.targetCals} accent="#f87171" />
                    <MacroBar label="Carbs" grams={results.carbG} calories={results.carbCal} totalCals={results.targetCals} accent="#fbbf24" />
                    <MacroBar label="Fat" grams={results.fatG} calories={results.fatCal} totalCals={results.targetCals} accent="#60a5fa" />

                    {/* Split bar */}
                    <div style={{ marginTop: "12px", padding: "10px 12px", background: "#0f172a", borderRadius: "4px", border: "1px solid #1e293b" }}>
                      <div style={{ ...mono, color: "#334155", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px" }}>
                        Macro Split
                      </div>
                      <div style={{ display: "flex", height: "8px", borderRadius: "3px", overflow: "hidden", gap: "2px" }}>
                        {([{ cal: results.proteinCal, color: "#f87171" }, { cal: results.carbCal, color: "#fbbf24" }, { cal: results.fatCal, color: "#60a5fa" }]).map((m, i) => (
                          <div key={i} style={{ flex: m.cal, background: m.color, transition: "flex 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
                        {([{ l: "P", cal: results.proteinCal, c: "#f87171" }, { l: "C", cal: results.carbCal, c: "#fbbf24" }, { l: "F", cal: results.fatCal, c: "#60a5fa" }]).map((m) => (
                          <span key={m.l} style={{ ...mono, color: m.c, fontSize: "10px" }}>
                            {m.l}: {results.targetCals > 0 ? ((m.cal / results.targetCals) * 100).toFixed(0) : 0}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System Intel */}
                  <SystemIntel results={results} goalIdx={goalIdx} />

                  {/* Export PDF */}
                  <ExportButton exporting={exporting} onClick={exportPDF} />
                </div>
              ) : (
                <div style={{ ...card, textAlign: "center", padding: "48px 28px" }}>
                  <div style={{ color: "#1e293b", fontSize: "48px", marginBottom: "16px" }}>◎</div>
                  <p style={{ ...mono, color: "#334155", fontSize: "12px", letterSpacing: "0.1em" }}>
                    Enter parameters to initialize
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Export Button ───────────────────────────────────────────────────────────

interface ExportButtonProps {
  exporting: boolean;
  onClick: () => void;
}

function ExportButton({ exporting, onClick }: ExportButtonProps) {
  const [hovered, setHovered] = useState(false);
  const mono = "'DM Mono', monospace";

  return (
    <button
      onClick={onClick}
      disabled={exporting}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginTop: "20px",
        width: "100%",
        padding: "12px",
        background: hovered && !exporting ? "#a3e63510" : "transparent",
        border: "1px solid #a3e635",
        borderRadius: "4px",
        color: exporting ? "#475569" : "#a3e635",
        fontFamily: mono,
        fontSize: "11px",
        letterSpacing: "0.15em",
        textTransform: "uppercase" as const,
        cursor: exporting ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: hovered && !exporting ? "0 0 20px #a3e63522" : "none",
      }}
    >
      <span>{exporting ? "⟳" : "↓"}</span>
      <span>{exporting ? "Generating Report..." : "Generate Report / PDF"}</span>
    </button>
  );
}