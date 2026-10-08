@echo off
title Calculadora de Mezclas ACI 211.1
color 0B
echo ========================================================
echo   CALCULADORA DE MEZCLAS DE CONCRETO - METODO ACI 211.1
echo ========================================================
echo.
echo Iniciando servidor local para PC y Celular...
echo.

start "" "http://localhost:3000"
node server.js

pause
