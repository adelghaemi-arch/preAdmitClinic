import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function QrCodeVisual({ token, size = 148 }: { token: string; size?: number }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const path = `/patient/?token=${encodeURIComponent(token)}`;
  return (
    <div className="inline-flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-3">
      <QRCodeSVG value={`${origin}${path}`} size={size} level="M" marginSize={4} bgColor="#ffffff" fgColor="#234e40" title="ورود به همراه سلامتجو" />
      <a href={path} target="_blank" rel="noreferrer" dir="ltr" className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider text-teal-700">{token}</a>
    </div>
  );
}
