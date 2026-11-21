نفس — پکیج کامل آیکن (موبایل + فاوآیکون + وب)
====================================

نام محصول: نفس
مصرف وب/PWA: فایل‌های web/ در frontend/public کپی و از index.html لینک می‌شوند.

فایل اصلی (مستر):
  00-source-1024x1024.png — نسخه ۱۰۲۴×۱۰۲۴ بدون حاشیه (full-bleed)

۱) آیکن موبایل — پوشه ios/
  - AppIcon-1024x1024.png : آیکن App Store آیفون (بدون شفافیت)
  - apple-touch-icon-180x180.png و بقیه سایزها: برای iPad و نمایش در وب/افزودن به هوم‌اسکرین

۲) آیکن اندروید — پوشه android/
  - mipmap-mdpi تا mipmap-xxxhdpi : سایزهای استاندارد لانچر (۴۸ تا ۱۹۲)
  - adaptive/ : آیکن تطبیقی (Adaptive Icon) برای اندروید ۸ به بالا
      ic_launcher_foreground.png + ic_launcher_background.png + فایل‌های XML
    رنگ پس‌زمینه استخراج‌شده از خود طرح: #09786A

۳) فاوآیکون و نرم‌افزار وبی — پوشه web/
  - favicon.ico : فاوآیکون چندسایزه (۱۶/۳۲/۴۸) برای مرورگر
  - favicon-16x16.png / favicon-32x32.png / favicon-48x48.png
  - apple-touch-icon.png (۱۸۰) : آیفون وقتی سایت را به هوم‌اسکرین اضافه می‌کند
  - android-chrome-192x192.png / android-chrome-512x512.png : برای PWA
  - maskable-icon-512x512.png : آیکن ماسکبل PWA (با حاشیه امن)
  - icon-64/128/256 : برای استفاده داخل خود نرم‌افزار (هدر، منو، پروفایل و...)
  - site.webmanifest : name/short_name = نفس؛ theme/background = #09786A
      در frontend/index.html:
      <link rel="manifest" href="/site.webmanifest">
      <link rel="icon" href="/favicon.ico" sizes="any">
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">

نکته: همه سایزها از روی مستر ۱۰۲۴ ساخته شده‌اند تا در هر اندازه‌ای واضح و شارپ بمانند.
