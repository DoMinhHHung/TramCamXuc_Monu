@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title TramCamXuc - Docker Manager

echo.
echo ╔══════════════════════════════════════════╗
echo ║     TramCamXuc - Docker Manager          ║
echo ║     Java 17 + Local Infra Mode           ║
echo ╚══════════════════════════════════════════╝
echo.
echo [1] Start toan bo (lan dau / khoi dong lai)
echo [2] Start nhanh (da co image roi)
echo [3] Stop tat ca
echo [4] Restart 1 service
echo [5] Xem logs
echo [6] Xem CPU / RAM realtime
echo [7] Build lai image (sau khi sua code)
echo [8] Xoa toan bo va build lai tu dau
echo [9] Kiem tra ket noi local services
echo [0] Thoat
echo.
set /p choice="Chon: "

if "%choice%"=="1" goto FULL_START
if "%choice%"=="2" goto QUICK_START
if "%choice%"=="3" goto STOP_ALL
if "%choice%"=="4" goto RESTART_ONE
if "%choice%"=="5" goto VIEW_LOGS
if "%choice%"=="6" goto STATS
if "%choice%"=="7" goto BUILD_ONE
if "%choice%"=="8" goto NUKE_ALL
if "%choice%"=="9" goto CHECK_LOCAL
if "%choice%"=="0" goto EOF
goto EOF

:: ════════════════════════════════════════════
:FULL_START
echo.
echo [START] Bat dau khoi dong tung nhom...
echo Lua chon nay start tung service theo thu tu de tranh CPU spike.
echo.

echo [1/4] Khoi dong Discovery Server...
docker compose up -d discovery-server
echo.
echo Cho Eureka ready (45 giay)...
timeout /t 10 /nobreak >nul & echo   - 10s...
timeout /t 10 /nobreak >nul & echo   - 20s...
timeout /t 10 /nobreak >nul & echo   - 30s...
timeout /t 10 /nobreak >nul & echo   - 40s...
timeout /t 5  /nobreak >nul & echo   - 45s... Kiem tra...

:: Kiem tra Eureka healthy
docker compose ps discovery-server | findstr "healthy" >nul
if errorlevel 1 (
    echo   [WAIT] Eureka chua san sang, cho them 20s...
    timeout /t 20 /nobreak >nul
)
echo   [OK] Discovery Server da san sang.
echo.

echo [2/4] Khoi dong Identity + Payment + Music (nhom chinh)...
docker compose up -d identity-service payment-service music-service
echo Cho nhom chinh khoi dong (35 giay)...
timeout /t 35 /nobreak >nul
echo   [OK] Nhom chinh da start xong.
echo.

echo [3/4] Khoi dong Ads + Integration + Transcode...
docker compose up -d ads-service integration-service transcode-service
echo Cho nhom phu (25 giay)...
timeout /t 25 /nobreak >nul
echo.

echo [4/4] Khoi dong API Gateway + Social + Recommendation...
docker compose up -d recommendation-ml
echo Cho ML service (20 giay)...
timeout /t 20 /nobreak >nul
docker compose up -d api-gateway social-service recommendation-service
echo.

echo ════════════════════════════════════════════
echo [DONE] Tat ca service da duoc khoi dong!
echo.
docker compose ps
echo.
echo Xem CPU/RAM realtime? (Y/N)
set /p view_stats="Chon: "
if /i "%view_stats%"=="Y" goto STATS
goto EOF

:: ════════════════════════════════════════════
:QUICK_START
echo.
echo [QUICK] Start tat ca (da co image, khong build lai)...
echo.
docker compose up -d --no-build
echo.
echo [OK] Da gui lenh start. Cho ~2-3 phut de tat ca healthy.
echo.
echo Deo doi trang thai:
docker compose ps
echo.
echo [TIP] Chay lai lenh nay sau 2 phut de kiem tra:
echo        docker compose ps
goto EOF

:: ════════════════════════════════════════════
:STOP_ALL
echo.
echo [STOP] Dang dung tat ca container...
docker compose stop
echo [OK] Tat ca da dung. RAM da duoc giai phong.
goto EOF

