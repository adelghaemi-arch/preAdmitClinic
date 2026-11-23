# runtime-only: خروجی publish از sync-deploy.bat + Chromium برای PDF پرسشنامه (UC-ADM-26)
# apt/Chromium قبل از COPY کامل؛ بدون # syntax=docker/dockerfile (Docker Hub روی سرور 403)
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl unzip fonts-liberation \
    libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libdrm2 \
    libgbm1 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libcairo2 \
    libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 \
    && rm -rf /var/lib/apt/lists/*
ENV ASPNETCORE_URLS=http://+:8080
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY publish/.playwright/package /app/.playwright/package
COPY publish/.playwright/node/linux-x64/node /app/.playwright/node/linux-x64/node
COPY install-playwright-chromium.sh /tmp/install-playwright-chromium.sh
RUN sed -i 's/\r$//' /tmp/install-playwright-chromium.sh \
    && chmod +x /tmp/install-playwright-chromium.sh \
    && chmod +x /app/.playwright/node/linux-x64/node \
    && /bin/bash /tmp/install-playwright-chromium.sh \
    && rm -f /tmp/install-playwright-chromium.sh
COPY publish/ .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Nabz.Api.dll"]
