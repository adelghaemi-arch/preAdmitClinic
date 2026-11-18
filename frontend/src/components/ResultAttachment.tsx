import { Download, FileText } from "lucide-react";

export function ResultAttachment({ url, title, fileName }: { url: string; title: string; fileName?: string | null }) {
  const pdf = url.startsWith("data:application/pdf") || /\.pdf(?:\?|$)/i.test(url);
  if (pdf) return <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2 text-xs text-slate-600"><FileText className="h-5 w-5 shrink-0 text-teal-600" /><span className="truncate">{fileName || title}</span></span><a href={url} download={fileName || "report.pdf"} className="secondary-button"><Download className="h-3.5 w-3.5" />دریافت PDF</a></div></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <a href={url} download={fileName || "diagnostic-image"} title="دریافت تصویر نتیجه" className="block overflow-hidden rounded-lg border border-slate-200 bg-white"><img src={url} alt={title} className="max-h-64 w-full object-contain" /></a>;
}
