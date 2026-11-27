# Stage 1: Restore, test-ready compile & publish Clean Architecture .NET 10 API
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

COPY Meridian.sln ./
COPY src/Meridian.Domain/Meridian.Domain.csproj src/Meridian.Domain/
COPY src/Meridian.Api/Meridian.Api.csproj src/Meridian.Api/
RUN dotnet restore src/Meridian.Api/Meridian.Api.csproj

COPY src/Meridian.Domain/ src/Meridian.Domain/
COPY src/Meridian.Api/ src/Meridian.Api/
RUN dotnet publish src/Meridian.Api/Meridian.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Stage 2: Minimal hardened ASP.NET Core 10 runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish ./
USER app

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["dotnet", "Meridian.Api.dll"]
