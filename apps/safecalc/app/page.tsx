"use client";

import { useState } from "react";

// Codes saisis sur le pavé puis validés par "=". Faciles à changer ici.
const ALERT_CODE = "1112";
const CONFIG_CODE = "9999";

const CONTACT_STORAGE_KEY = "sc_contact";

type Operator = "+" | "−" | "×" | "÷" | null;
type Mode = "idle" | "awaiting-contact";

function compute(a: number, b: number, operator: Operator): number {
  switch (operator) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function formatResult(value: number): string {
  if (Number.isNaN(value)) return "Erreur";
  return String(Math.round(value * 1e10) / 1e10);
}

function sendSilentAlert(contact: string) {
  fetch("/api/alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact }),
  }).catch(() => {});
}

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [mode, setMode] = useState<Mode>("idle");

  function clearAll() {
    setDisplay("0");
    setFirstOperand(null);
    setOperator(null);
    setOverwrite(true);
    setMode("idle");
  }

  function inputDigit(digit: string) {
    setDisplay((prev) => {
      if (overwrite) return digit;
      // En mode normal un "0" en tête est un zéro inutile (ex: calcul "07" -> "7").
      // En mode saisie de contact, "0" en tête est un indicatif valide (ex: "06...") à conserver.
      if (prev === "0" && mode !== "awaiting-contact") return digit;
      return prev + digit;
    });
    setOverwrite(false);
  }

  function inputDecimal() {
    if (overwrite) {
      setDisplay("0.");
      setOverwrite(false);
      return;
    }
    setDisplay((prev) => (prev.includes(".") ? prev : prev + "."));
  }

  function handleOperator(nextOperator: Operator) {
    const inputValue = parseFloat(display);

    if (operator && !overwrite && firstOperand !== null) {
      const result = compute(firstOperand, inputValue, operator);
      setDisplay(formatResult(result));
      setFirstOperand(result);
    } else {
      setFirstOperand(inputValue);
    }

    setOperator(nextOperator);
    setOverwrite(true);
  }

  function handleEquals() {
    const enteredValue = display;
    const inputValue = parseFloat(display);

    let result = inputValue;
    if (operator && firstOperand !== null) {
      result = compute(firstOperand, inputValue, operator);
    }

    setDisplay(formatResult(result));
    setFirstOperand(null);
    setOperator(null);
    setOverwrite(true);

    // Une saisie "isolée" (sans opérateur en attente) peut correspondre à un code.
    if (!operator) {
      if (mode === "awaiting-contact") {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(CONTACT_STORAGE_KEY, enteredValue);
        }
        setMode("idle");
        return;
      }

      if (enteredValue === CONFIG_CODE) {
        setMode("awaiting-contact");
        return;
      }

      if (enteredValue === ALERT_CODE) {
        const contact =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem(CONTACT_STORAGE_KEY)
            : null;
        if (contact) {
          sendSilentAlert(contact);
        }
      }
    }
  }

  function handleBackspace() {
    setDisplay((prev) => {
      if (overwrite || prev.length <= 1 || (prev.length === 2 && prev.startsWith("-"))) {
        return "0";
      }
      return prev.slice(0, -1);
    });
  }

  const buttonBase =
    "rounded-2xl text-2xl font-medium h-16 flex items-center justify-center select-none active:opacity-70";

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-neutral-900 rounded-3xl p-4">
          <div className="text-right text-white text-5xl font-light px-2 py-8 break-all">
            {display}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <button className={`${buttonBase} bg-neutral-700 text-white`} onClick={clearAll}>
              C
            </button>
            <button className={`${buttonBase} bg-neutral-700 text-white`} onClick={handleBackspace}>
              ⌫
            </button>
            <button
              className={`${buttonBase} bg-neutral-700 text-white`}
              onClick={() => handleOperator("÷")}
            >
              ÷
            </button>
            <button
              className={`${buttonBase} bg-orange-500 text-white`}
              onClick={() => handleOperator("×")}
            >
              ×
            </button>

            {["7", "8", "9"].map((d) => (
              <button
                key={d}
                className={`${buttonBase} bg-neutral-800 text-white`}
                onClick={() => inputDigit(d)}
              >
                {d}
              </button>
            ))}
            <button
              className={`${buttonBase} bg-orange-500 text-white`}
              onClick={() => handleOperator("−")}
            >
              −
            </button>

            {["4", "5", "6"].map((d) => (
              <button
                key={d}
                className={`${buttonBase} bg-neutral-800 text-white`}
                onClick={() => inputDigit(d)}
              >
                {d}
              </button>
            ))}
            <button
              className={`${buttonBase} bg-orange-500 text-white`}
              onClick={() => handleOperator("+")}
            >
              +
            </button>

            {["1", "2", "3"].map((d) => (
              <button
                key={d}
                className={`${buttonBase} bg-neutral-800 text-white`}
                onClick={() => inputDigit(d)}
              >
                {d}
              </button>
            ))}
            <button
              className={`${buttonBase} bg-orange-500 text-white row-span-2`}
              onClick={handleEquals}
            >
              =
            </button>

            <button
              className={`${buttonBase} bg-neutral-800 text-white col-span-2`}
              onClick={() => inputDigit("0")}
            >
              0
            </button>
            <button className={`${buttonBase} bg-neutral-800 text-white`} onClick={inputDecimal}>
              .
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