:: ════════════════════════════════════════════
:RESTART_ONE
echo.
echo Cac service hien tai:
echo   1. discovery-server      6. integration-service
echo   2. api-gateway           7. transcode-service
echo   3. identity-service      8. social-service
echo   4. music-service         9. recommendation-service
echo   5. payment-service      10. ads-service
echo.
set /p svc="Nhap ten service can restart: "
echo Dang restart %svc%...
docker compose restart %svc%
echo [OK] Da restart %svc%
echo.
docker compose logs --tail=20 %svc%
goto EOF

:: ════════════════════════════════════════════
:VIEW_LOGS
echo.
echo Cac service:
echo   1. discovery-server      6. integration-service
echo   2. api-gateway           7. transcode-service
echo   3. identity-service      8. social-service
echo   4. music-service         9. recommendation-service
echo   5. payment-service      10. ads-service
echo   all. Xem tat ca
echo.
set /p svc="Nhap ten service (hoac 'all'): "
if "%svc%"=="all" (
    docker compose logs --tail=50 --follow
) else (
    docker compose logs --tail=100 --follow %svc%
)
goto EOF

:: ════════════════════════════════════════════
:STATS
echo.
echo [STATS] CPU va RAM realtime (Ctrl+C de thoat)...
echo.
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}"
goto EOF

:: ════════════════════════════════════════════
:BUILD_ONE
echo.
echo Build lai service nao?
echo   1. discovery-server      6. integration-service
echo   2. api-gateway           7. transcode-service
echo   3. identity-service      8. social-service
echo   4. music-service         9. recommendation-service
echo   5. payment-service      10. ads-service
echo   all. Build lai tat ca
echo.
set /p svc="Nhap ten service (hoac 'all'): "
if "%svc%"=="all" (
    echo [BUILD] Build tat ca (mat 5-10 phut)...
    docker compose build
) else (
    echo [BUILD] Build %svc%...
    docker compose build %svc%
    echo [RESTART] Restart %svc%...
    docker compose up -d --no-deps %svc%
)
echo [OK] Done!
goto EOF

:: ════════════════════════════════════════════
:NUKE_ALL
echo.
echo [CANH BAO] Xoa TOAN BO container, image, volume?
echo Phai build lai tu dau (mat 10-15 phut)!
echo.
set /p confirm="Nhap YES de xac nhan: "
if not "%confirm%"=="YES" (
    echo Da huy.
    goto EOF
)
echo [NUKE] Dang xoa...
docker compose down --volumes --rmi local
echo [BUILD] Dang build lai tu dau...
docker compose build --no-cache
echo [OK] Build xong. Chay option 1 de start.
goto EOF

:: ════════════════════════════════════════════
:CHECK_LOCAL
echo.
echo [CHECK] Kiem tra ket noi local services tu Docker...
echo.

echo Kiem tra PostgreSQL (port 5432)...
docker run --rm --add-host=host.docker.internal:host-gateway alpine sh -c "nc -zv host.docker.internal 5432 2>&1" && echo   [OK] PostgreSQL ket noi duoc || echo   [FAIL] PostgreSQL KHONG ket noi duoc

echo Kiem tra Redis (port 6379)...
docker run --rm --add-host=host.docker.internal:host-gateway alpine sh -c "nc -zv host.docker.internal 6379 2>&1" && echo   [OK] Redis ket noi duoc || echo   [FAIL] Redis KHONG ket noi duoc

echo Kiem tra RabbitMQ (port 5672)...
docker run --rm --add-host=host.docker.internal:host-gateway alpine sh -c "nc -zv host.docker.internal 5672 2>&1" && echo   [OK] RabbitMQ ket noi duoc || echo   [FAIL] RabbitMQ KHONG ket noi duoc

echo Kiem tra MinIO (port 9000)...
docker run --rm --add-host=host.docker.internal:host-gateway alpine sh -c "nc -zv host.docker.internal 9000 2>&1" && echo   [OK] MinIO ket noi duoc || echo   [FAIL] MinIO KHONG ket noi duoc
echo.
goto EOF

:EOF
echo.
pause