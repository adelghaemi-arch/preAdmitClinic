/*
 File: backend/src/Nabz.Application/Pdf/IntakePdfHtmlBuilder.cs
 Description: HTML خودکفا A4 RTL برای Chromium page.pdf — بدون همکار سازمانی
 Parent Dependencies: IntakePdfDocumentModel, PersianPdfDigits
 */

using System.Net;
using System.Text;

namespace Nabz.Application.Pdf;

public static class IntakePdfHtmlBuilder
{
    public static string Build(IntakePdfDocumentModel model)
    {
        var sb = new StringBuilder(24_000);
        sb.Append("""
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
""");
        if (!string.IsNullOrEmpty(model.FontRegularDataUri))
        {
            sb.Append("@font-face{font-family:Vazirmatn;src:url('")
              .Append(model.FontRegularDataUri)
              .Append("');font-weight:400;font-style:normal;font-display:block}");
        }
        if (!string.IsNullOrEmpty(model.FontBoldDataUri))
        {
            sb.Append("@font-face{font-family:Vazirmatn;src:url('")
              .Append(model.FontBoldDataUri)
              .Append("');font-weight:700;font-style:normal;font-display:block}");
        }
        sb.Append("""
  @page{size:A4;margin:12mm}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Vazirmatn,Tahoma,Arial,sans-serif;color:#1a2e28;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{width:100%;padding:0}
  .topbar{height:4px;background:linear-gradient(90deg,#0f766e 0%,#134e4a 45%,#1e3a5f 100%);border-radius:2px;margin-bottom:16px}
  .header{display:table;width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;padding-bottom:14px;border-bottom:1px solid #d7e5e1;break-inside:avoid}
  .header > div{display:table-cell;vertical-align:middle}
  .brand{width:120px;text-align:center}
  .brand img{max-height:58px;max-width:110px;object-fit:contain;display:inline-block}
  .brand .fallback{display:block;min-height:48px;padding:8px 6px;border:1px solid #d7e5e1;border-radius:10px;background:#f7fbfa;font-size:11px;font-weight:700;color:#0f766e;line-height:1.45}
  .titles{text-align:center;padding:0 10px}
  .titles .clinic{font-size:13px;font-weight:800;color:#0f766e;line-height:1.4}
  .titles h1{margin:6px 0 4px;font-size:18px;font-weight:800;color:#102821;line-height:1.35}
  .titles .sub{font-size:11px;color:#5b736c;line-height:1.4}
  .meta{margin-top:14px;display:table;width:100%;border-collapse:separate;border-spacing:8px 6px;padding:6px;border:1px solid #d7e5e1;border-radius:12px;background:#f8fbfa;break-inside:avoid}
  .meta .row{display:table-row}
  .meta .cell{display:table-cell;width:50%;vertical-align:top;padding:4px 8px}
  .meta .k{font-size:10px;color:#6b8179;font-weight:600;margin-bottom:2px}
  .meta .v{font-size:12px;font-weight:700;color:#1a2e28;word-break:break-word;line-height:1.45}
  .stats{margin-top:12px;text-align:right;break-inside:avoid}
  .chip{display:inline-block;vertical-align:middle;margin:0 0 6px 6px;padding:6px 11px;border-radius:999px;font-size:11px;font-weight:700;line-height:1.35;border:1px solid #d7e5e1;background:#fff;color:#345249}
  .chip.accent{border-color:#99d5c8;background:#ecfdf7;color:#0f766e}
  .chip.warn{border-color:#fecaca;background:#fff1f2;color:#9f1239}
  .block{margin-top:16px;break-inside:avoid-page}
  .sec-head{margin-bottom:8px;break-after:avoid}
  .sec-num{display:inline-block;vertical-align:middle;width:28px;height:28px;border-radius:8px;background:#0f766e;color:#fff;font-size:12px;font-weight:800;line-height:28px;text-align:center}
  .sec-head h3{display:inline-block;vertical-align:middle;margin:0 8px 0 0;font-size:13px;font-weight:800;color:#102821;line-height:28px}
  .sec-flag{display:inline-block;vertical-align:middle;margin-right:8px;font-size:10px;font-weight:700;color:#9f1239;background:#fff1f2;border:1px solid #fecaca;border-radius:999px;padding:3px 8px;line-height:1.3}
  table.qa{width:100%;border-collapse:collapse;border:1px solid #e2ebe7}
  table.qa tr{break-inside:avoid}
  table.qa td{padding:8px 10px;vertical-align:top;font-size:11px;border-bottom:1px solid #eef3f1;line-height:1.55}
  table.qa tr:last-child td{border-bottom:0}
  table.qa tr:nth-child(even) td{background:#fafcfb}
  table.qa tr.flag td{background:#fff5f5}
  table.qa tr.note td{background:#fffbeb}
  td.q{width:58%;color:#2a3f38;font-weight:600}
  td.a{width:42%;color:#102821;font-weight:700}
  .badge{display:inline-block;margin-left:6px;padding:2px 6px;border-radius:6px;font-size:9px;font-weight:800;vertical-align:middle;line-height:1.3}
  .badge.flag{background:#ffe4e6;color:#9f1239}
  .badge.note{background:#fef3c7;color:#92400e}
  .notes{margin-top:4px;font-size:10px;font-weight:600;color:#5b6460}
  .empty{margin-top:24px;padding:16px;border:1px dashed #cbd5d1;border-radius:12px;text-align:center;color:#6b8179;font-size:12px}
  .footer{margin-top:22px;padding-top:12px;border-top:1px solid #d7e5e1;break-inside:avoid}
  .footer .conf{font-size:9px;line-height:1.65;color:#6b8179;display:inline-block;width:72%;vertical-align:top}
  .footer .mark{font-size:10px;font-weight:700;color:#0f766e;display:inline-block;width:26%;text-align:left;vertical-align:top}
</style>
</head>
<body>
  <div class="sheet" id="intake-pdf-root">
    <div class="topbar"></div>
    <header class="header">
""");
        sb.Append(BrandCell(model.HospitalLogoDataUri, model.HospitalLabel));
        sb.Append("""
      <div class="titles">
        <div class="clinic">
""");
        sb.Append(Esc(model.HospitalLabel));
        sb.Append("""
</div>
        <h1>گزارش پرسشنامه پیش‌پذیرش</h1>
        <div class="sub">
""");
        sb.Append(Esc(model.FormTitle));
        sb.Append(" · کد ");
        sb.Append(Esc(PersianPdfDigits.ToFa(model.FormCode)));
        sb.Append("""
</div>
      </div>
""");
        sb.Append(BrandCell(model.PartnerLogoDataUri, model.OrganizationName));
        sb.Append("""
    </header>
    <div class="meta">
      <div class="row">
        <div class="cell"><div class="k">نام و نام‌خانوادگی</div><div class="v">
""");
        sb.Append(Esc(model.FullName));
        sb.Append("""
</div></div>
        <div class="cell"><div class="k">کد ملی</div><div class="v" dir="ltr" style="text-align:right">
""");
        sb.Append(Esc(PersianPdfDigits.ToFa(model.NationalId)));
        sb.Append("""
</div></div>
      </div>
      <div class="row">
        <div class="cell"><div class="k">سن / جنسیت</div><div class="v">
""");
        sb.Append(Esc(model.AgeLabel));
        sb.Append(" · ");
        sb.Append(Esc(model.Gender));
        sb.Append("""
</div></div>
        <div class="cell"><div class="k">سازمان طرف‌قرارداد</div><div class="v">
""");
        sb.Append(Esc(model.OrganizationName));
        sb.Append("""
</div></div>
      </div>
      <div class="row">
        <div class="cell"><div class="k">تاریخ تکمیل</div><div class="v">
""");
        sb.Append(Esc(model.SubmittedLabel));
        sb.Append("""
</div></div>
        <div class="cell"><div class="k">عنوان فرم</div><div class="v">
""");
        sb.Append(Esc(model.FormTitle));
        sb.Append("""
</div></div>
      </div>
    </div>
    <div class="stats">
      <span class="chip accent">
""");
        sb.Append(PersianPdfDigits.ToFa(model.TotalAnswers));
        sb.Append("""
 پاسخ ثبت‌شده</span>
      <span class="chip">
""");
        sb.Append(PersianPdfDigits.ToFa(model.Sections.Count));
        sb.Append("""
 بخش</span>
""");
        if (model.FlagTotal > 0)
        {
            sb.Append("""
      <span class="chip warn">
""");
            sb.Append(PersianPdfDigits.ToFa(model.FlagTotal));
            sb.Append("""
 مورد هشدار بالینی</span>
""");
        }
        else
        {
            sb.Append("""
      <span class="chip">بدون هشدار بالینی</span>
""");
        }
        sb.Append("""
    </div>
""");

        if (model.Sections.Count == 0)
        {
            sb.Append("""
    <div class="empty">پاسخی برای نمایش ثبت نشده است.</div>
""");
        }
        else
        {
            for (var i = 0; i < model.Sections.Count; i++)
            {
                var sec = model.Sections[i];
                sb.Append("""
    <section class="block">
      <div class="sec-head">
        <span class="sec-num">
""");
                sb.Append(PersianPdfDigits.ToFa(i + 1));
                sb.Append("""
</span>
        <h3>
""");
                sb.Append(Esc(sec.Title));
                sb.Append("</h3>");
                if (sec.FlagCount > 0)
                {
                    sb.Append("""
        <span class="sec-flag">
""");
                    sb.Append(PersianPdfDigits.ToFa(sec.FlagCount));
                    sb.Append(" هشدار</span>");
                }
                sb.Append("""
      </div>
      <table class="qa"><tbody>
""");
                foreach (var row in sec.Rows)
                {
                    var cls = row.IsRedFlag ? "flag" : row.HasNotes ? "note" : "";
                    sb.Append("<tr class=\"").Append(cls).Append("\"><td class=\"q\">");
                    if (row.IsRedFlag) sb.Append("""<span class="badge flag">هشدار</span>""");
                    else if (row.HasNotes) sb.Append("""<span class="badge note">توضیح</span>""");
                    sb.Append("<span>").Append(Esc(row.Label)).Append("</span></td><td class=\"a\">");
                    sb.Append(Esc(row.Value));
                    if (!string.IsNullOrWhiteSpace(row.Notes))
                        sb.Append("""<div class="notes">توضیح: """).Append(Esc(row.Notes)).Append("</div>");
                    sb.Append("</td></tr>");
                }
                sb.Append("""
      </tbody></table>
    </section>
""");
            }
        }

        sb.Append("""
    <footer class="footer">
      <div class="conf">
        این سند محرمانه است و صرفاً برای استفاده‌ی بالینی/اداری مجاز صادر شده است.
        هرگونه انتشار بدون مجوز 
""");
        sb.Append(Esc(model.HospitalLabel));
        sb.Append("""
 ممنوع است.
      </div>
      <div class="mark">
""");
        sb.Append(Esc(model.HospitalLabel));
        sb.Append("""
</div>
    </footer>
  </div>
</body>
</html>
""");
        return sb.ToString();
    }

    private static string BrandCell(string? logoDataUri, string label)
    {
        if (!string.IsNullOrWhiteSpace(logoDataUri))
        {
            return $"""
      <div class="brand">
        <img src="{logoDataUri}" alt="{Esc(label)}"/>
      </div>
""";
        }
        return $"""
      <div class="brand"><div class="fallback" style="display:block">{Esc(label)}</div></div>
""";
    }

    private static string Esc(string? s) => WebUtility.HtmlEncode(s ?? "");
}
